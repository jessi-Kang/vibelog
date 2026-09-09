import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/page-container";
import { EmptyState, SectionHeader, StatusBadge } from "@/components/ui";
import { DevlogTimelineEntry } from "@/components/vibelog";
import {
  fmtDate,
  getDevlogs,
  getProject,
  getProjects,
  humanizeLastActive,
} from "@/lib/content";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: getProject(slug)?.name ?? slug };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const logs = getDevlogs(project.slug);
  const lastActive = humanizeLastActive(project.lastActivity);

  const facts: [string, React.ReactNode][] = [
    ["상태", <StatusBadge key="s" status={project.status} />],
    ["스택", project.stack.join(" · ").toLowerCase() || "—"],
    ["이번 주 커밋", String(project.weekCommits ?? 0)],
    ["마지막 활동", lastActive],
    ["데브로그", `${logs.length}편`],
    ["시작일", logs.length ? logs[logs.length - 1].date : "—"],
  ];

  const head = (
    <section className="flex flex-col items-start gap-4 md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:gap-x-10 md:gap-y-4 lg:flex lg:flex-col">
      <div className="flex flex-col gap-3">
        <h1 className="m-0 text-xl font-bold tracking-[-.01em] text-accent lg:text-[26px]">
          {project.name}
        </h1>
        <p className="m-0 text-md leading-[1.6] text-ink-soft [text-wrap:pretty]">
          {project.description || "설명이 아직 없습니다."}
        </p>
        {project.homepage && (
          <a
            href={project.homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-accent transition-opacity duration-150 hover:opacity-85"
          >
            {project.homepage.replace(/^https?:\/\//, "").replace(/\/$/, "")} ↗
          </a>
        )}
      </div>
      <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2 font-mono text-xs">
        {facts.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="m-0 text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      {project.stack.length === 0 && project.status === "idea" && (
        <EmptyState
          compact
          title="아직 레포 정보가 비어 있습니다"
          body="description · homepage · language를 채우면 다음 실행에 카드가 채워집니다."
          hint={`gh repo edit ${project.slug} --description "…"`}
        />
      )}
    </section>
  );

  const timeline = (
    <section className="flex flex-col gap-3.5">
      <SectionHeader
        title="데브로그"
        aside={logs.length ? `${logs.length}편 · 하루 한 글` : undefined}
      />
      {logs.length === 0 ? (
        <EmptyState
          title={
            project.status === "paused"
              ? `${lastActive}부터 조용해서 글이 없습니다`
              : "아직 이 프로젝트의 글이 없습니다"
          }
          body="활동이 없는 날은 건너뜁니다. 커밋이 생기면 다음 23:00 실행에 첫 글이 올라옵니다. 커밋 본문에 '왜'를 쓰면 글이 덜 밍밍해집니다."
          hint={`git log --since=today ${project.slug}`}
        />
      ) : (
        <div className="flex flex-col gap-7">
          {logs.map((d, i) => (
            <DevlogTimelineEntry
              key={d.date}
              href={`/log/${d.repo}/${d.date}`}
              date={fmtDate(d.date)}
              title={d.title}
              summary={d.summary}
              last={i === logs.length - 1}
              meta={[
                ...(d.commits
                  ? [`커밋 ${d.commits}${d.prs ? ` · PR ${d.prs}` : ""}`]
                  : []),
                ...(d.hasFail ? [{ text: "삽질", tone: "warn" as const }] : []),
                ...(d.short ? [{ text: "쇼츠 ▶", tone: "accent" as const }] : []),
              ]}
            />
          ))}
        </div>
      )}
    </section>
  );

  return (
    <PageContainer>
      <div className="contents lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start lg:gap-12">
        <div className="contents lg:sticky lg:top-[90px] lg:block">{head}</div>
        {timeline}
      </div>
    </PageContainer>
  );
}
