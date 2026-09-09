"use client";
/** 홈 프로젝트 섹션 — 5개 이상이면 building·live만 카드, 나머지는 접힌 목록 */
import Link from "next/link";
import { useState } from "react";
import type { Project } from "@/lib/content";
import { humanizeLastActive } from "@/lib/format";
import { Card, SectionHeader, StatusBadge, EmptyState } from "./ui";
import { ProjectCard } from "./vibelog";

export function HomeProjects({ projects }: { projects: Project[] }) {
  const [showRest, setShowRest] = useState(false);
  const active = projects.filter(
    (p) => p.status === "building" || p.status === "live",
  );
  const rest = projects.filter(
    (p) => p.status !== "building" && p.status !== "live",
  );
  const collapse = projects.length > 4 && rest.length > 0;
  const shown = collapse && !showRest ? active : projects;

  return (
    <section className="flex flex-col gap-3.5">
      <SectionHeader
        title="프로젝트"
        aside={projects.length > 4 ? `최근 활동순 · ${projects.length}` : undefined}
      />
      {projects.length === 0 ? (
        <EmptyState
          title="아직 등록된 프로젝트가 없습니다"
          body="GitHub 레포에 topic 하나를 달면 다음 23:00 실행에 카드가 생깁니다. 설명과 홈페이지는 레포 정보를 그대로 씁니다."
          hint="gh repo edit --add-topic vibelog"
        />
      ) : (
        <div
          className={`grid gap-3 md:grid-cols-2 ${
            projects.length > 6 ? "lg:grid-cols-2" : "lg:grid-cols-1"
          }`}
        >
          {shown.map((p) => (
            <ProjectCard key={p.slug} project={p} />
          ))}
        </div>
      )}
      {collapse && !showRest && (
        <Card className="p-0">
          {rest.map((p) => (
            <Link
              key={p.slug}
              href={`/projects/${p.slug}`}
              className="flex items-baseline gap-3 border-b border-line px-[18px] py-3 font-mono text-xs text-muted transition-colors duration-150 hover:bg-panel2"
            >
              <span className="min-w-0 flex-1 truncate font-sans text-base font-bold text-ink-soft">
                {p.name}
              </span>
              <StatusBadge status={p.status} />
              <span className="w-[52px] text-right">
                {humanizeLastActive(p.lastActivity)}
              </span>
            </Link>
          ))}
          <div className="px-2.5 py-2">
            <button
              type="button"
              onClick={() => setShowRest(true)}
              className="h-8 cursor-pointer rounded-sm px-3 text-sm font-bold text-muted transition-opacity duration-150 hover:opacity-85 active:scale-[.98]"
            >
              쉬는 프로젝트 {rest.length}개 카드로 펼치기
            </button>
          </div>
        </Card>
      )}
    </section>
  );
}
