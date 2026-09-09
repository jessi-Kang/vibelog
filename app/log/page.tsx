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
    dateLabelEn: fmtDate(d.date, "en"),
    title: d.title,
    titleEn: d.titleEn,
    summary: d.summary,
    summaryEn: d.summaryEn,
    commits: d.commits,
    prs: d.prs,
    hasFail: d.hasFail,
    hasShort: Boolean(d.short),
  }));
  const projects = getProjects().map((p) => ({
    slug: p.slug,
    name: p.name,
    status: p.status,
    lastActive: humanizeLastActive(p.lastActivity),
    lastActiveEn: humanizeLastActive(p.lastActivity, "en"),
  }));

  return (
    <PageContainer>
      <FeedClient items={items} projects={projects} />
    </PageContainer>
  );
}
