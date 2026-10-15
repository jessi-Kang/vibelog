/**
 * check-quotes.ts — 레포 파일에 대화 속 말을 따옴표로 옮겨 적은 곳이 있는지 본다 (scripts/quote-rule.ts).
 *
 *   npx tsx scripts/check-quotes.ts            # git이 관리하는 파일 전부 (content/는 파이프라인이 쓰므로 뺀다)
 *   npx tsx scripts/check-quotes.ts --staged   # 커밋하려고 올린 파일만 (.githooks/pre-commit이 부른다)
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
import { findUserQuotes } from "./quote-rule";

const staged = process.argv.includes("--staged");
const list = execSync(staged ? "git diff --cached --name-only --diff-filter=ACM" : "git ls-files").toString().split("\n");
const files = list.filter(
  (f) => f && f !== "scripts/quote-rule.ts" && !f.startsWith("content/") && !f.startsWith("node_modules/") && /\.(md|mdx|ts|tsx|js|jsx|mjs|css|html|yml|yaml|json|svg|txt)$/.test(f) && !/package(-lock)?\.json$/.test(f),
);
let n = 0;
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  // 커밋 전 검사는 올려 둔 내용(인덱스)을 본다 — 작업 폴더에서 고쳤지만 다시 올리지 않은 것은 커밋되지 않는다
  const text = staged ? execSync(`git show :"${f}"`, { maxBuffer: 64 << 20 }).toString() : fs.readFileSync(f, "utf8");
  for (const h of findUserQuotes(text)) {
    console.error(`${f}:${h.line}  ${h.text}`);
    n++;
  }
}
if (n === 0) console.log("대화 인용 검사: 걸린 곳 없음");
else {
  console.error(`대화 인용 검사: ${n}곳 — 대화 속 말을 옮겨 적거나 이름을 출처로 달지 않습니다. 무엇을 왜 정했는지 뜻만 풀어 씁니다 (CLAUDE.md "대화를 옮겨 적지 않는다")`);
  process.exit(1);
}
