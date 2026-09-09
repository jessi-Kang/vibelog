import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/page-container";
import { PostClient } from "@/components/post-client";
import { fmtDate, getDevlog, getDevlogs, getProject } from "@/lib/content";

interface Props {
  params: Promise<{ repo: string; date: string }>;
}

export function generateStaticParams() {
  return getDevlogs().map((d) => ({ repo: d.repo, date: d.date }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { repo, date } = await params;
  return { title: getDevlog(repo, date)?.title ?? `${repo} · ${date}` };
}

export default async function DevlogPostPage({ params }: Props) {
  const { repo, date } = await params;
  const d = getDevlog(repo, date);
  if (!d) notFound();
  const project = getProject(repo);

  return (
    <PageContainer reading>
      <PostClient
        post={{
          repo: d.repo,
          date: d.date,
          dateLabel: fmtDate(d.date),
          title: d.title,
          titleEn: d.titleEn,
          day: d.day,
          commits: d.commits,
          prs: d.prs,
          shas: d.shas,
          sections: d.sections,
          sectionsEn: d.sectionsEn,
          hasEn: Boolean(d.bodyEn),
          body: d.body,
          screenshot: d.screenshot,
          homepage: project?.homepage,
          short: d.short
            ? {
                template: d.short.template,
                duration: d.short.duration,
                media: d.short.media,
              }
            : undefined,
        }}
      />
    </PageContainer>
  );
}
