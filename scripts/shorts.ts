/**
 * shorts.ts — 데브로그 한 편에 대한 쇼츠 전체 단계 오케스트레이터.
 * script → audio(ko/en) → record → render(ko/en) → upload → JSON에 URL 기록.
 *
 * 사용: npx tsx scripts/shorts.ts <repo> <date>
 * 필요 환경변수: ANTHROPIC_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID
 * 선택: BLOB_READ_WRITE_TOKEN (없으면 업로드 생략, mp4는 로컬에만 남음)
 */
import fs from "node:fs";
import path from "node:path";
import { generateScript } from "./script";
import { generateAudio } from "./audio";
import { record } from "./record";
import { renderShort } from "./render";
import {
  shortsJsonPath,
  timingJsonPath,
  type ShortsScript,
  type ShortsTiming,
} from "./shorts-types";

async function upload(file: string, key: string): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  const { put } = await import("@vercel/blob");
  const { url } = await put(key, fs.createReadStream(file), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return url;
}

export async function runShorts(repo: string, date: string): Promise<void> {
  console.log(`[shorts] ${repo}/${date} 대본 생성`);
  const script = await generateScript(repo, date);

  console.log(`[shorts] 내레이션·음악 생성`);
  await generateAudio(repo, date, ["ko", "en"]);

  const timing: ShortsTiming = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), timingJsonPath(repo, date, "ko")), "utf8"),
  );

  if (script.demo.url) {
    console.log(`[shorts] 화면 녹화 (${script.demo.url})`);
    await record(repo, date, Math.ceil(timing.duration) + 2);
    // 첫 스크린샷을 데브로그 "스크린샷" 섹션용으로 공개 경로에 복사
    const shot = path.join(
      process.cwd(),
      "content",
      "shorts",
      repo,
      `${date}.shots`,
      "00.png",
    );
    if (fs.existsSync(shot)) {
      const dest = path.join(
        process.cwd(),
        "public",
        "devlog-shots",
        repo,
        `${date}.png`,
      );
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(shot, dest);
    }
  } else {
    console.warn("[shorts] demo.url 없음 — 플레이스홀더로 렌더");
  }

  const media: Record<string, string> = {};
  for (const lang of ["ko", "en"] as const) {
    console.log(`[shorts] 렌더 (${lang})`);
    const mp4 = await renderShort(repo, date, lang);
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

if (process.argv[1]?.endsWith("shorts.ts")) {
  const [repo, date] = process.argv.slice(2);
  if (!repo || !date) {
    console.error("사용: npx tsx scripts/shorts.ts <repo> <date>");
    process.exit(1);
  }
  runShorts(repo, date).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
