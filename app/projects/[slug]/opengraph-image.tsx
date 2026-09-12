import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og";
import { getDevlogs, getProject, getProjects } from "@/lib/content";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "vibelog 프로젝트";

// 빌드 때 미리 그린다 (위 데브로그 카드와 같은 이유)
export function generateStaticParams() {
  return getProjects().map((p) => ({ slug: p.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = getProject(slug);
  const count = getDevlogs(slug).length;
  return ogCard({
    eyebrow: p?.status ?? "project",
    title: p?.name ?? slug,
    sub: p?.description,
    meta: `${count} devlogs`,
  });
}
