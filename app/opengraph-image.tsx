import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og";
import { SITE_DESCRIPTION } from "@/lib/site";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "vibelog";

/**
 * 사이트 기본 카드. 손으로 만든 /og.png를 쓰다가 여백이 글 카드와 따로
 * 놀았다 (Jessi 지적) — 같은 ogCard로 그려 한 세트로 맞춘다.
 * 글·프로젝트 라우트는 각자 opengraph-image.tsx가 이걸 덮어쓴다.
 */
export default async function Image() {
  return ogCard({
    eyebrow: "auto-published devlog",
    title: "만들고 있는 것들의 기록",
    sub: SITE_DESCRIPTION,
    meta: "vibelog.space",
  });
}
