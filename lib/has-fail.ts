/**
 * "삽질 포인트" 섹션에 실제 이야기가 있는가.
 *
 * 순수 함수 — 서버(lib/content.ts)·클라이언트(post-client.tsx)·파이프라인(run.ts)이
 * 같은 판정을 쓴다. 전에는 셋이 제각각이었다: 목록 배지는 "특별한 삽질은 없"으로
 * 시작하면 false, 글 페이지는 startsWith("특별한 삽질은")이면 본문을 통째로
 * "오늘은 없었습니다."로 접었다. 그런데 9/21 apart 글은 "특별한 삽질은
 * 없었습니다. 다만 새로 받은 목록을 … 덮어쓰지 않고 더하는 방식으로 …"처럼
 * 첫 문장만 '없음'이고 뒤에 이야기가 이어졌다 — 그 이야기와 삽화 1장이 화면에서
 * 사라졌다 (삽화는 그려 놓고 안 보여 준 셈: 비용만 들었다).
 *
 * 규칙: '없다'로 시작해도 **첫 문장 뒤에 이야기가 이어지면** 삽질 섹션이다.
 */
const OPENERS =
  /^(특별한 삽질은 없|오늘은 없었습니다|없었습니다|없음|none\b|no (real |special |notable )?(rabbit ?holes?|pitfalls?|issues?|problems?|snags?))/i;

/** 첫 문장 뒤에 남는 이야기가 이만큼은 되어야 "이어진다"고 본다 */
const REST_MIN = 40;

export function hasRealFail(fail?: string): boolean {
  const t = fail?.trim();
  if (!t) return false;
  if (!OPENERS.test(t)) return true;
  const rest = t.replace(/^[^.!?。]*[.!?。]\s*/, "");
  return rest.length >= REST_MIN;
}
