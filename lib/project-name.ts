// 숨긴 프로젝트를 뺀 사본 — 이 파일은 브라우저로 내려간다 (scripts/public-projects.ts)
import projects from "../content/projects.public.json";
import type { ProjectIcon } from "./project-icon";

/**
 * 화면에 쓰는 프로젝트 이름 — 레포 이름이 아니라 서비스 이름 ("lie-detective" → "거짓말 탐정").
 * 기획서가 정한 이름을 먼저, 없으면 화면에서 찾아 projects.json의 name에 적어 둔다 (scripts/intro.ts,
 * 기획서가 바뀐 밤에는 scripts/plan-name.ts). 찾지 못했거나
 * 아직 소개 글이 없으면 레포 이름 그대로다. 글 목록처럼 레포 이름만 들고 있는 자리가 쓴다.
 */
const BY_SLUG = new Map(
  (projects as { slug: string; name?: string; nameEn?: string; icon?: ProjectIcon }[]).map((p) => [p.slug, p]),
);

export function projectName(slug: string, en = false): string {
  const p = BY_SLUG.get(slug);
  return (en ? (p?.nameEn ?? p?.name) : p?.name) ?? slug;
}

/** 프로젝트 아이콘 — 글 목록처럼 레포 이름만 들고 있는 자리가 쓴다. 없으면 undefined (그리는 쪽이 기본 아이콘) */
export function projectIconOf(slug: string): ProjectIcon | undefined {
  return BY_SLUG.get(slug)?.icon;
}

/**
 * 프로젝트 설명 한두 문장 — 소개 글이 기획서를 읽고 쓴 설명(about)이 먼저, 없으면 레포 설명.
 * 프로젝트 페이지만 about을 쓰고 홈 카드·링크 미리보기는 레포 설명을 쓰던 때는, 소개 글이
 * 설명을 고친 뒤에도 홈에 옛 문구가 남아 두 곳이 다른 말을 했다 (apart, 10/17)
 */
export function projectBlurb(
  p: { about?: string; aboutEn?: string; description?: string; descriptionEn?: string },
  en = false,
): string | undefined {
  const ko = p.about || p.description || undefined;
  if (!en) return ko;
  return (p.about ? p.aboutEn : p.descriptionEn) || ko;
}
