/**
 * 글에 끼우는 영상 — `content/devlog/<repo>/<date>.videos.json` (사람이 넣는 사이드카).
 *
 * 글은 파이프라인이 쓰지만, 프로젝트에서 따로 만든 영상(게임 인트로 등)을 그날 글에
 * 붙이고 싶을 때가 있다. 글 파일(md)에 넣으면 재생성·다시 쓰기가 덮어쓰므로 옆 파일에 둔다.
 * 파일은 이 사이트의 `public/media/` 아래에만 둔다 — 다른 주소를 그대로 걸면 남의 서버가
 * 방문자를 추적하는 길이 된다 (글 본문 그림을 막은 것과 같은 이유, lib/md-links.ts).
 */
export interface PostVideo {
  section: "did" | "why" | "built" | "fail" | "next";
  /** 이 섹션의 몇 번째 문단 뒤에 놓을지 (0부터) — 삽화와 같다 */
  after: number;
  /** /media/로 시작하는 이 사이트 안 주소 */
  src: string;
  poster?: string;
  caption: string;
  captionEn?: string;
  width: number;
  height: number;
}

const LOCAL = /^\/media\/[\w./-]+$/;

/** 이 사이트 안 파일만 남긴다 — 손으로 쓰는 파일이라 형식이 틀려도 화면은 안전해야 한다 */
export function cleanVideos(v: unknown): PostVideo[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (x): x is PostVideo =>
      x &&
      typeof x === "object" &&
      typeof x.src === "string" &&
      LOCAL.test(x.src) &&
      !x.src.includes("..") &&
      (x.poster === undefined || (typeof x.poster === "string" && LOCAL.test(x.poster) && !x.poster.includes(".."))) &&
      typeof x.section === "string" &&
      Number.isInteger(x.after) &&
      typeof x.caption === "string" &&
      x.width > 0 &&
      x.height > 0,
  );
}
