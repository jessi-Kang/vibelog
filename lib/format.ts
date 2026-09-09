/** 클라이언트에서도 쓰는 순수 포맷 헬퍼 — node 모듈 import 금지 */

export const DOW = ["일", "월", "화", "수", "목", "금", "토"];

/** "오늘" / "어제" / "N일 전" / "N주 전" — 사람이 읽는 날짜 규칙 */
export function humanizeLastActive(iso: string): string {
  const kstNow = new Date(Date.now() + 9 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
  const days = Math.floor(
    (new Date(kstNow).getTime() - new Date(iso.slice(0, 10)).getTime()) /
      86400000,
  );
  if (days <= 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 14) return `${days}일 전`;
  return `${Math.floor(days / 7)}주 전`;
}

/** "2026-09-14 · 일" — 서버 타임존과 무관하게 날짜 문자열 그대로의 요일 */
export function fmtDate(date: string): string {
  return `${date} · ${DOW[new Date(`${date}T00:00:00Z`).getUTCDay()]}`;
}

/** 리스트용 "09.14" */
export function fmtShort(date: string): string {
  return date.slice(5).replace("-", ".");
}
