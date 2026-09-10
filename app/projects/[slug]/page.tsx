import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/page-container";
import { T } from "@/components/lang";
import { Card, EmptyState, SectionHeader, StatusBadge } from "@/components/ui";
import { DevlogTimelineEntry, LastActive } from "@/components/vibelog";
import {
  fmtDate,
  getDevlogs,
  getProject,
  getProjects,
  humanizeLastActive,
} from "@/lib/content";
import { fmtNum } from "@/lib/format";

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
  const lastActiveEn = humanizeLastActive(project.lastActivity, "en");

  const facts: [string, React.ReactNode, React.ReactNode][] = [
    ["s", <T key="k1" ko="상태" en="status" />, <StatusBadge key="s" status={project.status} />],
    ["t", <T key="k2" ko="스택" en="stack" />, project.stack.join(" · ").toLowerCase() || "—"],
    ["c", <T key="k7" ko="누적 커밋" en="total commits" />, project.totalCommits != null ? fmtNum(project.totalCommits) : "—"],
    ["w", <T key="k3" ko="이번 주 커밋" en="commits this week" />, fmtNum(project.weekCommits ?? 0)],
    ["l", <T key="k4" ko="마지막 활동" en="last active" />, <LastActive key="v4" iso={project.lastActivity} />],
    ["d", <T key="k5" ko="데브로그" en="devlogs" />, <T key="v5" ko={`${logs.length}편`} en={String(logs.length)} />],
    ["b", <T key="k6" ko="시작일" en="started" />, logs.length ? logs[logs.length - 1].date : "—"],
  ];

  const head = (
    // 프로젝트 정보 블록은 카드로 — 아래 데브로그 타임라인과 딱 구분되게 (Jessi 지시)
    <Card className="p-5 lg:p-6">
      <section className="flex flex-col items-start gap-4 md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:gap-x-10 md:gap-y-4 lg:flex lg:flex-col">
      <div className="flex flex-col gap-3">
        <h1 className="m-0 text-xl font-bold tracking-[-.01em] text-accent lg:text-[26px]">
          {project.name}
        </h1>
        <p className="m-0 text-md leading-[1.6] text-ink-soft [text-wrap:pretty]">
          {project.description ? (
            <T
              ko={project.description}
              en={project.descriptionEn ?? project.description}
            />
          ) : (
            <T ko="설명이 아직 없습니다." en="No description yet." />
          )}
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
      <dl className="m-0 grid w-full grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2 border-t border-line pt-4 font-mono text-xs md:border-t-0 md:pt-0 lg:border-t lg:pt-4">
        {facts.map(([key, k, v]) => (
          <div key={key} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="m-0 text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      {project.stack.length === 0 && project.status === "idea" && (
        <EmptyState
          compact
          title={<T ko="아직 레포 정보가 비어 있습니다" en="Repo info is still empty" />}
          body={<T ko="description · homepage · language를 채우면 다음 실행에 카드가 채워집니다." en="Fill in description · homepage · language and the card fills in on the next run." />}
          hint={`gh repo edit ${project.slug} --description "…"`}
        />
      )}
      </section>
    </Card>
  );

  const timeline = (
    <section className="flex flex-col gap-3.5">
      <SectionHeader
        title={<T ko="데브로그" en="Devlog" />}
        // 개수는 위 사실 목록의 "데브로그"가 이미 말한다
        aside={logs.length ? <T ko="하루 한 글" en="one per day" /> : undefined}
      />
      {logs.length === 0 ? (
        <EmptyState
          title={
            project.status === "paused" ? (
              <T
                ko={`${lastActive}부터 조용해서 글이 없습니다`}
                en={`Quiet since ${lastActiveEn} — no posts`}
              />
            ) : (
              <T ko="아직 이 프로젝트의 글이 없습니다" en="No posts for this project yet" />
            )
          }
          body={
            <T
              ko="활동이 없는 날은 건너뜁니다. 커밋이 생기면 다음 23:00 실행에 첫 글이 올라옵니다. 커밋 본문에 '왜'를 쓰면 글이 덜 밍밍해집니다."
              en="Quiet days are skipped. Commit, and the first post goes up on the next 23:00 run. Writing the why in commit bodies makes posts less bland."
            />
          }
          hint={`git log --since=today ${project.slug}`}
        />
      ) : (
        <div className="flex flex-col gap-7">
          {logs.map((d, i) => (
            <DevlogTimelineEntry
              key={d.date}
              href={`/log/${d.repo}/${d.date}`}
              date={<T ko={fmtDate(d.date)} en={fmtDate(d.date, "en")} />}
              title={<T ko={d.title} en={d.titleEn ?? d.title} />}
              summary={
                d.summary ? (
                  <T ko={d.summary} en={d.summaryEn ?? d.summary} />
                ) : undefined
              }
              last={i === logs.length - 1}
              meta={[
                ...(d.commits
                  ? [
                      {
                        text: (
                          <T
                            ko={`커밋 ${d.commits}${d.prs ? ` · PR ${d.prs}` : ""}`}
                            en={`${d.commits} commit${d.commits === 1 ? "" : "s"}${d.prs ? ` · ${d.prs} PR${d.prs === 1 ? "" : "s"}` : ""}`}
                          />
                        ),
                      },
                    ]
                  : []),
                ...(d.hasFail
                  ? [{ text: <T ko="삽질" en="rabbit hole" />, tone: "warn" as const }]
                  : []),
                ...(d.short
                  ? [{ text: <T ko="쇼츠 ▶" en="short ▶" />, tone: "accent" as const }]
                  : []),
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
