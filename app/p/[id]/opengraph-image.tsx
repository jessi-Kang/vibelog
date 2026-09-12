import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og";
import { getDevlogs } from "@/lib/content";
import { findByPostId, postId } from "@/lib/post-id";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "vibelog 데브로그";

// 빌드 때 미리 그린다 — 없으면 크롤러가 올 때마다 폰트를 새로 받는다
export function generateStaticParams() {
  return getDevlogs().map((d) => ({ id: postId(d.repo, d.date) }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const d = findByPostId(getDevlogs(), id);
  return ogCard({
    eyebrow: "devlog",
    title: d?.title ?? "devlog",
    sub: d?.summary,
    meta: d ? `${d.repo} \u00b7 ${d.date}` : "vibelog",
  });
}
