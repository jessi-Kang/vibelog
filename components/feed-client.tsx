"use client";
/**
 * 데브로그 피드 — ProjectFilter(쇼츠와 공용). 전부 보여 준다.
 *
 * 10편씩 끊어 "이전 글 N편 더"로 열던 것을 걷어냈다 ("페이징 하지 말고 전체 다
 * 노출해" — Jessi). 글은 하루 한 편이라 한 해가 쌓여도 수백 줄이고, 필터가
 * 이미 프로젝트별로 줄여 준다. 버튼 뒤에 숨은 글은 검색·스크롤 어느 쪽에서도
 * 없는 글이었다.
 */
import { useProjectFilter } from "@/lib/use-project-filter";
import { useLang } from "./lang";
import { ProjectFilter } from "./project-filter";
import { EmptyState, SectionHeader, ShortMark } from "./ui";
import { DevlogTimelineEntry } from "./vibelog";
import { postPath } from "@/lib/post-id";

export interface FeedItem {
  repo: string;
  date: string;
  dateLabel: string; // "2026-09-14 · 일"
  dateLabelEn?: string;
  title: string;
  titleEn?: string;
  summary?: string;
  summaryEn?: string;
  commits?: number;
  prs?: number;
  hasFail: boolean;
  hasShort: boolean;
  intro?: boolean;
}

export interface FeedProject {
  slug: string;
  name: string;
  status: string;
  lastActive: string;
  lastActiveEn?: string;
}

export function FeedClient({
  items,
  projects,
}: {
  items: FeedItem[];
  projects: FeedProject[];
}) {
  const { lang } = useLang();
  const en = lang === "en";
  const [filter, pick] = useProjectFilter(projects.map((p) => p.slug));

  const counts: Record<string, number> = { all: items.length };
  for (const d of items) counts[d.repo] = (counts[d.repo] ?? 0) + 1;
  const list = items.filter((d) => filter === "all" || d.repo === filter);
  const proj = projects.find((p) => p.slug === filter);


  return (
    <>
      <section className="flex flex-col gap-3.5">
        <SectionHeader
          title={en ? "Devlog" : "데브로그"}
          // 개수는 메뉴 옆 숫자가 이미 말한다 — 규칙만 남긴다
          aside={list.length ? (en ? "one per day" : "하루 한 글") : undefined}
        />
        <ProjectFilter
          projects={projects}
          counts={counts}
          value={filter}
          onChange={pick}
          label={en ? "Filter by project" : "프로젝트로 거르기"}
        />
      </section>

      {list.length === 0 ? (
        <EmptyState
          title={
            proj
              ? en
                ? `No posts for ${proj.name} yet`
                : `${proj.name}에는 아직 글이 없습니다`
              : en
                ? "No posts yet"
                : "아직 글이 없습니다"
          }
          body={
            proj && proj.status === "paused"
              ? en
                ? `No commits since ${proj.lastActiveEn ?? proj.lastActive}. When it moves again, a post goes up that night.`
                : `${proj.lastActive}부터 커밋이 없습니다. 다시 움직이면 그날 밤 글이 올라옵니다.`
              : en
                ? "The first post introduces the project — it goes up the night code lands in the repo. After that, a post comes on each night that gathers 5 commits with a written body."
                : "첫 글은 프로젝트 소개 글로, 레포에 코드가 올라온 밤에 나옵니다. 그다음부터는 본문을 쓴 커밋이 5개 모인 밤마다 글이 올라옵니다."
          }
          action={
            <button
              type="button"
              onClick={() => pick("all")}
              className="h-8 cursor-pointer rounded-sm border border-line bg-panel2 px-3 text-sm font-bold text-ink transition-opacity duration-150 hover:opacity-85 active:scale-[.98]"
            >
              {en ? "Show all" : "전체 보기"}
            </button>
          }
        />
      ) : (
        <div className="flex flex-col gap-7">
          {list.map((d, i) => (
            <DevlogTimelineEntry
              key={`${d.repo}/${d.date}`}
              href={postPath(d)}
              date={en ? (d.dateLabelEn ?? d.dateLabel) : d.dateLabel}
              repo={d.repo}
              title={en ? (d.titleEn ?? d.title) : d.title}
              summary={en ? (d.summaryEn ?? d.summary) : d.summary}
              last={i === list.length - 1}
              meta={[
                // 소개 글은 커밋 수가 없다 — 대신 무슨 글인지 붙인다
                ...(d.intro ? [{ text: en ? "project intro" : "프로젝트 소개", tone: "soft" as const }] : []),
                ...(d.commits
                  ? [
                      en
                        ? `${d.commits} commit${d.commits === 1 ? "" : "s"}${d.prs ? ` · ${d.prs} PR${d.prs === 1 ? "" : "s"}` : ""}`
                        : `커밋 ${d.commits}${d.prs ? ` · PR ${d.prs}` : ""}`,
                    ]
                  : []),
                ...(d.hasFail
                  ? [{ text: en ? "rabbit hole" : "삽질", tone: "warn" as const }]
                  : []),
                ...(d.hasShort
                  ? [{ text: <ShortMark label={en ? "has short" : "쇼츠 있음"} inRow /> }]
                  : []),
              ]}
            />
          ))}
        </div>
      )}
    </>
  );
}
