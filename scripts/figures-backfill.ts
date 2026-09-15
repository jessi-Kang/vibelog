/**
 * figures-backfill.ts — 이미 발행된 글에 삽화를 붙인다.
 *
 *   npx tsx scripts/figures-backfill.ts all
 *   npx tsx scripts/figures-backfill.ts vibelog/2026-09-15,apart/2026-09-14
 *   npx tsx scripts/figures-backfill.ts all --list      # 대상만 보여 주고 끝 (API 없음)
 *
 * 글은 건드리지 않는다 — "지난 날짜 글은 파이프라인이 다시 만들지 않는다"는
 * 규칙 그대로다. 삽화는 글 옆의 사이드카(.figures.json)라 덧붙이기만 한다.
 * 이미 있던 삽화(손으로 만든 확인용 포함)는 새로 그린 것으로 갈아 끼운다.
 * 삽화가 0장이면 옛 파일도 지운다.
 *
 * 한 글의 실패가 나머지를 막지 않는다. Run workflow의 `figures` 입력이 이걸
 * 부른다 (.github/workflows/devlog.yml).
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { parseSections } from "../lib/content";
import { generateFigures } from "./figures";

const DEVLOG = path.join(process.cwd(), "content", "devlog");

function targets(arg: string): { repo: string; date: string; file: string }[] {
  const all: { repo: string; date: string; file: string }[] = [];
  for (const repo of fs.readdirSync(DEVLOG)) {
    const dir = path.join(DEVLOG, repo);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir).filter((x) => /^\d{4}-\d{2}-\d{2}\.mdx?$/.test(x)))
      all.push({ repo, date: f.replace(/\.mdx?$/, ""), file: path.join(dir, f) });
  }
  all.sort((a, b) => (a.date + a.repo).localeCompare(b.date + b.repo));
  if (arg === "all") return all;
  const want = new Set(arg.split(",").map((s) => s.trim()).filter(Boolean));
  const picked = all.filter((t) => want.has(`${t.repo}/${t.date}`));
  const missing = [...want].filter((w) => !picked.some((t) => `${t.repo}/${t.date}` === w));
  if (missing.length) console.warn(`- 글이 없다: ${missing.join(", ")}`);
  return picked;
}

async function main(): Promise<void> {
  const arg = process.argv[2];
  const listOnly = process.argv.includes("--list");
  if (!arg) {
    console.error("대상을 주세요: all 또는 repo/date[,repo/date…]");
    process.exit(2);
  }
  const list = targets(arg);
  console.log(`대상 ${list.length}편`);
  if (listOnly) {
    for (const t of list) console.log(`  ${t.repo}/${t.date}`);
    return;
  }

  let drawn = 0;
  let failed = 0;
  for (const t of list) {
    const raw = fs.readFileSync(t.file, "utf8");
    const { data, content } = matter(raw);
    const [ko, en] = content.split(/<!--\s*en\s*-->/);
    const out = t.file.replace(/\.mdx?$/, ".figures.json");
    try {
      const { figures, dropped } = await generateFigures(String(data.title ?? t.date), {
        ko: parseSections(ko.trim()),
        en: parseSections((en ?? "").trim()),
      });
      for (const why of dropped) console.warn(`  ! ${t.repo}/${t.date} 삽화 제외: ${why}`);
      if (figures.length) fs.writeFileSync(out, JSON.stringify(figures, null, 1) + "\n");
      else if (fs.existsSync(out)) fs.unlinkSync(out);
      drawn += figures.length;
      console.log(`- ${t.repo}/${t.date} 삽화 ${figures.length}장`);
    } catch (err) {
      failed++;
      console.error(`- ${t.repo}/${t.date} 실패:`, err);
    }
  }
  console.log(`\n삽화 ${drawn}장 · 실패 ${failed}편`);
  if (failed && failed === list.length) process.exit(1);
}

main();
