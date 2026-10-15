"use client";
/**
 * 뒤로 버튼이 갈 곳 — 브라우저의 "직전 페이지"가 아니라 **들어온 목록**.
 *
 * router.back()만 쓰던 때는 공유 링크·쇼츠로 글에 바로 들어온 사람이 뒤로를 누르면 사이트
 * 밖으로 나갔고, 글에서 소개 글로 건너간 뒤 뒤로를 누르면 목록이 아니라 앞 글로 돌아갔다.
 * 경로 표시("log")와 실제로 가는 곳도 달랐다.
 *
 * 그래서 목록 페이지(홈·데브로그·쇼츠·프로젝트 페이지)에 들어올 때마다 그 주소를 이 탭의
 * sessionStorage에 남기고, 뒤로는 그 목록으로 간다. 필터(?project=)까지 같이 남는다.
 * 직전 페이지가 바로 그 목록이면 진짜 뒤로를 써서 스크롤 위치를 지킨다.
 *
 * - 글(/p/…): 들어온 목록으로. 바깥에서 바로 들어왔으면 그 글의 프로젝트 페이지로.
 * - 프로젝트 페이지: 들어온 목록(홈·데브로그·쇼츠)으로. 없으면 홈.
 */
import { projectName } from "./project-name";

const LIST = "vibelog:list"; // 마지막 목록 (프로젝트 페이지 포함)
const TOP = "vibelog:top"; // 마지막 최상위 목록 (홈·데브로그·쇼츠)
const PREV = "vibelog:prev";
const CUR = "vibelog:cur";

const get = (k: string): string | null => {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return null;
  }
};
const set = (k: string, v: string) => {
  try {
    sessionStorage.setItem(k, v);
  } catch {
    // 저장이 막힌 창(사생활 보호 모드 등)에서는 기본 목적지로 간다
  }
};

const isTop = (path: string) => path === "/" || path === "/log" || path === "/shorts";
const isProject = (path: string) => /^\/projects\/[^/]+$/.test(path);

/** 페이지에 들어올 때 (Shell이 주소가 바뀔 때마다 부른다) */
export function rememberPage(pathname: string, search: string): void {
  const here = pathname + search;
  const cur = get(CUR);
  if (cur !== here) {
    if (cur) set(PREV, cur);
    set(CUR, here);
  }
  if (isTop(pathname)) {
    set(TOP, here);
    set(LIST, here);
  } else if (isProject(pathname)) {
    set(LIST, here);
  }
}

/** 목록 안에서 필터만 바꿨을 때 — 주소가 바뀌었으니 돌아올 곳도 바꾼다 */
export function rememberFilter(pathname: string, search: string): void {
  const here = pathname + search;
  set(CUR, here);
  set(TOP, here);
  set(LIST, here);
}

export interface BackTarget {
  href: string;
  ko: string;
  en: string;
}

function labelOf(href: string): BackTarget {
  const [path, query = ""] = href.split("?");
  const proj = new URLSearchParams(query).get("project");
  const withProj = (ko: string, en: string): BackTarget =>
    proj
      ? { href, ko: `${ko} · ${projectName(proj)}`, en: `${en} · ${projectName(proj, true)}` }
      : { href, ko, en };
  if (path === "/log") return withProj("데브로그", "Devlog");
  if (path === "/shorts") return withProj("쇼츠", "Shorts");
  const m = path.match(/^\/projects\/([^/]+)$/);
  if (m) {
    const slug = decodeURIComponent(m[1]);
    return { href, ko: projectName(slug), en: projectName(slug, true) };
  }
  return { href: "/", ko: "프로젝트", en: "Projects" };
}

/**
 * 지금 페이지의 뒤로 목적지. postRepo는 글 페이지일 때 그 글의 레포 — 바깥에서 바로
 * 들어왔을 때 갈 곳이다. 서버에서 그릴 때(sessionStorage 없음)도 기본값을 낸다.
 */
export function backTarget(pathname: string, postRepo?: string, memory = true): BackTarget {
  // 첫 그림은 저장값을 읽지 않는다 — 서버 그림과 같아야 hydration이 깨지지 않는다
  const read = memory && typeof window !== "undefined";
  if (isProject(pathname)) {
    const top = read ? get(TOP) : null;
    return labelOf(top ?? "/");
  }
  const list = read ? get(LIST) : null;
  if (list) return labelOf(list);
  if (postRepo) return labelOf(`/projects/${encodeURIComponent(postRepo)}`);
  return labelOf("/log");
}

/** 글 페이지가 자기 레포를 알려 둔다 — 바깥에서 바로 들어온 글의 뒤로 목적지 */
let postRepo: string | undefined;
// 헤더(뒤로 버튼)가 글 본문보다 먼저 그려져서, 글이 레포를 알려 주면 다시 계산하게 알린다
const listeners = new Set<() => void>();
export function setPostRepo(repo: string | undefined): void {
  postRepo = repo;
  listeners.forEach((f) => f());
}
export function onPostRepo(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}
export function currentPostRepo(): string | undefined {
  return postRepo;
}

/** 직전 페이지가 바로 그 목록인가 — 그러면 진짜 뒤로를 써서 스크롤 위치를 지킨다 */
export function cameFrom(href: string): boolean {
  return get(PREV) === href;
}
