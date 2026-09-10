/**
 * shorts.ts — 데브로그 한 편에 대한 쇼츠 전체 단계 오케스트레이터.
 * script → audio(ko/en) → record → render(ko/en) → upload → JSON에 URL 기록.
 *
 * 사용: npx tsx scripts/shorts.ts <repo> <date>
 * 필요 환경변수: ANTHROPIC_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID
 * 선택: BLOB_READ_WRITE_TOKEN (없으면 업로드 생략, mp4는 로컬에만 남음)
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
// import { generateArt } from "./art"; // 그래픽 보류 — 레퍼런스 확정 시 복원
import { generateScript } from "./script";
import { generateAudio } from "./audio";
import { record } from "./record";
import { narrationOffsetSec, renderShort } from "./render";
import {
  shortsJsonPath,
  timingJsonPath,
  type ShortsScript,
  type ShortsTiming,
} from "./shorts-types";

async function upload(file: string, key: string): Promise<string | null> {
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

export async function runShorts(repo: string, date: string): Promise<void> {
  console.log(`[shorts] ${repo}/${date} 대본 생성`);
  const script = await generateScript(repo, date);

  // 생성 그래픽은 보류 — Jessi가 스타일 레퍼런스를 줄 때까지 쓰지 않는다.
  // 시안 3종(라인·플랫·듀오톤)이 전부 반려됐다. 레퍼런스가 오면 art.ts의
  // STYLE을 그에 맞춰 고정하고 아래 한 줄을 되살린다.
  // await generateArt(repo, date);

  console.log(`[shorts] 내레이션·음악 생성`);
  await generateAudio(repo, date, ["ko", "en"]);

  if (script.demo.url) {
    // 언어별로 따로 녹화 — 사이트를 그 언어 모드로 켜서, 영어 영상에
    // 한국어 화면이 나오지 않게 한다 (Jessi 지시)
    for (const lang of ["ko", "en"] as const) {
      const timing: ShortsTiming = JSON.parse(
        fs.readFileSync(
          path.join(process.cwd(), timingJsonPath(repo, date, lang)),
          "utf8",
        ),
      );
      console.log(`[shorts] 화면 녹화 (${script.demo.url}, ${lang})`);
      await record(repo, date, Math.ceil(timing.duration) + 2, lang);
    }
  } else {
    console.warn("[shorts] demo.url 없음 — 플레이스홀더로 렌더");
  }

  const media: Record<string, string> = {};
  for (const lang of ["ko", "en"] as const) {
    console.log(`[shorts] 렌더 (${lang})`);
    const mp4 = await renderShort(repo, date, lang);
    // 썸네일 = 훅 헤드라인이 다 켜진 순간의 프레임 (CSS 재현 대신 진짜 프레임 —
    // Jessi 지시. 훅이 언어별로 다르므로 en도 따로 뽑는다).
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
        // 훅 완성 순간이되, 장면 페이드 구간은 피한다 — 훅 끝과 다음 장면
        // 시작 간격이 짧은 대본에서 포스터가 어둡게 뽑혔다 (Jessi 지적).
        // 밝은 창 = [훅 다 켜진 뒤, 다음 문장 시작 - 페이드(0.45)와 여유]
        const s0 = posterTiming.sentences[0];
        const s1 = posterTiming.sentences[1];
        const cand = Math.min(
          s0?.end ?? 1.5,
          s1 ? s1.start - 0.5 : Number.POSITIVE_INFINITY,
        );
        const posterAt =
          narrationOffsetSec(script) +
          Math.max(cand, (s0?.start ?? 0) + 0.6);
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
}

/** 단독 실행(=재생성)일 때만 홈 "지난 실행" 패널에 기록을 남긴다 */
function writeRegenRunLog(repo: string, date: string): void {
  fs.writeFileSync(
    path.join(process.cwd(), "content", "run.json"),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        lines: [
          { text: `npx tsx scripts/shorts.ts ${repo}/${date}`, kind: "cmd" },
          {
            text: `shorts   · ${repo}/${date} 다시 만듦 (ko, en)`,
            textEn: `shorts   · ${repo}/${date} remade (ko, en)`,
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
  const args = process.argv.slice(2).join("/").split("/").filter(Boolean);
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
  runShorts(repo, date)
    .then(() => writeRegenRunLog(repo, date))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
