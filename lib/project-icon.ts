/**
 * 프로젝트 아이콘 — Tabler outline 한 스타일만 쓴다 (시안 docs/project-icons.html B안, 10/11).
 *
 * 소개 글이 코드를 읽을 때 같은 호출에서 이름을 고르고(scripts/icons.ts), 그 모양을 한 번
 * 받아 projects.json에 적는다. 방문할 때 Iconify에 따로 요청하지 않는다.
 *
 * 저장은 그리는 좌표(d)뿐이다 — SVG 문자열을 페이지에 넣지 않는다. 선 굵기·끝 모양은
 * Tabler 공통값이라 그릴 때 붙인다. 화면도 좌표 모양을 한 번 더 보고, 아니면 안 그린다.
 */
export interface IconPath {
  d: string;
  /** 면으로 칠하는 작은 점 (Tabler가 눈·점을 이렇게 그린다) */
  filled?: boolean;
}

export interface ProjectIcon {
  /** "tabler:spy" */
  name: string;
  paths: IconPath[];
}

/** 경로 명령과 숫자만 — 다른 글자가 섞이면 그리지 않는다 */
const D = /^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]+$/;

/**
 * 아이콘을 고를 재료가 없을 때(소개 글이 아직 없거나, 세트에 맞는 아이콘이 없을 때) 그리는 기본 아이콘 —
 * Tabler `code` (시안 docs/project-icon-default.html C안, 10/11 Jessi). projects.json에는 적지 않는다 —
 * 적으면 나중에 소개 글이 고른 아이콘과 구별이 안 된다. 화면에서만 대신 그린다.
 */
export const DEFAULT_PROJECT_ICON: ProjectIcon = {
  name: "tabler:code",
  paths: [{ d: "m7 8l-4 4l4 4m10-8l4 4l-4 4M14 4l-4 16" }],
};

/** 그릴 아이콘 — 저장된 것이 쓸 만하면 그것, 아니면 기본 아이콘 */
export function iconOrDefault(v: unknown): ProjectIcon {
  return safeIcon(v) ?? DEFAULT_PROJECT_ICON;
}

export function safeIcon(v: unknown): ProjectIcon | null {
  if (!v || typeof v !== "object") return null;
  const o = v as { name?: unknown; paths?: unknown };
  if (typeof o.name !== "string" || !/^tabler:[a-z0-9-]+$/.test(o.name)) return null;
  if (!Array.isArray(o.paths) || o.paths.length === 0 || o.paths.length > 12) return null;
  const paths: IconPath[] = [];
  for (const p of o.paths) {
    const d = (p as IconPath)?.d;
    if (typeof d !== "string" || d.length > 4000 || !D.test(d)) return null;
    paths.push({ d, ...((p as IconPath).filled ? { filled: true } : {}) });
  }
  return { name: o.name, paths };
}
