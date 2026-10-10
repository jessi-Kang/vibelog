/**
 * 글 본문(모델이 쓴 마크다운)의 링크를 어디까지 살릴지 — 순수 함수.
 *
 * 이 사이트의 글은 사람이 읽기 전에 발행된다. 원료인 커밋 메시지에 끼워 넣은 지시가
 * 모델을 거쳐 `[로그인](https://다른-사이트/…)` 같은 링크가 되면, 그 링크가 내 이름으로
 * 걸린 채 나간다. 그림 문법(`![](https://…)`)은 남의 서버에서 그림을 불러와 방문자가
 * 언제 읽었는지를 그 서버에 알려 준다. 레드팀 점검(10/10)에서 둘 다 그대로 그려지는 것을
 * 확인했다 — 안전 검사는 이런 링크를 따로 보지 않는다.
 *
 * 그래서 넣는 자리를 막는다: 이 사이트 안의 주소와 GitHub만 링크로 남기고, 나머지는
 * 글자만 남긴다. 본문 그림은 그리지 않는다 — 글 그림은 검증기를 거친 삽화가 따로 맡는다.
 * 지금까지 발행된 글에는 본문 링크가 하나도 없어서 잃는 것은 없다.
 */
const ALLOWED_HOSTS = new Set([
  "vibelog.space",
  "www.vibelog.space",
  "github.com",
]);

export function allowedPostLink(href: string | undefined): boolean {
  if (!href) return false;
  // 이 사이트 안의 경로·앵커 (`//남의-주소`는 다른 사이트라 뺀다)
  if (href.startsWith("#") || (href.startsWith("/") && !href.startsWith("//")))
    return true;
  try {
    const u = new URL(href);
    return u.protocol === "https:" && ALLOWED_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}
