/**
 * 잠시 사이트에서 숨기는 프로젝트 — 카드·프로젝트 페이지·글·쇼츠·피드·사이트맵·홈 통계와
 * 잔디·지난 실행 줄에서 모두 빠진다. 다시 보이려면 여기서 지우기만 하면 된다 (10/17).
 *
 * 파이프라인은 그대로 돈다 — 글과 쇼츠는 계속 쌓이고 화면에만 나오지 않는다. 그래서 숨김은
 * 사이트에서만 걸고, 파이프라인 스크립트는 lib/content.ts의 includeHiddenProjects()로 전부 본다
 * (안 그러면 숨긴 레포의 지난 글을 못 찾아 소개 글을 또 쓰거나 day 번호가 틀어진다).
 */
export const HIDDEN_PROJECTS: ReadonlySet<string> = new Set(["portfolio-tmp", "Anchor"]);

export function isHiddenProject(slug: string): boolean {
  return HIDDEN_PROJECTS.has(slug);
}
