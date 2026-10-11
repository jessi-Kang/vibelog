/**
 * 사람마다 아이콘 하나와 색 하나 — 계정 번호로 정해져 어느 글에서나 같다 (시안 docs/post-comments.html).
 *
 * Google 프로필 사진은 받지도 저장하지도 않는다. 얼굴이 사이트에 남지 않고, 프로젝트 아이콘·
 * 쇼츠 아이콘과 한 세트로 보인다. 42개 × 9색 = 378가지라 같은 글에서 겹칠 일이 드물다.
 * Jessi는 터미널 아이콘에 vibelog 민트색으로 고정한다.
 */
import { AVATAR_POOL } from "./avatar-icons";
import { PALETTE } from "./project-color";

export const ADMIN_AVATAR = { icon: "terminal", color: "#5EE1C3" };
/** 로그인 전에 남의 댓글에 붙는 아이콘 — 회색 사람 */
export const ANON_AVATAR = { icon: "user", color: "#8C98A8" };

function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function avatarFor(userId: string): { icon: string; color: string } {
  const h = hash(`avatar:${userId}`);
  return {
    icon: AVATAR_POOL[h % AVATAR_POOL.length],
    // 아이콘과 색이 같은 해시 자리를 쓰면 짝이 고정된다 — 몫으로 색을 고른다
    color: PALETTE[Math.floor(h / AVATAR_POOL.length) % PALETTE.length],
  };
}
