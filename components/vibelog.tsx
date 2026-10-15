"use client";
/** vibelog 도메인 컴포넌트 — 핸드오프 components/vibelog/ 재구현.
 * 라벨은 전역 언어 설정을 따르고, 데이터 텍스트(제목 등)는 호출부가
 * <T>로 언어별 값을 넘긴다 (props가 ReactNode인 이유). */
import Link from "next/link";
import type { ReactNode } from "react";
import type { Project, RunLogLine } from "@/lib/content";
import { publicHomepage } from "@/lib/public-homepage";
import { humanizeLastActive } from "@/lib/format";
import { projectColor } from "@/lib/project-color";
import { T, useLang } from "./lang";
import { projectIconOf, projectName } from "@/lib/project-name";
import { ProjectIcon } from "./project-icon";
import { Card, MonoMeta, StatusBadge } from "./ui";

export function ProjectCard({ project }: { project: Project }) {
  const { lang } = useLang();
  // 이번 주 커밋은 홈 통계 줄과 인접 중복이라 뺐다 — 상세의 사실 목록에 있다
  const meta = [
    project.stack.join(" · ").toLowerCase(),
    humanizeLastActive(project.lastActivity, lang),
  ].filter(Boolean) as string[];
  return (
    <Card
      dim={project.status === "paused"}
      className="relative flex h-full flex-col gap-2.5 px-5 py-[18px] transition-colors duration-150 hover:border-line-strong"
    >
      {/* 카드 전체 = 상세 링크(스트레치). "열기 ↗"만 그 위로 떠서 실제 외부 링크.
          **z는 카드 안에서만 다투는 값이다 (z-[1])** — z-10으로 뒀더니 고정
          탭바(같은 z-10)와 같은 층에서 DOM 순서로 이겨, 카드가 탭바 위로
          올라와 "소개" 자리에 "열기 ↗"가 겹쳐 찍혔다. 층 순서는
          components/shell.tsx 위쪽 주석에 적어 뒀다 */}
      <Link
        href={`/projects/${project.slug}`}
        aria-label={`${project.name} 상세 보기`}
        className="absolute inset-0 z-0 rounded-lg"
      />
      {/* 아이콘 + 서비스 이름 (docs/project-icon-places.html ①). 레포 이름은 홈에서 뺐다 —
          GitHub에서 찾아갈 이름은 프로젝트 페이지에 있다 (10/11). 상태는 맨 아래 줄 맨 앞으로 내렸다 —
          카드 위의 상태색 띠가 흔한 AI 디자인처럼 보여서 뺐고, 이름 줄은 이름만 둔다 (10/11, C안) */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="m-0 flex min-w-0 items-center gap-2 text-lg font-semibold text-ink">
            <ProjectIcon icon={project.icon} size={20} style={{ color: projectColor(project.slug) }} />
            <span className="truncate">
              {lang === "en" ? (project.nameEn ?? project.name) : project.name}
            </span>
          </h3>
        </div>
      </div>
      {project.description && (
        <p className="m-0 text-base leading-[1.55] text-muted [text-wrap:pretty]">
          {lang === "en"
            ? (project.descriptionEn ?? project.description)
            : project.description}
        </p>
      )}
      <div className="mt-auto flex items-baseline gap-3 pt-0.5 font-sans text-xs tabular-nums text-muted">
        <StatusBadge status={project.status} />
        <span className="min-w-0 flex-1 truncate">{meta.join(" · ")}</span>
        {publicHomepage(project) && (
          <a
            href={publicHomepage(project)}
            target="_blank"
            rel="noopener noreferrer"
            className="hit relative z-[1] whitespace-nowrap text-accent transition-opacity duration-150 hover:opacity-85"
          >
            {lang === "ko" ? "열기 ↗" : "open ↗"}
          </a>
        )}
      </div>
    </Card>
  );
}

/** "generate · vibelog/2026-09-10.md" — 여러 프로젝트가 섞이는 실행에서
 * 어느 프로젝트의 줄인지 한눈에 갈리게, "· 레포/" 의 레포 이름만 띄운다 */
function emphasizeRepo(text: string): ReactNode {
  const m = text.match(/^(.*· )([A-Za-z0-9._-]+)(\/.*)$/);
  if (!m) return text;
  return (
    <>
      {m[1]}
      <span className="font-medium text-ink">{m[2]}</span>
      {m[3]}
    </>
  );
}

/** "오늘/어제/N일 전"을 방문 시점 기준으로 — 정적 빌드 값은 자정이 지나면
 * 어긋난다 ("오늘 커밋"과 같은 문제). 서버 렌더 값과 다를 수 있어 경고 억제. */
export function LastActive({ iso }: { iso: string }) {
  const { lang } = useLang();
  return (
    <span suppressHydrationWarning>{humanizeLastActive(iso, lang)}</span>
  );
}

export function RunLog({ lines }: { lines: RunLogLine[] }) {
  const { lang } = useLang();
  const pick = (l: RunLogLine) =>
    emphasizeRepo(lang === "en" ? (l.textEn ?? l.text) : l.text);
  return (
    <Card inset className="flex flex-col px-5 py-[18px] font-mono text-[12.5px] leading-[1.9] text-muted">
      {lines.map((l, i) => {
        if (l.kind === "cmd") return <div key={i} className="text-ink">$ {pick(l)}</div>;
        if (l.kind === "fail")
          return (
            <div key={i}>
              <span className="text-danger">✗</span> {pick(l)}
            </div>
          );
        if (l.kind === "cur")
          return (
            <div key={i} className="text-accent">
              → {pick(l)}
              <span className="vl-blink">▍</span>
            </div>
          );
        return (
          <div key={i}>
            <span className="text-accent">✓</span> {pick(l)}
          </div>
        );
      })}
    </Card>
  );
}

/** 타임라인 변형 — 점 + 세로선 */
export function DevlogTimelineEntry({
  href,
  date,
  repo,
  title,
  summary,
  meta,
  last,
  hollow,
}: {
  href: string;
  date: ReactNode;
  repo?: string;
  title: ReactNode;
  summary?: ReactNode;
  meta: (string | { text: ReactNode; tone?: "warn" | "accent" | "soft" })[];
  last?: boolean;
  /** 빈 점 — 그날 한 일이 아닌 글(프로젝트 소개 글)을 하루 글과 구분한다 */
  hollow?: boolean;
}) {
  return (
    // 전체 피드(repo 있음)는 타임라인 점을 프로젝트 식별색으로 — 이름도 같은
    // 색이라 점만 봐도 구분된다 (…).
    // 프로젝트 상세 타임라인(repo 없음)은 기존 민트 점.
    <Link href={href} className="group relative block pl-[22px]">
      {!last && (
        <div className="absolute bottom-[-28px] left-[3.5px] top-4 w-px bg-line" />
      )}
      <div
        className={`absolute left-0 top-1.5 h-2 w-2 rounded-full ${hollow ? "border-2 border-accent bg-bg" : "bg-accent"}`}
        style={
          repo
            ? hollow
              ? { borderColor: projectColor(repo) }
              : { background: projectColor(repo) }
            : undefined
        }
      />
      <div className="flex flex-col gap-1.5">
        {/* 프로젝트 이름은 색만 — 굵게까지 하면 제목과 힘을 다툰다. 한글이 들어 있어 한글 글꼴로 */}
        <div className="flex gap-2.5 font-sans text-xs tabular-nums text-muted">
          {repo && <ProjectTag repo={repo} />}
          <span>{date}</span>
        </div>
        <h3 className="m-0 text-lg font-semibold leading-[1.35] text-ink transition-colors duration-150 [text-wrap:pretty] group-hover:text-accent">
          {title}
        </h3>
        {/* 요약은 라이트(300) — 제목 600과 세 단계 차이로 한 발 물러난다 (10/11) */}
        {summary && (
          <p className="m-0 text-base font-light leading-relaxed text-ink-soft [text-wrap:pretty]">
            {summary}
          </p>
        )}
        <MonoMeta items={meta} />
      </div>
    </Link>
  );
}

/** compact 변형 — 카드 안 행 목록 (홈 최근 데브로그) */
export function DevlogCompactEntry({
  href,
  date,
  repo,
  title,
  meta,
  last,
}: {
  href: string;
  date: ReactNode;
  repo?: string;
  title: ReactNode;
  meta: (string | { text: ReactNode; tone?: "warn" | "accent" | "soft" })[];
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3.5 px-[18px] py-3.5 transition-colors duration-150 hover:bg-panel2 ${
        last ? "" : "border-b border-line"
      }`}
    >
      <div className="pt-0.5 font-mono text-2xs leading-relaxed text-muted">
        {date}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="text-md font-medium leading-snug text-ink [text-wrap:pretty]">
          {title}
        </div>
        {/* 프로젝트 이름은 전체 피드와 같은 식별색 — 여러 프로젝트가 섞인 목록에서 색만 봐도 구분된다 */}
        <MonoMeta
          items={[
            ...(repo
              ? [
                  {
                    text: <ProjectTag repo={repo} />,
                  },
                ]
              : []),
            ...meta,
          ]}
        />
      </div>
    </Link>
  );
}

/** 글 목록의 프로젝트 이름 — 앞에 작은 프로젝트 아이콘, 둘 다 프로젝트 색 (10/11, 시안 A안) */
function ProjectTag({ repo }: { repo: string }) {
  return (
    <span className="inline-flex items-center gap-1" style={{ color: projectColor(repo) }}>
      <ProjectIcon icon={projectIconOf(repo)} size={12} />
      <T ko={projectName(repo)} en={projectName(repo, true)} />
    </span>
  );
}
