/**
 * check-commit.ts — 이 레포의 커밋 메시지가 커밋 규칙을 따르는지 검사한다.
 *
 *   npx tsx scripts/check-commit.ts            # 마지막 커밋
 *   npx tsx scripts/check-commit.ts <파일>      # 커밋하기 전 메시지 파일 (.githooks/commit-msg가 부른다)
 *
 * 형식: "타입: 한 줄 요약" + 빈 줄 + "왜"가 든 본문 40자 이상 (서명 줄 제외).
 * 타입은 feat / fix / docs / chore / design / asset. 다른 프로젝트 레포에 붙이는
 * 커밋 규칙 블록(docs/02 §3)과 같은 조건이다. 9/12부터 이 레포 커밋에서 타입이
 * 빠져, 쇼츠 첫 장면의 커밋 그래프가 전부 회색으로 나왔다 (그래프는 타입으로
 * 색을 정한다: feat 강조색, fix 경고색).
 *
 * 한국어 표현 검사(scripts/korean-style.ts)의 "강"도 같이 본다. 커밋 메시지는 밤마다
 * 글의 재료라서, 커밋이 어려우면 글도 어려워진다.
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
import { commitProblems } from "./commit-rule";
import { findStyleHits } from "./korean-style";

const file = process.argv[2];
const message = file ? fs.readFileSync(file, "utf8") : execSync("git log -1 --format=%B").toString();

const problems = commitProblems(message);
for (const h of findStyleHits(message).filter((x) => x.rule.level === "strong")) {
  problems.push(`「${h.match}」 ${h.rule.why} — ${h.sentence.slice(0, 60)}`);
}

if (problems.length === 0) {
  console.log("커밋 메시지 검사: 통과");
} else {
  console.error("커밋 메시지 검사: 고칠 곳이 있습니다");
  for (const p of problems) console.error(`  - ${p}`);
  console.error("규칙: CLAUDE.md \"커밋 규칙\"");
  process.exit(1);
}
