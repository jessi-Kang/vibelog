import projects from "../content/projects.json";

/**
 * 공개하기 전까지 사이트에서 숨기는 프로젝트 — 레포에 topic `vibelog-hidden`을 달면 30분 안에
 * 프로젝트 인식(projects.yml)이 projects.json에 hidden을 적고, 사이트가 그 프로젝트의 이름·카드·
 * 프로젝트 페이지·글·쇼츠·피드·사이트맵을 뺀다. topic을 떼면 다음 인식에 다시 보인다 (10/17).
 *
 * 숫자는 남긴다 — 홈 잔디·오늘/이번 주 커밋은 이름이 나오지 않아 그대로 세고, 지난 실행 줄은
 * 이름만 "비공개 프로젝트"로 바꿔 보인다.
 *
 * 이 파일은 projects.json을 통째로 읽으므로 서버·파이프라인에서만 쓴다 — 화면 코드는
 * content/projects.public.json(scripts/public-projects.ts)을 읽는다.
 *
 * 파이프라인은 그대로 돈다 — 글과 쇼츠는 계속 쌓이고 화면에만 나오지 않는다. 파이프라인
 * 스크립트는 lib/content.ts의 includeHiddenProjects()로 전부 본다 (안 그러면 숨긴 레포의 지난
 * 글을 못 찾아 소개 글을 또 쓰거나 day 번호가 틀어진다).
 */
export const HIDDEN_TOPIC = "vibelog-hidden";

/** topic을 달기 전부터 숨기던 것 — 그 레포에 topic을 달면 여기서 지운다 */
export const BY_HAND_HIDDEN: ReadonlySet<string> = new Set(["portfolio-tmp", "Anchor"]);

const BY_TOPIC = new Set(
  (projects as { slug: string; hidden?: boolean }[]).filter((p) => p.hidden).map((p) => p.slug),
);

export function isHiddenProject(slug: string): boolean {
  return BY_HAND_HIDDEN.has(slug) || BY_TOPIC.has(slug);
}

export function hiddenSlugs(): string[] {
  return [...new Set([...BY_HAND_HIDDEN, ...BY_TOPIC])];
}
