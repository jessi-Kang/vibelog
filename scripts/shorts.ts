/**
 * shorts.ts — 데브로그 한 편에 대한 쇼츠 전체 단계 오케스트레이터.
 * script → audio(ko/en) → record → render(ko/en) → upload → JSON에 URL 기록.
 *
 * 사용: npx tsx scripts/shorts.ts <repo>[/<date>] [--new-script]
 *   기본은 저장된 대본을 그대로 쓰고 목소리부터 다시 만든다 — 목소리도 같은 문장이면
 *   저장분을 받아 쓰므로, 디자인·자막을 고친 다시 만들기는 모델·TTS 비용이 들지 않는다.
 *   --new-script면 대본부터 새로 쓴다 (밤 실행은 늘 이쪽).
 * 필요 환경변수: ANTHROPIC_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID
 * 선택: BLOB_READ_WRITE_TOKEN (없으면 업로드 생략, mp4는 로컬에만 남음)
 */
import { hideHosts, resolveHomepage } from "./homepage";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { generateArt } from "./art";
import { generateScript } from "./script";
import { generateAudio } from "./audio";
import { blobDel, blobGet, blobPut } from "./blob-cache";
import { record } from "./record";
import { posterAtSec, renderShort } from "./render";
import { makeSmall } from "./small-video";
import {
  segmentsJsonPath,
  shortsDir,
  shortsJsonPath,
  timingJsonPath,
  type ShortsScript,
  type ShortsTiming,
} from "./shorts-types";

export async function upload(file: string, key: string): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  const { put } = await import("@vercel/blob");
  // 스트림을 넘기면 SDK가 일시 오류로 재시도할 때 이미 소진된 스트림을
  // 다시 못 읽고 "Response body ... disturbed or locked"로 죽는다.
  // 파일이 수 MB라 버퍼로 읽어 재시도를 안전하게 한다.
  const { url } = await put(key, fs.readFileSync(file), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    // 재생성이 같은 키를 덮어쓴다 — 기본 캐시(1년)면 시청자가 이전 영상을
    // 계속 본다. 엣지 캐시는 짧게 잡고, 브라우저 캐시는 URL 버전 쿼리로 깬다.
    cacheControlMaxAge: 60,
  });
  return `${url}?v=${Date.now().toString(36)}`;
}

/**
 * 대본 초안 — 새로 쓴 대본은 실행이 끝나야 커밋되므로, 뒤 단계에서 죽으면 대본도 같이
 * 사라졌다. Blob에 먼저 남겨 두고 다음 다시 만들기가 이어 쓴다. 다 끝나면 지운다.
 */
const draftPath = (repo: string, date: string) => `shorts/${repo}/${date}.draft.json`;

async function loadScript(repo: string, date: string): Promise<ShortsScript> {
  const file = path.join(process.cwd(), shortsJsonPath(repo, date));
  const draft = await blobGet(draftPath(repo, date));
  if (draft) {
    // 지난번에 대본까지 쓰고 죽은 실행이 있다 — 그 대본으로 이어 간다
    const script: ShortsScript = JSON.parse(draft.toString("utf8"));
    const committed: ShortsScript | null = fs.existsSync(file)
      ? JSON.parse(fs.readFileSync(file, "utf8"))
      : null;
    fs.writeFileSync(file, JSON.stringify({ ...script, media: committed?.media ?? script.media }, null, 2) + "\n");
    console.log(`[shorts] 끝나지 못한 지난 실행의 대본을 이어 씁니다 — 대본을 새로 쓰지 않습니다`);
    return script;
  }
  if (!fs.existsSync(file)) {
    throw new Error(`저장된 대본이 없습니다: ${shortsJsonPath(repo, date)} — 대본부터 새로 쓰려면 new_script를 켜세요`);
  }
  console.log(`[shorts] 저장된 대본을 그대로 씁니다 — 대본을 새로 쓰지 않습니다`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/**
 * 화면 녹화를 Blob에 두고 다시 쓴다 (10/18). 다시 만들기(regen)는 대본·목소리는 저장된 것을 쓰면서
 * 화면만 그날 사이트를 새로 찍어서, 9월 편을 다시 만들자 10월 글·쇼츠·실행 기록이 화면에 나왔다 —
 * 그 편이 말하는 날의 화면이 아니다. 처음 찍은 녹화를 남겨 두고, 대본이 고른 화면이 같으면 그것을
 * 받아 쓴다. 키는 문장마다 고른 화면(screen·find·shot)이다 — 대본을 새로 써서 화면이 바뀌면 새로 찍는다.
 * 녹화 길이가 모자라면(목소리 틈이 늘어 영상이 길어지면) 새로 찍는다.
 */
function recordingBase(script: ShortsScript, repo: string, date: string, lang: "ko" | "en"): string {
  const stops = script.lines.map((l) => [l.screen ?? "", (lang === "en" ? (l.findEn ?? l.find) : l.find) ?? "", l.shot ?? ""]);
  const key = createHash("sha256").update(JSON.stringify({ lang, steps: script.demo.steps, stops })).digest("hex").slice(0, 16);
  return `shorts/${repo}/${date}.${lang}.rec.${key}`;
}

function recordingFile(repo: string, date: string, lang: "ko" | "en"): string {
  return path.join(process.cwd(), shortsDir(repo), lang === "ko" ? `${date}.webm` : `${date}.en.webm`);
}

async function saveRecording(script: ShortsScript, repo: string, date: string, lang: "ko" | "en", sec: number): Promise<void> {
  const base = recordingBase(script, repo, date, lang);
  const segFile = path.join(process.cwd(), segmentsJsonPath(repo, date, lang));
  await Promise.all([
    blobPut(`${base}.webm`, fs.readFileSync(recordingFile(repo, date, lang))),
    blobPut(`${base}.json`, JSON.stringify({ sec, segments: fs.existsSync(segFile) ? fs.readFileSync(segFile, "utf8") : null })),
  ]);
}

async function restoreRecording(script: ShortsScript, repo: string, date: string, lang: "ko" | "en", need: number): Promise<boolean> {
  const base = recordingBase(script, repo, date, lang);
  const meta = await blobGet(`${base}.json`);
  if (!meta) return false;
  try {
    const { sec, segments } = JSON.parse(meta.toString("utf8")) as { sec: number; segments: string | null };
    if (sec < need) {
      console.log(`[shorts] 저장해 둔 화면 녹화(${lang})가 ${sec}초라 ${need}초에 모자랍니다 — 새로 찍습니다`);
      return false;
    }
    const webm = await blobGet(`${base}.webm`);
    if (!webm) return false;
    fs.mkdirSync(path.dirname(recordingFile(repo, date, lang)), { recursive: true });
    fs.writeFileSync(recordingFile(repo, date, lang), webm);
    if (segments) fs.writeFileSync(path.join(process.cwd(), segmentsJsonPath(repo, date, lang)), segments);
    console.log(`[shorts] 저장해 둔 화면 녹화를 씁니다 (${lang}) — 그날 찍은 화면이 그대로 나갑니다`);
    return true;
  } catch {
    return false;
  }
}

export async function runShorts(
  repo: string,
  date: string,
  { newScript = true }: { newScript?: boolean } = {},
): Promise<void> {
  let script: ShortsScript;
  if (newScript) {
    console.log(`[shorts] ${repo}/${date} 대본 생성`);
    script = await generateScript(repo, date);
    await blobPut(draftPath(repo, date), JSON.stringify(script));
  } else {
    script = await loadScript(repo, date);
  }

  // 생성 그림 — 하나를 크게 보여 줄 문장마다 (10/11, 둥근 평면 · 강조색 한 가지, 투명 배경).
  // 키가 없거나 실패하면 그 문장은 함께 고른 아이콘·모티프로 간다
  await generateArt(repo, date);

  console.log(`[shorts] 내레이션·음악 생성`);
  await generateAudio(repo, date, ["ko", "en"]);

  // live 전 사이트는 대본 JSON에 주소가 없다 — 녹화할 때만 비공개 파일에서 찾는다
  const demoUrl = script.demo.url || (await resolveHomepage(repo));
  if (demoUrl) {
    // 언어별로 따로 녹화 — 사이트를 그 언어 모드로 켜서, 영어 영상에
    // 한국어 화면이 나오지 않게 한다
    for (const lang of ["ko", "en"] as const) {
      const timing: ShortsTiming = JSON.parse(
        fs.readFileSync(
          path.join(process.cwd(), timingJsonPath(repo, date, lang)),
          "utf8",
        ),
      );
      const need = Math.ceil(timing.duration) + 2;
      if (await restoreRecording(script, repo, date, lang, need)) continue;
      console.log(`[shorts] 화면 녹화 (${lang})`);
      await record(repo, date, need, lang);
      await saveRecording(script, repo, date, lang, need);
    }
  } else {
    console.warn("[shorts] demo.url 없음 — 플레이스홀더로 렌더");
  }

  const media: Record<string, string> = {};
  for (const lang of ["ko", "en"] as const) {
    console.log(`[shorts] 렌더 (${lang})`);
    const mp4 = await renderShort(repo, date, lang);
    // 썸네일 = 훅 헤드라인이 다 켜진 순간의 프레임 (CSS 재현 대신 진짜 프레임 —
    // 훅이 언어별로 다르므로 en도 따로 뽑는다).
    // 첫 프레임은 안 된다: 콜드오픈이 있으면 타이핑이 막 시작된 빈 터미널이다.
    {
      const posterKey =
        lang === "ko" ? `${date}.poster.jpg` : `${date}.en.poster.jpg`;
      const poster = mp4.replace(/\.mp4$/, ".poster.jpg");
      try {
        const posterTiming: ShortsTiming = JSON.parse(
          fs.readFileSync(
            path.join(process.cwd(), timingJsonPath(repo, date, lang)),
            "utf8",
          ),
        );
        const posterAt = posterAtSec(script, posterTiming);
        execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", posterAt.toFixed(2), "-i", mp4, "-frames:v", "1", "-q:v", "3", poster]);
        const url = await upload(poster, `shorts/${repo}/${posterKey}`);
        if (url) media[lang === "ko" ? "poster" : "posterEn"] = url;
      } catch (err) {
        console.warn(`[shorts] 포스터 추출·업로드 실패(${lang}) — 썸네일은 CSS 폴백:`, err);
      }
    }
    // 업로드 실패(스토어 설정 등)가 나머지 언어 렌더를 막지 않게 격리 —
    // mp4는 어차피 Actions 아티팩트로도 올라간다
    try {
      const url = await upload(mp4, `shorts/${repo}/${date}.${lang}.mp4`);
      if (url) {
        media[lang] = url;
        console.log(`[shorts] 업로드: ${url}`);
        // 작게 보는 화면(데스크톱 팝업)용 사본 — 실패해도 원본으로 재생된다
        try {
          const small = mp4.replace(/\.mp4$/, ".sm.mp4");
          makeSmall(mp4, small);
          const smUrl = await upload(small, `shorts/${repo}/${date}.${lang}.sm.mp4`);
          if (smUrl) media[`${lang}Sm`] = smUrl;
        } catch (err) {
          console.warn(`[shorts] 작은 사본 실패(${lang}) — 원본만:`, err instanceof Error ? err.message : err);
        }
      } else {
        console.log(`[shorts] BLOB_READ_WRITE_TOKEN 없음 — 로컬 파일만: ${mp4}`);
      }
    } catch (err) {
      console.error(`[shorts] 업로드 실패(${lang}) — 아티팩트로만 제공:`, err);
    }
  }

  // 업로드 URL을 대본 JSON에 기록 (승인 큐·블로그 임베드가 이걸 읽는다)
  if (Object.keys(media).length > 0) {
    const jsonPath = path.join(process.cwd(), shortsJsonPath(repo, date));
    const saved: ShortsScript = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    saved.media = { ...saved.media, ...media };
    fs.writeFileSync(jsonPath, JSON.stringify(saved, null, 2) + "\n");
  }
  await blobDel(draftPath(repo, date));
}

/** 단독 실행(=재생성)일 때만 홈 "지난 실행" 패널에 기록을 남긴다 */
function writeRegenRunLog(repo: string, date: string, newScript: boolean): void {
  fs.writeFileSync(
    path.join(process.cwd(), "content", "run.json"),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        lines: [
          { text: `npx tsx scripts/shorts.ts ${repo}/${date}${newScript ? " --new-script" : ""}`, kind: "cmd" },
          {
            text: `shorts   · ${repo}/${date} 다시 만듦 (ko, en)${newScript ? " — 대본 새로 씀" : " — 대본 그대로"}`,
            textEn: `shorts   · ${repo}/${date} remade (ko, en)${newScript ? " — new script" : " — same script"}`,
          },
          {
            text: "publish  · content 커밋 → vercel 자동 배포",
            textEn: "publish  · commit content → vercel auto-deploy",
          },
        ],
      },
      null,
      2,
    ) + "\n",
  );
}

if (process.argv[1]?.endsWith("shorts.ts")) {
  // 자막 규칙·프레임 디자인처럼 영상 쪽 수정이 잦아서, 이미 발행된 글의
  // 영상을 통째로 다시 만드는 재생성 진입점을 CLI에 둔다.
  // 사용: npx tsx scripts/shorts.ts <repo>[/<date>]  (날짜 생략 = 최신 글)
  const argv = process.argv.slice(2);
  const newScript = argv.includes("--new-script");
  const args = argv.filter((a) => !a.startsWith("--")).join("/").split("/").filter(Boolean);
  const repo = args[0];
  let date = args[1];
  if (!repo) {
    console.error("사용: npx tsx scripts/shorts.ts <repo>[/<date>]");
    process.exit(1);
  }
  if (!date) {
    const dir = path.join(process.cwd(), "content", "devlog", repo);
    const dates = fs.existsSync(dir)
      ? fs
          .readdirSync(dir)
          .filter((f) => f.endsWith(".md"))
          .map((f) => f.slice(0, -3))
          .sort()
      : [];
    if (dates.length === 0) {
      console.error(`글이 없습니다: content/devlog/${repo}/`);
      process.exit(1);
    }
    date = dates[dates.length - 1];
    console.log(`[shorts] 날짜 생략 — 최신 글 사용: ${date}`);
  }
  if (!fs.existsSync(path.join(process.cwd(), "content", "devlog", repo, `${date}.md`))) {
    console.error(`글이 없습니다: content/devlog/${repo}/${date}.md`);
    process.exit(1);
  }
  runShorts(repo, date, { newScript })
    .then(() => writeRegenRunLog(repo, date, newScript))
    .catch((err) => {
      console.error(hideHosts(err));
      process.exit(1);
    });
}
