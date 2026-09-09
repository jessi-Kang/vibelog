import { PageContainer } from "@/components/page-container";
import { HomeProjects } from "@/components/home-projects";
import { T } from "@/components/lang";
import { Card, EmptyState, SectionHeader } from "@/components/ui";
import { DevlogCompactEntry, RunLog } from "@/components/vibelog";
import {
  fmtShort,
  getDevlogs,
  getProjects,
  getRunLog,
  humanizeLastActive,
} from "@/lib/content";
import type { ReactNode } from "react";

const RECENT_MAX = 5;

/** ISO 시각 → "09.10 02:21" (KST) */
function fmtKstStamp(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCMonth() + 1)}.${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

function Fact({ n, label }: { n: number | string; label: ReactNode }) {
  const zero = n === 0 || n === "—";
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <b
        className={`font-sans text-md font-bold tabular-nums tracking-[-.01em] ${
          zero ? "text-muted" : "text-accent"
        }`}
      >
        {n}
      </b>
      <span>{label}</span>
    </span>
  );
}

export default function Home() {
  const projects = getProjects();
  const devlogs = getDevlogs();
  const run = getRunLog();

  const active = projects.filter(
    (p) => p.status === "building" || p.status === "live",
  ).length;
  const today = projects.filter(
    (p) => humanizeLastActive(p.lastActivity) === "오늘",
  ).length;

  const facts: [string, number | string, ReactNode][] =
    projects.length === 0
      ? [
          ["p", 0, "projects"],
          ["w", "—", <T key="w" ko="첫 실행 대기" en="waiting for first run" />],
        ]
      : [
          ["p", projects.length, "projects"],
          ["a", active, <T key="a" ko="만드는 중" en="building" />],
          ["t", today, <T key="t" ko="오늘 움직임" en="active today" />],
          ["d", devlogs.length, <T key="d" ko="데브로그" en="devlogs" />],
        ];

  const runSection = (
    <section className="flex flex-col gap-3.5">
      <SectionHeader
        title={<T ko="지난 실행" en="Last run" />}
        // 날짜·시각을 같은 KST 시계로 — UTC 날짜 + KST 시각이 섞여 하루 어긋나 보였다
        aside={run ? fmtKstStamp(run.at) : undefined}
      />
      {run ? (
        <RunLog lines={run.lines} />
      ) : devlogs.length > 0 ? (
        // 글은 있는데 실행 로그가 없는 과도기 — "기록 없음"이라고 하면 자기모순이 된다
        <EmptyState
          compact
          title={
            <T
              ko="실행 기록은 다음 자동 실행부터 남습니다"
              en="Run logs start with the next automatic run"
            />
          }
          body={
            <T
              ko={`지금 있는 글 ${devlogs.length}편은 파이프라인을 만드는 동안 발행됐습니다. 매일 23:00 KST 실행부터 여기에 기록이 쌓입니다.`}
              en={`The ${devlogs.length} posts here were published while the pipeline was being built. Records accumulate from the nightly 23:00 KST run.`}
            />
          }
        />
      ) : (
        <EmptyState
          compact
          title={
            <T ko="아직 실행 기록이 없습니다" en="No run records yet" />
          }
          body={
            <T
              ko="매일 23:00 KST에 자동으로 돌고, 지금 바로 돌릴 수도 있습니다."
              en="Runs automatically at 23:00 KST daily — or trigger one right now."
            />
          }
          hint="gh workflow run devlog.yml"
        />
      )}
    </section>
  );

  const recentSection = (
    <section className="flex flex-col gap-3.5">
      <SectionHeader
        title={<T ko="최근 데브로그" en="Recent devlogs" />}
        aside={devlogs.length ? <T ko="전체 →" en="all →" /> : undefined}
        href="/log"
      />
      {devlogs.length === 0 ? (
        <EmptyState
          compact
          title={<T ko="아직 글이 없습니다" en="No posts yet" />}
          body={
            <T
              ko="topic이 달린 레포에 커밋이 생기면 그날 밤 첫 글이 올라옵니다. 활동 없는 날은 건너뜁니다."
              en="Commit to a repo with the topic, and the first post goes up that night. Quiet days are skipped."
            />
          }
        />
      ) : (
        <Card className="p-0">
          {devlogs.slice(0, RECENT_MAX).map((d, i, a) => (
            <DevlogCompactEntry
              key={`${d.repo}/${d.date}`}
              href={`/log/${d.repo}/${d.date}`}
              date={fmtShort(d.date)}
              repo={d.repo}
              title={<T ko={d.title} en={d.titleEn ?? d.title} />}
              last={i === a.length - 1}
              meta={[
                ...(d.commits
                  ? [
                      {
                        text: (
                          <T
                            ko={`커밋 ${d.commits}${d.prs ? ` · PR ${d.prs}` : ""}`}
                            en={`${d.commits} commits${d.prs ? ` · ${d.prs} PRs` : ""}`}
                          />
                        ),
                      },
                    ]
                  : []),
                ...(d.hasFail
                  ? [
                      {
                        text: <T ko="삽질" en="rabbit hole" />,
                        tone: "warn" as const,
                      },
                    ]
                  : []),
              ]}
            />
          ))}
        </Card>
      )}
    </section>
  );

  return (
    <PageContainer>
      {/* 마스트헤드 */}
      {/* 통계 줄은 전 구간 동일 — 제목 아래 왼쪽 정렬 + 위 구분선 (Jessi 지시) */}
      <section className="grid items-end gap-4 pt-1 md:gap-5 md:pt-3 lg:pb-2 lg:pt-5">
        <div className="flex flex-col gap-2 md:gap-3">
          <h1 className="m-0 max-w-[22ch] text-[24px] font-bold leading-[1.25] tracking-[-.015em] [text-wrap:balance] md:text-[28px] lg:text-[34px]">
            <T
              ko={
                <>
                  만들고 있는 것들의 <span className="text-accent">기록</span>
                </>
              }
              en={
                <>
                  A <span className="text-accent">record</span> of things being
                  built
                </>
              }
            />
          </h1>
          <p className="m-0 text-md leading-relaxed text-muted [text-wrap:pretty] md:whitespace-nowrap md:text-[16px]">
            <T
              ko="바이브 코딩으로 만드는 서비스들의 제작기. 데브로그는 매일 밤 커밋에서 자동으로 만들어집니다."
              en="Build logs of vibe-coded services. Devlogs are generated automatically from commits, every night."
            />
          </p>
        </div>
        <div className="flex flex-wrap gap-5 border-t border-line pt-3.5 font-mono text-xs leading-snug text-muted">
          {facts.map(([k, n, l]) => (
            <Fact key={k} n={n} label={l} />
          ))}
        </div>
      </section>

      {/* 모바일 세로 스택 → 태블릿(실행|데브로그 2열) → 데스크톱(프로젝트 ｜ 우측 스택) */}
      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-2 lg:items-start lg:gap-10">
        <HomeProjects projects={projects} />
        {/* md:items-start는 md 2열 그리드용 — lg 세로 flex에서는 stretch로 되돌려야 카드 폭이 열에 맞는다 */}
        <div className="flex flex-col gap-10 md:grid md:grid-cols-2 md:items-start md:gap-6 lg:flex lg:flex-col lg:items-stretch lg:gap-12">
          {runSection}
          {recentSection}
        </div>
      </div>
    </PageContainer>
  );
}
