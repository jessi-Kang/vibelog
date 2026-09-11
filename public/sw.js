/**
 * 최소 서비스 워커 — 설치한 앱이 "진짜 앱"으로 열리게 하는 조건.
 *
 * 안드로이드 크롬은 매니페스트만 있고 서비스 워커가 없으면 홈 화면에
 * 바로가기(shortcut)만 만든다. 바로가기는 주소·닫기 버튼이 있는 브라우저
 * 탭으로 열린다 — Jessi가 "앱인데 왜 상단에 저런게 뜨지"라고 본 그 줄.
 * 오프라인에서도 뭔가 그릴 수 있는 워커가 등록돼야 WebAPK로 설치되고,
 * 그제서야 주소창 없는 창(standalone)으로 뜬다.
 *
 * 캐시 정책은 일부러 소극적이다. 이 사이트는 매일 밤 글·영상이 바뀌므로
 * 캐시가 네트워크를 이기면 어제 글을 보여주는 사고가 난다.
 * - 페이지 이동: 언제나 네트워크 먼저. 실패할 때만 오프라인 안내를 꺼낸다.
 * - 캐시 우선은 내용이 바뀌면 경로도 바뀌는 것만 (해시 박힌 빌드 산출물·아이콘).
 * - 이미지·영상·API는 건드리지 않는다 — 브라우저 기본 캐시에 맡긴다.
 */
const VERSION = "v1";
const SHELL = `vibelog-shell-${VERSION}`;
const OFFLINE = "/offline";
const PRECACHE = [OFFLINE, "/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).catch(() =>
        caches
          .match(OFFLINE)
          .then((hit) => hit ?? new Response("", { status: 504 })),
      ),
    );
    return;
  }

  const cacheFirst =
    url.pathname.startsWith("/_next/static/") || PRECACHE.includes(url.pathname);
  if (!cacheFirst) return;

  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ??
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
