/**
 * check-korean.ts — 읽는 사람이 멈추게 되는 한국어 표현을 찾는다.
 *
 *   npx tsx scripts/check-korean.ts                 # README·CLAUDE.md·docs/*.md
 *   npx tsx scripts/check-korean.ts --commit        # 마지막 커밋 메시지
 *   npx tsx scripts/check-korean.ts --text "문장"    # 문장 하나
 *   npx tsx scripts/check-korean.ts --run           # 홈 "지난 실행"에 찍히는 문구 (scripts/*.ts의 문자열)
 *   npx tsx scripts/check-korean.ts 파일 …           # 고른 파일만
 *   … --strict                                      # "강"이 하나라도 있으면 실패 (커밋 전 검사용)
 *
 * 목록은 scripts/korean-style.ts에 있다. 따옴표·백틱 안은 보지 않는다 — 문서가
 * 나쁜 예를 인용하는 자리에서 걸리지 않게. 규칙과 이유는 .claude/skills/korean-writing.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { findStyleHits, type StyleHit } from "./korean-style";

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const rest = args.filter((a) => a !== "--strict");

function docFiles(): string[] {
  const docs = fs
    .readdirSync("docs")
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join("docs", f));
  return ["README.md", "CLAUDE.md", ...docs];
}

/** scripts/*.ts에서 runLines 문구가 될 한국어 문자열만 뽑는다 (text: `…` / text: "…") */
function runStrings(): { name: string; text: string }[] {
  const out: { name: string; text: string }[] = [];
  for (const f of fs.readdirSync("scripts").filter((x) => x.endsWith(".ts"))) {
    const src = fs.readFileSync(path.join("scripts", f), "utf8");
    src.split("\n").forEach((line, i) => {
      const m = line.match(/text:\s*[`"](.*[가-힣].*)[`"]/);
      if (m) out.push({ name: `scripts/${f}:${i + 1}`, text: m[1] });
    });
  }
  return out;
}

const targets: { name: string; text: string; quoted?: boolean }[] = [];
if (rest[0] === "--commit") {
  targets.push({ name: "마지막 커밋 메시지", text: execSync("git log -1 --format=%B").toString(), quoted: false });
} else if (rest[0] === "--text") {
  targets.push({ name: "입력", text: rest.slice(1).join(" "), quoted: true });
} else if (rest[0] === "--run") {
  for (const r of runStrings()) targets.push({ ...r, quoted: true });
} else {
  const files = rest.length > 0 ? rest : docFiles();
  for (const f of files) targets.push({ name: f, text: fs.readFileSync(f, "utf8") });
}

let strong = 0;
let weak = 0;
for (const t of targets) {
  const hits: StyleHit[] = findStyleHits(t.text, { quoted: t.quoted });
  if (hits.length === 0) continue;
  console.log(`\n${t.name}`);
  for (const h of hits) {
    if (h.rule.level === "strong") strong++;
    else weak++;
    const where = t.name.includes(":") ? "" : `${h.line}줄 `;
    console.log(`  ${h.rule.level === "strong" ? "강" : "약"} ${where}「${h.match}」 ${h.sentence.slice(0, 80)}`);
    console.log(`      → ${h.rule.why}`);
  }
}

console.log(
  strong + weak === 0
    ? "\n한국어 표현 검사: 걸린 곳 없음"
    : `\n한국어 표현 검사: 강 ${strong}곳, 약 ${weak}곳 — 약은 문맥을 보고 판단한다`,
);
if (strict && strong > 0) process.exit(1);
