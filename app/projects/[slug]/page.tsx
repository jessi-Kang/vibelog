import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { projectColor } from "@/lib/project-color";
import { ProjectIcon } from "@/components/project-icon";
import { PageContainer } from "@/components/page-container";
import { T } from "@/components/lang";
import { Card, EmptyState, SectionHeader, ShortMark, StatusBadge } from "@/components/ui";
import { DevlogTimelineEntry } from "@/components/vibelog";
import { LiveLastActive, LiveRepoStat } from "@/components/live-stats";
import {
  fmtDate,
  getDevlogs,
  getProject,
  getProjects,
  humanizeLastActive,
} from "@/lib/content";
import { postPath } from "@/lib/post-id";
import { publicHomepage } from "@/lib/public-homepage";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p) return { title: slug };
  return {
    title: p.name,
    description: p.description,
    alternates: { canonical: `/projects/${slug}` },
    openGraph: { url: `/projects/${slug}`, title: p.name, description: p.description },
    // 부모의 twitter 태그를 덮어쓴다 (안 적으면 프로젝트명 대신 사이트 이름이 뜬다)
    twitter: {
      card: "summary_large_image",
      title: p.name,
      description: p.description,
    },
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const logs = getDevlogs(project.slug);
  // 소개 글은 그날 한 일이 아니라 숫자에 넣지 않는다 — 나중에 넣은 소개 글은 날짜도 첫 글 하루 전으로 지어 붙인 것이다
  const dayLogs = logs.filter((d) => !d.intro);
  const intro = logs.find((d) => d.intro);
  const homepage = publicHomepage(project);
  const lastActive = humanizeLastActive(project.lastActivity);
  const lastActiveEn = humanizeLastActive(project.lastActivity, "en");

  const facts: [string, React.ReactNode, React.ReactNode][] = [
    ["s", <T key="k1" ko="상태" en="status" />, <StatusBadge key="s" status={project.status} />],
    ["t", <T key="k2" ko="스택" en="stack" />, project.stack.join(" · ").toLowerCase() || "—"],
    ["c", <T key="k7" ko="누적 커밋" en="total commits" />, <LiveRepoStat key="v7" slug={project.slug} kind="total" fallback={project.totalCommits} />],
    ["w", <T key="k3" ko="이번 주 커밋" en="commits this week" />, <LiveRepoStat key="v3" slug={project.slug} kind="week" fallback={project.weekCommits ?? 0} />],
    ["l", <T key="k4" ko="마지막 활동" en="last active" />, <LiveLastActive key="v4" slug={project.slug} iso={project.lastActivity} />],
    ["d", <T key="k5" ko="데브로그" en="devlogs" />, <T key="v5" ko={`${dayLogs.length}편`} en={String(dayLogs.length)} />],
    ["b", <T key="k6" ko="시작일" en="started" />, dayLogs.length ? dayLogs[dayLogs.length - 1].date : "—"],
  ];

  const head = (
    // 프로젝트 정보 블록은 카드로 — 아래 데브로그 타임라인과 딱 구분되게 (Jessi 지시)
    <Card className="p-5 lg:p-6">
      <section className="flex flex-col items-start gap-4 md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:gap-x-10 md:gap-y-4 lg:flex lg:flex-col">
      {/* 칸 폭을 다 쓴다 — 바깥이 items-start라, 설명이 짧으면 이 칸이 글자만큼 좁아져 아이콘이 오른쪽 끝에 못 갔다 */}
      <div className="flex flex-col gap-3 self-stretch">
        {/* 아이콘은 오른쪽 위, 이름 첫 줄과 높이를 맞춘다 (시안 docs/project-icons.html B안) */}
        <div className="flex items-start justify-between gap-3">
          <h1 className="m-0 text-xl font-bold tracking-[-.01em] text-accent lg:text-[26px]">
            <T ko={project.name} en={project.nameEn ?? project.name} />
          </h1>
          <ProjectIcon
            icon={project.icon}
            className="mt-0.5 lg:mt-1"
            style={{ color: projectColor(project.slug) }}
          />
        </div>
        {project.name !== project.slug && (
          <span className="-mt-2 font-mono text-xs text-muted">{project.slug}</span>
        )}
        {/* 소개 글이 코드를 읽고 쓴 설명이 있으면 그것을, 없으면 레포 설명 한 줄 (docs/project-page-intro.html A안) */}
        <p className="m-0 text-md leading-[1.6] text-ink-soft [text-wrap:pretty]">
          {project.about ? (
            <T ko={project.about} en={project.aboutEn ?? project.about} />
          ) : project.description ? (
            <T
              ko={project.description}
              en={project.descriptionEn ?? project.description}
            />
          ) : (
            <T ko="설명이 아직 없습니다." en="No description yet." />
          )}
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          {intro && (
            <Link
              href={postPath(intro)}
              className="hit font-mono text-sm transition-opacity duration-150 hover:opacity-85"
              style={{ color: projectColor(project.slug) }}
            >
              <T ko="소개 글 읽기 →" en="Read the intro →" />
            </Link>
          )}
          {homepage && (
            <a
              href={homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm text-accent transition-opacity duration-150 hover:opacity-85"
            >
              {homepage.replace(/^https?:\/\//, "").replace(/\/$/, "")} ↗
            </a>
          )}
          {/* 레포 링크는 주소 대신 간결하게 (Jessi 지시) — 배포 주소보다 한 톤 낮게 */}
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hit font-mono text-sm text-muted transition-colors duration-150 hover:text-ink"
          >
            github ↗
          </a>
        </div>
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
          // 첫 글은 소개 글이다 (scripts/intro.ts) — "커밋이 생기면 첫 글"이던 안내는 그 전의 규칙이었다
          body={
            <T
              ko="첫 글은 이 프로젝트를 소개하는 글입니다. 레포에 코드가 올라오면 그날 밤 23:00 실행이 코드를 읽고 씁니다. 그다음부터는 본문을 쓴 커밋이 5개 모인 밤마다 그날 한 일이 글로 올라옵니다."
              en="The first post introduces this project. Once code lands in the repo, the 23:00 run that night reads it and writes the intro. After that, a post goes up on each night that gathers 5 commits with a written body."
            />
          }
        />
      ) : (
        <div className="flex flex-col gap-7">
          {logs.map((d, i) => (
            <DevlogTimelineEntry
              key={d.date}
              href={postPath(d)}
              date={<T ko={fmtDate(d.date)} en={fmtDate(d.date, "en")} />}
              title={<T ko={d.title} en={d.titleEn ?? d.title} />}
              summary={
                d.summary ? (
                  <T ko={d.summary} en={d.summaryEn ?? d.summary} />
                ) : undefined
              }
              last={i === logs.length - 1}
              hollow={d.intro}
              meta={[
                ...(d.intro ? [{ text: <T ko="프로젝트 소개" en="project intro" />, tone: "soft" as const }] : []),
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
                  ? [{ text: <T ko={<ShortMark label="쇼츠 있음" />} en={<ShortMark label="has short" />} /> }]
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
