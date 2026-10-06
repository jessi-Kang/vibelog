/**
 * commit-rule.ts — 커밋 규칙(docs/02 §3)을 코드로 옮긴 순수 함수.
 *
 * 두 곳이 같이 쓴다.
 * - collect.ts: 밤마다 "본문 있는 커밋이 5개 모였나"를 셀 때.
 * - check-commit.ts: 이 레포에서 커밋할 때 형식을 검사할 때 (.githooks/commit-msg).
 *
 * 순수 모듈 — 파일·네트워크 없음.
 */

/** 커밋 제목 앞에 붙는 타입. 쇼츠 첫 장면의 커밋 그래프가 이걸로 색을 정한다 (feat 강조색, fix 경고색) */
export const COMMIT_TYPES = ["feat", "fix", "docs", "chore", "design", "asset"] as const;

/** 본문이 40자는 돼야 "왜"가 있다고 본다 */
export const RULE_BODY_MIN = 40;

/**
 * 커밋 끝에 붙는 서명 줄. 본문 길이를 셀 때 뺀다.
 * 빼지 않던 때는 제목 한 줄에 "Co-Authored-By: …" 서명만 붙은 커밋도 본문이 40자를
 * 넘어 "본문 있는 커밋"으로 셌다. Jessi의 커밋은 Claude와 같이 써서 늘 서명이 붙는다.
 */
const TRAILER = /^(Co-Authored-By|Claude-Session|Signed-off-by|Reviewed-by|Generated-by|Change-Id):/i;

/** 제목을 뺀 본문 — 서명 줄은 뺀다 */
export function commitBody(message: string): string {
  return message
    .split("\n")
    .slice(1)
    .filter((l) => !TRAILER.test(l.trim()))
    .join("\n")
    .trim();
}

/**
 * 커밋 규칙(한 줄 요약 + 빈 줄 + "왜"가 든 본문)을 따른 커밋인가.
 * 글을 쓸 때는 모든 커밋을 재료로 쓰지만, "5개가 모였나"를 셀 때는 이런 커밋만
 * 센다 — "fix", "wip"처럼 제목만 있는 커밋은 다섯 개가 쌓여도 글이 나오지 않는다.
 */
export function followsCommitRule(message: string): boolean {
  return commitBody(message).length >= RULE_BODY_MIN;
}

/** 커밋 메시지의 형식 문제를 쉬운 문장으로 돌려준다. 문제가 없으면 빈 배열 */
export function commitProblems(message: string): string[] {
  const lines = message.replace(/\r/g, "").split("\n").filter((l) => !l.startsWith("#"));
  const subject = lines[0] ?? "";
  // git이 만드는 병합·되돌리기 커밋은 형식 검사를 하지 않는다
  if (/^(Merge |Revert "|fixup! |squash! )/.test(subject)) return [];
  const problems: string[] = [];
  const typeRe = new RegExp(`^(${COMMIT_TYPES.join("|")}): \\S`);
  if (!typeRe.test(subject)) {
    problems.push(
      `제목 앞에 타입이 없습니다. "${COMMIT_TYPES.join(" / ")}" 중 하나를 붙여 "fix: 한 줄 요약"처럼 씁니다.`,
    );
  }
  if (lines.length > 1 && lines[1].trim() !== "") {
    problems.push("제목 다음 줄은 비워 둡니다. 본문은 빈 줄 뒤에 씁니다.");
  }
  const body = commitBody(lines.join("\n"));
  if (body.length < RULE_BODY_MIN) {
    problems.push(
      `본문이 ${body.length}자입니다. 왜 그렇게 했는지 ${RULE_BODY_MIN}자 이상 씁니다 (서명 줄은 세지 않습니다).`,
    );
  }
  return problems;
}
