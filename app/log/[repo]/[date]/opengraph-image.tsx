import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og";
import { getDevlog, getDevlogs } from "@/lib/content";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "vibelog 데브로그";

// 빌드 때 미리 그린다 — 없으면 크롤러가 올 때마다 폰트를 새로 받는다
export function generateStaticParams() {
  return getDevlogs().map((d) => ({ repo: d.repo, date: d.date }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ repo: string; date: string }>;
}) {
  const { repo, date } = await params;
  const d = getDevlog(repo, date);
  return ogCard({
    eyebrow: "devlog",
    title: d?.title ?? repo,
    sub: d?.summary,
    meta: `${repo} · ${date}`,
  });
}
