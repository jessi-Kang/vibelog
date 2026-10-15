import type { NextConfig } from "next";

/**
 * 응답 보안 헤더.
 *
 * 이 사이트는 **사람이 읽기 전에 발행된다** — 글의 제목·본문을 모델이 쓰고
 * 커밋 한 번이 그대로 라이브가 된다. 그래서 "내용이 코드에 닿는 자리" 하나가
 * 뚫리면 방문자 브라우저까지 간다 (실제로 ld+json 블록이 그랬다. lib/ld-json.ts).
 * 그 자리를 막는 것이 1차 방어이고, 이 헤더들은 **다음 실수를 위한 층**이다.
 *
 * CSP의 script-src는 아직 넣지 않는다 — Next가 넣는 인라인 부트스트랩 때문에
 * nonce 배선이 필요하고, 잘못 넣으면 사이트가 조용히 죽는다. 지금 넣는
 * frame-ancestors는 스크립트 실행과 무관해서 그런 위험이 없다.
 */
const SECURITY_HEADERS = [
  // 다른 사이트가 우리를 iframe에 넣어 클릭을 훔치지 못하게
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  // 브라우저가 Content-Type을 제멋대로 추측하지 않게 (텍스트를 스크립트로 읽는 사고)
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 바깥으로 나갈 때 주소 전체를 흘리지 않는다
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 쓰지 않는 장치 권한은 닫아 둔다
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  // 쇼츠 썸네일(Vercel Blob)을 카드 크기로 미리 줄여 보낸다 — 1080px 원본을 브라우저가 240px로
  // 한 번에 줄이면 글자 가장자리가 들쭉날쭉해졌다 (데스크톱, 10/11). 모바일은 화면 밀도가
  // 높아 덜 줄여서 멀쩡했다
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
