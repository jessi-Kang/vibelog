/**
 * poster.ts — 발행된 쇼츠의 썸네일(포스터)만 다시 뽑는다.
 *
 * 전체 재생성(대본→음성→녹화→렌더)은 API 비용이 든다 — 영상은 그대로인데
 * 썸네일만 고치면 될 때(추출 시점 수정 등)를 위해, Blob에 올라간 기존
 * mp4를 내려받아 밝은 창(posterAtSec)의 프레임을 추출해 같은 키에 덮어쓴다.
 * 어두운 썸네일을 고치려고 regen을 통째로 다시 돌던 낭비를 없앤다.
 *
 * 사용: npx tsx scripts/poster.ts <repo>[/<date>]  (날짜 생략 = 최신 글)
 * 필요 환경변수: BLOB_READ_WRITE_TOKEN
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { posterAtSec } from "./render";
import { upload } from "./shorts";
import {
  shortsJsonPath,
  timingJsonPath,
  type ShortsScript,
  type ShortsTiming,
} from "./shorts-types";

export async function refreshPosters(repo: string, date: string): Promise<void> {
  const jsonPath = path.join(process.cwd(), shortsJsonPath(repo, date));
  const script: ShortsScript = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  if (!script.media?.ko && !script.media?.en) {
    throw new Error(
      "media URL이 없습니다 — 업로드된 영상이 없어 포스터만 갱신할 수 없습니다",
    );
  }
  const media = { ...script.media };
  for (const lang of ["ko", "en"] as const) {
    const url = script.media?.[lang];
    if (!url) continue;
    const timing: ShortsTiming = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), timingJsonPath(repo, date, lang)),
        "utf8",
      ),
    );
    const res = await fetch(url);
    if (!res.ok) throw new Error(`영상 다운로드 실패(${lang}): ${res.status}`);
    const mp4 = path.join(os.tmpdir(), `poster-${repo}-${date}.${lang}.mp4`);
    fs.writeFileSync(mp4, Buffer.from(await res.arrayBuffer()));

    const at = posterAtSec(script, timing);
    const jpg = mp4.replace(/\.mp4$/, ".jpg");
    execFileSync("ffmpeg", [
      "-v", "error", "-y",
      "-ss", at.toFixed(2),
      "-i", mp4,
      "-frames:v", "1", "-q:v", "3",
      jpg,
    ]);
    const key = lang === "ko" ? `${date}.poster.jpg` : `${date}.en.poster.jpg`;
    const uploaded = await upload(jpg, `shorts/${repo}/${key}`);
    if (!uploaded) {
      throw new Error("BLOB_READ_WRITE_TOKEN 없음 — 포스터를 업로드할 수 없습니다");
    }
    media[lang === "ko" ? "poster" : "posterEn"] = uploaded;
    console.log(`[poster] ${lang} @${at.toFixed(2)}s → ${uploaded}`);
  }
  script.media = media;
  fs.writeFileSync(jsonPath, JSON.stringify(script, null, 2) + "\n");
}

if (process.argv[1]?.endsWith("poster.ts")) {
  const args = process.argv.slice(2).join("/").split("/").filter(Boolean);
  const repo = args[0];
  let date = args[1];
  if (!repo) {
    console.error("사용: npx tsx scripts/poster.ts <repo>[/<date>]");
    process.exit(1);
  }
  if (!date) {
    const dir = path.join(process.cwd(), "content", "shorts", repo);
    const dates = fs.existsSync(dir)
      ? fs
          .readdirSync(dir)
          .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
          .map((f) => f.slice(0, 10))
          .sort()
      : [];
    if (dates.length === 0) {
      console.error(`대본이 없습니다: content/shorts/${repo}/`);
      process.exit(1);
    }
    date = dates[dates.length - 1];
    console.log(`[poster] 날짜 생략 — 최신 대본 사용: ${date}`);
  }
  refreshPosters(repo, date).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
