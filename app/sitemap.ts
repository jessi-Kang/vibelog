import type { MetadataRoute } from "next";
import { getDevlogs, getProjects } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

// 글 발행 시각 근사 — 밤 실행이 23:00 KST(14:00 UTC)에 커밋한다
const publishedAt = (date: string) => new Date(`${date}T14:00:00Z`);

export default function sitemap(): MetadataRoute.Sitemap {
  const devlogs = getDevlogs();
  const latest = devlogs[0] ? publishedAt(devlogs[0].date) : new Date();

  return [
    { url: SITE_URL, lastModified: latest, priority: 1 },
    { url: `${SITE_URL}/log`, lastModified: latest, priority: 0.8 },
    { url: `${SITE_URL}/shorts`, lastModified: latest, priority: 0.6 },
    { url: `${SITE_URL}/about`, priority: 0.4 },
    ...getProjects().map((p) => ({
      url: `${SITE_URL}/projects/${p.slug}`,
      lastModified: new Date(p.lastActivity),
      priority: 0.8,
    })),
    ...devlogs.map((d) => ({
      url: `${SITE_URL}/log/${d.repo}/${d.date}`,
      lastModified: publishedAt(d.date),
      priority: 0.7,
    })),
  ];
}
