import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { FeedClient } from "@/components/feed-client";
import {
  fmtDate,
  getDevlogs,
  getProjects,
  humanizeLastActive,
} from "@/lib/content";

export const metadata: Metadata = { title: "데브로그" };

export default function LogPage() {
  const items = getDevlogs().map((d) => ({
    repo: d.repo,
    date: d.date,
    dateLabel: fmtDate(d.date),
    title: d.title,
    summary: d.summary,
    commits: d.commits,
    prs: d.prs,
    hasFail: Boolean(
      d.sections.fail && !d.sections.fail.startsWith("특별한 삽질은"),
    ),
    hasShort: Boolean(d.short),
  }));
  const projects = getProjects().map((p) => ({
    slug: p.slug,
    name: p.name,
    status: p.status,
    lastActive: humanizeLastActive(p.lastActivity),
  }));

  return (
    <PageContainer>
      <FeedClient items={items} projects={projects} />
    </PageContainer>
  );
}
