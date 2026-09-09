"use client";
/** vibelog 도메인 컴포넌트 — 핸드오프 components/vibelog/ 재구현.
 * 라벨은 전역 언어 설정을 따르고, 데이터 텍스트(제목 등)는 호출부가
 * <T>로 언어별 값을 넘긴다 (props가 ReactNode인 이유). */
import Link from "next/link";
import type { ReactNode } from "react";
import type { Project, RunLogLine } from "@/lib/content";
import { humanizeLastActive } from "@/lib/format";
import { useLang } from "./lang";
import { Card, MonoMeta, StatusBadge, statusStripe } from "./ui";

export function ProjectCard({ project }: { project: Project }) {
  const { lang } = useLang();
  const meta = [
    project.stack.join(" · ").toLowerCase(),
    project.weekCommits
      ? lang === "ko"
        ? `이번 주 커밋 ${project.weekCommits}`
        : `${project.weekCommits} commits this week`
      : null,
    humanizeLastActive(project.lastActivity, lang),
  ].filter(Boolean) as string[];
  return (
    <Card
      stripe={statusStripe(project.status)}
      dim={project.status === "paused"}
      className="relative flex h-full flex-col gap-2.5 px-5 py-[18px] transition-colors duration-150 hover:border-line-strong"
    >
      {/* 카드 전체 = 상세 링크(스트레치). "열기 ↗"만 z-10으로 위에 떠서 실제 외부 링크 */}
      <Link
        href={`/projects/${project.slug}`}
        aria-label={`${project.name} 상세 보기`}
        className="absolute inset-0 z-0 rounded-lg"
      />
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 truncate text-lg font-bold text-ink">
          {project.name}
        </h3>
        <StatusBadge status={project.status} />
      </div>
      {project.description && (
        <p className="m-0 text-base leading-[1.55] text-muted [text-wrap:pretty]">
          {lang === "en"
            ? (project.descriptionEn ?? project.description)
            : project.description}
        </p>
      )}
      <div className="mt-auto flex items-baseline gap-3 pt-0.5 font-mono text-2xs text-muted">
        <span className="min-w-0 flex-1 truncate">{meta.join(" · ")}</span>
        {project.homepage && (
          <a
            href={project.homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="hit relative z-10 whitespace-nowrap text-accent transition-opacity duration-150 hover:opacity-85"
          >
            {lang === "ko" ? "열기 ↗" : "open ↗"}
          </a>
        )}
      </div>
    </Card>
  );
}

export function RunLog({ lines }: { lines: RunLogLine[] }) {
  return (
    <Card inset className="flex flex-col px-5 py-[18px] font-mono text-[12.5px] leading-[1.9] text-muted">
      {lines.map((l, i) => {
        if (l.kind === "cmd") return <div key={i} className="text-ink">$ {l.text}</div>;
        if (l.kind === "fail")
          return (
            <div key={i}>
              <span className="text-danger">✗</span> {l.text}
            </div>
          );
        if (l.kind === "cur")
          return (
            <div key={i} className="text-accent">
              → {l.text}
              <span className="vl-blink">▍</span>
            </div>
          );
        return (
          <div key={i}>
            <span className="text-accent">✓</span> {l.text}
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
}: {
  href: string;
  date: ReactNode;
  repo?: string;
  title: ReactNode;
  summary?: ReactNode;
  meta: (string | { text: ReactNode; tone?: "warn" | "accent" | "soft" })[];
  last?: boolean;
}) {
  return (
    <Link href={href} className="group relative block pl-[22px]">
      {!last && (
        <div className="absolute bottom-[-28px] left-[3.5px] top-4 w-px bg-line" />
      )}
      <div className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-accent" />
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-2.5 font-mono text-xs text-muted">
          <span>{date}</span>
          {repo && <span className="text-ink-soft">{repo}</span>}
        </div>
        <h3 className="m-0 text-lg font-bold leading-[1.35] text-ink transition-colors duration-150 [text-wrap:pretty] group-hover:text-accent">
          {title}
        </h3>
        {summary && (
          <p className="m-0 text-base leading-relaxed text-muted [text-wrap:pretty]">
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
        <div className="text-md font-bold leading-snug text-ink [text-wrap:pretty]">
          {title}
        </div>
        <MonoMeta
          items={[...(repo ? [{ text: repo, tone: "soft" as const }] : []), ...meta]}
        />
      </div>
    </Link>
  );
}
