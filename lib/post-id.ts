/**
 * 글 주소의 짧은 식별자.
 *
 * 원래 주소는 `/log/<repo>/<date>`였는데, 주소만 봐도 레포 이름과 날짜가
 * 그대로 읽혔다 — 경로를 그렇게까지 드러내고 싶지 않다는 요청 (Jessi).
 * 그래서 `/p/<id>`로 바꾸고, id는 레포·날짜를 해시해 만든다. 되돌릴 수 없으니
 * 주소에서 읽히는 게 없고, 순수 함수라 같은 글은 언제 빌드해도 같은 주소다
 * (파이프라인이 글을 다시 써도 링크가 살아 있어야 한다).
 *
 * 옛 주소는 사라지지 않는다 — `/log/<repo>/<date>`는 여기서 만든 주소로
 * 영구 리다이렉트한다 (app/log/[repo]/[date]/page.tsx).
 */

/** FNV-1a 32비트 — 짧고 고르게 흩어지면 충분하다 (암호용이 아니다) */
function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 글 하나의 주소 식별자 — 소문자·숫자 7자 */
export function postId(repo: string, date: string): string {
  return fnv1a(`${repo}/${date}`).toString(36).padStart(7, "0");
}

export function postPath(post: { repo: string; date: string }): string {
  return `/p/${postId(post.repo, post.date)}`;
}

/**
 * id → 글 찾기. 해시라 되돌릴 수 없으므로 목록을 훑어 맞춘다 (글 수가 적다).
 * 충돌이 나면 두 글이 같은 주소를 갖게 되므로 조용히 넘기지 않고 던진다 —
 * 빌드가 멈추는 편이, 엉뚱한 글이 열리는 것보다 낫다.
 */
export function findByPostId<T extends { repo: string; date: string }>(
  posts: T[],
  id: string,
): T | undefined {
  const hits = posts.filter((p) => postId(p.repo, p.date) === id);
  if (hits.length > 1) {
    throw new Error(
      `글 주소가 겹칩니다 (${id}): ${hits.map((h) => `${h.repo}/${h.date}`).join(", ")}`,
    );
  }
  return hits[0];
}
