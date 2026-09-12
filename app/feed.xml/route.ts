import { getDevlogs } from "@/lib/content";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { postPath } from "@/lib/post-id";

// 빌드 시점에 정적 생성 — 글은 파이프라인 커밋 → 재배포로만 늘어난다
export const dynamic = "force-static";

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function GET() {
  // 최근 30편이면 리더 구독에 충분하고 파일이 비대해지지 않는다
  const items = getDevlogs()
    .slice(0, 30)
    .map((d) => {
      const url = `${SITE_URL}${postPath(d)}`;
      // 밤 실행이 23:00 KST(14:00 UTC)에 커밋한다 — 발행 시각 근사
      const pubDate = new Date(`${d.date}T14:00:00Z`).toUTCString();
      const desc = d.summary ?? d.title;
      return `    <item>
      <title>${esc(`${d.repo} — ${d.title}`)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${esc(desc)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITE_NAME)}</title>
    <link>${SITE_URL}</link>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>${esc(SITE_DESCRIPTION)}</description>
    <language>ko</language>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
