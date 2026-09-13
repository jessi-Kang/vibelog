"use client";
/**
 * 쇼츠 페이지 — 프로젝트 구분 필터 + 그리드.
 *
 * 필터는 데브로그 피드와 **같은 컴포넌트**를 쓴다 (`project-filter.tsx`).
 * 두 화면에서 같은 물건이 같게 동작해야 한다.
 *
 * 채널 인트로 카드는 "전체"일 때만 붙인다 — 어느 프로젝트의 쇼츠도 아니라서,
 * 한 프로젝트를 골라 놓고 인트로가 섞여 나오면 그 프로젝트 것으로 읽힌다.
 */
import { useState } from "react";
import { useLang } from "./lang";
import { ProjectFilter, type FilterProject } from "./project-filter";
import { ShortsGrid } from "./shorts-grid";
import { EmptyState, SectionHeader } from "./ui";
import type { ShortsMeta } from "@/lib/content";

export function ShortsClient({
  shorts,
  projects,
  introSrc,
  introEnSrc,
}: {
  shorts: ShortsMeta[];
  /** 쇼츠가 **있는** 프로젝트만. 고를 수 없는 칩은 두지 않는다 */
  projects: FilterProject[];
  introSrc?: string;
  introEnSrc?: string;
}) {
  const { lang } = useLang();
  const en = lang === "en";
  const [filter, setFilter] = useState("all");

  const counts: Record<string, number> = { all: shorts.length };
  for (const s of shorts) counts[s.repo] = (counts[s.repo] ?? 0) + 1;
  const list = shorts.filter((s) => filter === "all" || s.repo === filter);
  const proj = projects.find((p) => p.slug === filter);

  return (
    <section className="flex flex-col gap-3.5">
      <SectionHeader
        title={en ? "Shorts" : "쇼츠"}
        // 개수는 메뉴 옆 숫자가 이미 말한다
        aside={shorts.length ? (en ? "30–45s" : "30–45초") : undefined}
      />
      <ProjectFilter
        projects={projects}
        counts={counts}
        value={filter}
        onChange={setFilter}
        label={en ? "Filter by project" : "프로젝트로 거르기"}
      />
      {list.length === 0 ? (
        <EmptyState
          title={
            proj
              ? en
                ? `No shorts for ${proj.name} yet`
                : `${proj.name}에는 아직 쇼츠가 없습니다`
              : en
                ? "No shorts yet"
                : "아직 쇼츠가 없습니다"
          }
          body={
            en
              ? "Shorts render the same night a devlog is written (ElevenLabs narration + Remotion). The first one comes on a day with a deploy commit."
              : "쇼츠는 데브로그가 만들어진 같은 밤에 렌더됩니다(ElevenLabs 내레이션 + Remotion). 첫 편은 배포 커밋이 있는 날에 나옵니다."
          }
          hint="content/shorts/<repo>/<date>.json"
          action={
            proj ? (
              <button
                type="button"
                onClick={() => setFilter("all")}
                className="h-8 cursor-pointer rounded-sm border border-line bg-panel2 px-3 text-sm font-bold text-ink transition-opacity duration-150 hover:opacity-85 active:scale-[.98]"
              >
                {en ? "Show all" : "전체 보기"}
              </button>
            ) : undefined
          }
        />
      ) : (
        <ShortsGrid
          shorts={list}
          // 인트로는 채널 소개다 — 한 프로젝트를 고른 화면에는 섞지 않는다
          introSrc={filter === "all" ? introSrc : undefined}
          introEnSrc={filter === "all" ? introEnSrc : undefined}
        />
      )}
    </section>
  );
}
