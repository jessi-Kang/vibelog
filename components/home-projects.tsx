"use client";
/** 홈 프로젝트 섹션 — 5개 이상이면 building·live만 카드, 나머지는 접힌 목록 */
import Link from "next/link";
import { useState } from "react";
import type { Project } from "@/lib/content";
import { humanizeLastActive } from "@/lib/format";
import { useLang } from "./lang";
import { Card, SectionHeader, StatusBadge, EmptyState } from "./ui";
import { ProjectCard } from "./vibelog";

export function HomeProjects({ projects }: { projects: Project[] }) {
  const { lang } = useLang();
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
        title={lang === "ko" ? "프로젝트" : "Projects"}
        aside={
          projects.length > 4
            ? lang === "ko"
              ? `최근 활동순 · ${projects.length}`
              : `by recent activity · ${projects.length}`
            : undefined
        }
      />
      {projects.length === 0 ? (
        <EmptyState
          title={lang === "ko" ? "아직 등록된 프로젝트가 없습니다" : "No projects registered yet"}
          body={
            lang === "ko"
              ? "GitHub 레포에 topic 하나를 달면 다음 23:00 실행에 카드가 생깁니다. 설명과 홈페이지는 레포 정보를 그대로 씁니다."
              : "Add one topic to a GitHub repo and a card appears on the next 23:00 run. Description and homepage come straight from the repo."
          }
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
                {humanizeLastActive(p.lastActivity, lang)}
              </span>
            </Link>
          ))}
          <div className="px-2.5 py-2">
            <button
              type="button"
              onClick={() => setShowRest(true)}
              className="h-8 cursor-pointer rounded-sm px-3 text-sm font-bold text-muted transition-opacity duration-150 hover:opacity-85 active:scale-[.98]"
            >
              {lang === "ko"
                ? `쉬는 프로젝트 ${rest.length}개 카드로 펼치기`
                : `Show ${rest.length} paused ${rest.length === 1 ? "project" : "projects"} as cards`}
            </button>
          </div>
        </Card>
      )}
      {/* 핵심 동작 안내 — 카드가 어떻게 늘어나는지 사이트 안에서 알 수 있게 (Jessi 지시) */}
      {projects.length > 0 && (
        <p className="m-0 px-1 font-mono text-2xs leading-relaxed text-muted">
          {lang === "ko"
            ? "새 프로젝트 등록은 레포에 topic ‘vibelog’ 하나가 전부입니다. 커밋하면 그날 밤 글과 영상이 자동으로 올라오고, 배포 주소를 채우면 live로 표시됩니다."
            : "Registering a project takes one repo topic: ‘vibelog’. Commit, and a post and video go up that night. Add a deploy URL and it shows as live."}
        </p>
      )}
    </section>
  );
}
