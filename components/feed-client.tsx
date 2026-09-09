"use client";
/** 데브로그 피드 — ProjectFilter(≤8 칩 / >8 Select) + 10편 페이지네이션 */
import { useState } from "react";
import { useLang } from "./lang";
import { EmptyState, SectionHeader } from "./ui";
import { DevlogTimelineEntry } from "./vibelog";

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
}

export interface FeedProject {
  slug: string;
  name: string;
  status: string;
  lastActive: string;
  lastActiveEn?: string;
}

const PAGE = 10;
const MAX_CHIPS = 8;

export function FeedClient({
  items,
  projects,
}: {
  items: FeedItem[];
  projects: FeedProject[];
}) {
  const { lang } = useLang();
  const en = lang === "en";
  const [filter, setFilter] = useState("all");
  const [n, setN] = useState(PAGE);

  const counts: Record<string, number> = { all: items.length };
  for (const d of items) counts[d.repo] = (counts[d.repo] ?? 0) + 1;
  const sorted = [...projects].sort(
    (a, b) => (counts[b.slug] ?? 0) - (counts[a.slug] ?? 0),
  );
  const all = items.filter((d) => filter === "all" || d.repo === filter);
  const list = all.slice(0, n);
  const proj = projects.find((p) => p.slug === filter);
  const options = [{ slug: "all", name: en ? "All" : "전체" }, ...sorted];

  const pick = (v: string) => {
    setFilter(v);
    setN(PAGE);
  };

  return (
    <>
      <section className="flex flex-col gap-3.5">
        <SectionHeader
          title={en ? "Devlog" : "데브로그"}
          aside={
            all.length
              ? en
                ? `${all.length} posts · one per day`
                : `${all.length}편 · 하루 한 글`
              : undefined
          }
        />
        {projects.length > MAX_CHIPS ? (
          <label className="relative block max-w-[320px]">
            <select
              value={filter}
              onChange={(e) => pick(e.target.value)}
              className="h-11 w-full cursor-pointer appearance-none rounded-md border border-line bg-bg px-3.5 pr-10 font-mono text-base text-ink focus:border-accent"
            >
              {options.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                  {counts[p.slug] != null ? `  ·  ${counts[p.slug]}` : ""}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-muted">
              ▾
            </span>
          </label>
        ) : (
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 py-1.5 [scrollbar-width:none]">
            {options.map((p) => {
              const on = p.slug === filter;
              return (
                <button
                  key={p.slug}
                  type="button"
                  aria-pressed={on}
                  onClick={() => pick(p.slug)}
                  className={`hit min-h-8 flex-none cursor-pointer whitespace-nowrap rounded-full border px-3 font-mono text-xs transition-colors duration-150 ${
                    on
                      ? "border-line-strong bg-panel2 font-bold text-ink"
                      : "border-line bg-transparent font-medium text-muted"
                  }`}
                >
                  {p.name}
                  {counts[p.slug] != null && (
                    <span className="ml-1.5 text-muted">{counts[p.slug]}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
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
                ? "New commits appear here after the next 23:00 run."
                : "커밋이 생기면 다음 23:00 실행에 올라옵니다."
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
              href={`/log/${d.repo}/${d.date}`}
              date={en ? (d.dateLabelEn ?? d.dateLabel) : d.dateLabel}
              repo={d.repo}
              title={en ? (d.titleEn ?? d.title) : d.title}
              summary={en ? (d.summaryEn ?? d.summary) : d.summary}
              last={i === list.length - 1}
              meta={[
                ...(d.commits
                  ? [
                      en
                        ? `${d.commits} commits${d.prs ? ` · ${d.prs} PRs` : ""}`
                        : `커밋 ${d.commits}${d.prs ? ` · PR ${d.prs}` : ""}`,
                    ]
                  : []),
                ...(d.hasFail
                  ? [{ text: en ? "rabbit hole" : "삽질", tone: "warn" as const }]
                  : []),
                ...(d.hasShort
                  ? [{ text: en ? "short ▶" : "쇼츠 ▶", tone: "accent" as const }]
                  : []),
              ]}
            />
          ))}
        </div>
      )}
      {all.length > n && (
        <button
          type="button"
          onClick={() => setN(n + PAGE)}
          className="h-11 w-full cursor-pointer rounded-md border border-line bg-panel2 text-base font-bold text-ink transition-opacity duration-150 hover:opacity-85 active:scale-[.98]"
        >
          {en
            ? `${Math.min(PAGE, all.length - n)} older posts`
            : `이전 글 ${Math.min(PAGE, all.length - n)}편 더`}
        </button>
      )}
    </>
  );
}
