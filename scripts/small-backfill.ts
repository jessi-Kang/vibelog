/**
 * small-backfill.ts — 이미 올라간 쇼츠에 작은 사본(540×960)을 붙인다 (scripts/small-video.ts).
 *
 * Blob의 원본 mp4를 내려받아 곱게 줄인 사본을 올리고 대본 JSON의 media에 koSm·enSm을 적는다.
 * 영상은 다시 만들지 않는다 (API 비용 0). 이미 사본이 있는 편은 건너뛴다.
 *
 * 사용: npx tsx scripts/small-backfill.ts all | vibelog/2026-10-07,apart/2026-10-11
 * 필요 환경변수: BLOB_READ_WRITE_TOKEN
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { upload } from "./shorts";
import { makeSmall } from "./small-video";
import type { ShortsScript } from "./shorts-types";

const ROOT = path.join(process.cwd(), "content", "shorts");

function targets(arg: string): { repo: string; date: string }[] {
  if (arg !== "all") {
    return arg.split(",").map((s) => {
      const [repo, date] = s.trim().split("/");
      return { repo, date };
    });
  }
  const out: { repo: string; date: string }[] = [];
  for (const repo of fs.readdirSync(ROOT)) {
    const dir = path.join(ROOT, repo);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir)) {
      const m = f.match(/^(\d{4}-\d{2}-\d{2})\.json$/);
      if (m) out.push({ repo, date: m[1] });
    }
  }
  return out;
}

async function main(): Promise<void> {
  const arg = process.argv[2];
  if (!arg) {
    console.error("사용: npx tsx scripts/small-backfill.ts all | repo/date[,repo/date]");
    process.exit(1);
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "small-"));
  let made = 0;
  let failed = 0;
  for (const { repo, date } of targets(arg)) {
    const jsonPath = path.join(ROOT, repo, `${date}.json`);
    if (!fs.existsSync(jsonPath)) continue;
    const script: ShortsScript = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    const media = { ...script.media };
    let changed = false;
    for (const lang of ["ko", "en"] as const) {
      const url = media[lang];
      const smKey = `${lang}Sm` as const;
      if (!url || media[smKey]) continue;
      try {
        const src = path.join(tmp, `${repo}-${date}.${lang}.mp4`);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`내려받기 ${res.status}`);
        fs.writeFileSync(src, Buffer.from(await res.arrayBuffer()));
        const small = src.replace(/\.mp4$/, ".sm.mp4");
        makeSmall(src, small);
        const smUrl = await upload(small, `shorts/${repo}/${date}.${lang}.sm.mp4`);
        if (!smUrl) throw new Error("BLOB_READ_WRITE_TOKEN 없음");
        media[smKey] = smUrl;
        changed = true;
        made += 1;
        console.log(`- ${repo}/${date} ${lang} 작은 사본`);
      } catch (err) {
        failed += 1;
        console.warn(`- ${repo}/${date} ${lang} 실패:`, err instanceof Error ? err.message : err);
      }
    }
    if (changed) {
      script.media = media;
      fs.writeFileSync(jsonPath, JSON.stringify(script, null, 2) + "\n");
    }
  }
  console.log(`작은 사본 ${made}개, 실패 ${failed}개`);
  if (failed && !made) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
