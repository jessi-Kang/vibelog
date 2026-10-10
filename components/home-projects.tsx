"use client";
/**
 * 홈 프로젝트 섹션 — 5개 이상이면 최근 7일 안에 커밋이 있는 것만 카드, 나머지는 접힌 목록.
 *
 * 처음엔 상태값(building·live만 카드)으로 갈랐다. 그러자 preview(배포했고 정식 공개 전)가
 * 통째로 "쉬는 프로젝트"로 접혔다 — 오늘 커밋 49개인 lie-detective와 어제 커밋한 apart가
 * 접히고, 2주 넘게 커밋이 없는 building 셋이 펼쳐졌다 (10/10 Jessi 지적). building은
 * "배포 주소 없고 30일 안에 푸시"라 쉬어도 한 달은 building이고, 배포한 프로젝트는
 * 아무리 쉬어도 paused가 되지 않는다. 그래서 접는 기준을 상태값에서 떼어 최근 활동으로
 * 본다. 7일은 홈 통계 줄의 "이번 주"와 같은 창(오늘 포함 7일, KST)이다.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { activeThisWeek, todayKst } from "@/lib/commit-hours";
import type { Project } from "@/lib/content";
import { humanizeLastActive } from "@/lib/format";
import { useLang } from "./lang";
import { Card, SectionHeader, StatusBadge, EmptyState } from "./ui";
import { ProjectCard } from "./vibelog";

export function HomeProjects({
  projects,
  buildDate,
}: {
  projects: Project[];
  /** 빌드한 날(KST) — 첫 화면은 이 날짜로 갈라 서버·브라우저가 같게 그린다 */
  buildDate: string;
}) {
  const { lang } = useLang();
  const [showRest, setShowRest] = useState(false);
  // 페이지는 빌드 때 만들어진다. 며칠 빌드가 없으면 그사이 7일을 넘긴 프로젝트가
  // 펼쳐진 채 남으므로, 화면이 뜬 뒤 방문자의 오늘로 다시 가른다
  const [today, setToday] = useState(buildDate);
  useEffect(() => setToday(todayKst()), []);
  const active = projects.filter((p) => activeThisWeek(p.lastActivity, today));
  const rest = projects.filter((p) => !activeThisWeek(p.lastActivity, today));
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
        // grid-cols-1을 기본에 박아 둔다 — 없으면 암묵적 열이 auto라 카드의
        // max-content(스택 줄 전체)만큼 넓어진다. truncate는 폭이 제한될 때만
        // 먹는다. 프로젝트 둘일 때는 스택 줄이 짧아 우연히 맞았고, Anchor의
        // 스택 여덟 개가 들어오자 320px 화면에서 카드가 616px로 벌어져 홈이
        // 가로로 300px 넘쳤다 (9/20 실측). minmax(0,1fr)이 폭을 화면에 묶는다.
        <div
          className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${
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
