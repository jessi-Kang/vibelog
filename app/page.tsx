import { PageContainer } from "@/components/page-container";
import { HomeProjects } from "@/components/home-projects";
import { Card, EmptyState, SectionHeader } from "@/components/ui";
import { DevlogCompactEntry, RunLog } from "@/components/vibelog";
import {
  fmtShort,
  getDevlogs,
  getProjects,
  getRunLog,
  humanizeLastActive,
} from "@/lib/content";

const RECENT_MAX = 5;

function Fact({ n, label }: { n: number | string; label: string }) {
  const zero = n === 0 || n === "—";
  return (
    <span className="inline-flex items-baseline gap-1.5 lg:flex-col lg:items-end lg:gap-0.5">
      <b
        className={`font-sans text-md font-bold tracking-[-.01em] lg:text-xl ${
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

  const facts: [number | string, string][] =
    projects.length === 0
      ? [
          [0, "projects"],
          ["—", "첫 실행 대기"],
        ]
      : [
          [projects.length, "projects"],
          [active, "만드는 중"],
          [today, "오늘 움직임"],
          [devlogs.length, "데브로그"],
        ];

  const runSection = (
    <section className="flex flex-col gap-3.5">
      <SectionHeader
        title="지난 실행"
        aside={
          run
            ? `${fmtShort(run.at.slice(0, 10))} ${new Date(run.at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" })}`
            : undefined
        }
      />
      {run ? (
        <RunLog lines={run.lines} />
      ) : (
        <EmptyState
          compact
          title="아직 실행 기록이 없습니다"
          body="매일 23:00 KST에 자동으로 돌고, 지금 바로 돌릴 수도 있습니다."
          hint="gh workflow run devlog.yml"
        />
      )}
    </section>
  );

  const recentSection = (
    <section className="flex flex-col gap-3.5">
      <SectionHeader
        title="최근 데브로그"
        aside={devlogs.length ? "전체 →" : undefined}
        href="/log"
      />
      {devlogs.length === 0 ? (
        <EmptyState
          compact
          title="아직 글이 없습니다"
          body="topic이 달린 레포에 커밋이 생기면 그날 밤 첫 글이 올라옵니다. 활동 없는 날은 건너뜁니다."
        />
      ) : (
        <Card className="p-0">
          {devlogs.slice(0, RECENT_MAX).map((d, i, a) => (
            <DevlogCompactEntry
              key={`${d.repo}/${d.date}`}
              href={`/log/${d.repo}/${d.date}`}
              date={fmtShort(d.date)}
              repo={d.repo}
              title={d.title}
              last={i === a.length - 1}
              meta={[
                ...(d.commits
                  ? [`커밋 ${d.commits}${d.prs ? ` · PR ${d.prs}` : ""}`]
                  : []),
                ...(d.sections.fail &&
                !d.sections.fail.startsWith("특별한 삽질은")
                  ? [{ text: "삽질", tone: "warn" as const }]
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
      <section className="grid items-end gap-4 pt-1 md:gap-5 md:pt-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-10 lg:pb-2 lg:pt-5">
        <div className="flex flex-col gap-2 md:gap-3">
          <h1 className="m-0 max-w-[22ch] text-[24px] font-bold leading-[1.25] tracking-[-.015em] [text-wrap:balance] md:text-[28px] lg:text-[34px]">
            만들고 있는 것들의 <span className="text-accent">기록</span>
          </h1>
          <p className="m-0 text-md leading-relaxed text-muted [text-wrap:pretty] md:whitespace-nowrap md:text-[16px]">
            바이브 코딩으로 만드는 서비스들의 제작기. 데브로그는 매일 밤 커밋에서
            자동으로 만들어집니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-5 border-t border-line pt-3.5 font-mono text-xs leading-snug text-muted lg:justify-end lg:gap-7 lg:border-t-0 lg:pt-0">
          {facts.map(([n, l]) => (
            <Fact key={l} n={n} label={l} />
          ))}
        </div>
      </section>

      {/* 모바일 세로 스택 → 태블릿(실행|데브로그 2열) → 데스크톱(프로젝트 ｜ 우측 스택) */}
      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-2 lg:items-start lg:gap-10">
        <HomeProjects projects={projects} />
        <div className="flex flex-col gap-10 md:grid md:grid-cols-2 md:items-start md:gap-6 lg:flex lg:flex-col lg:gap-12">
          {runSection}
          {recentSection}
        </div>
      </div>
    </PageContainer>
  );
}
