import projects from "../content/projects.json";

/**
 * 화면에 쓰는 프로젝트 이름 — 레포 이름이 아니라 서비스 이름 ("lie-detective" → "거짓말 탐정").
 * 기획서가 정한 이름을 먼저, 없으면 화면에서 찾아 projects.json의 name에 적어 둔다 (scripts/intro.ts,
 * 기획서가 바뀐 밤에는 scripts/plan-name.ts). 찾지 못했거나
 * 아직 소개 글이 없으면 레포 이름 그대로다. 글 목록처럼 레포 이름만 들고 있는 자리가 쓴다.
 */
const BY_SLUG = new Map(
  (projects as { slug: string; name?: string; nameEn?: string }[]).map((p) => [p.slug, p]),
);

export function projectName(slug: string, en = false): string {
  const p = BY_SLUG.get(slug);
  return (en ? (p?.nameEn ?? p?.name) : p?.name) ?? slug;
}
