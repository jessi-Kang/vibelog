"use client";
/**
 * 홈 "최근 데브로그" 목록 — 관리자에게는 숨긴 프로젝트의 글을 날짜순으로 섞고 "숨김" 칩을 붙인다
 * (components/private-data.tsx). 방문자에게는 서버가 만든 목록 그대로다.
 */
import { T } from "./lang";
import { HiddenChip, usePrivate } from "./private-data";
import { Card } from "./ui";
import { DevlogCompactEntry } from "./vibelog";

export interface RecentItem {
  href: string;
  repo: string;
  date: string;
  dateShort: string;
  title: string;
  titleEn?: string;
  commits?: number;
  prs?: number;
  intro?: boolean;
  hasFail?: boolean;
  hidden?: boolean;
}

export function HomeRecent({ items, max }: { items: RecentItem[]; max: number }) {
  const priv = usePrivate();
  const list = priv
    ? [...items, ...priv.devlogs.map((d) => ({ ...d, hidden: true }))]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, max)
    : items.slice(0, max);
  return (
    <Card className="p-0">
      {list.map((d, i, a) => (
        <DevlogCompactEntry
          key={`${d.repo}/${d.date}`}
          href={d.href}
          date={d.dateShort}
          repo={d.repo}
          title={<T ko={d.title} en={d.titleEn ?? d.title} />}
          last={i === a.length - 1}
          meta={[
            ...(d.hidden ? [{ text: <HiddenChip /> }] : []),
            ...(d.intro ? [{ text: <T ko="프로젝트 소개" en="project intro" />, tone: "soft" as const }] : []),
            ...(d.commits
              ? [
                  {
                    text: (
                      <T
                        ko={`커밋 ${d.commits}${d.prs ? ` · PR ${d.prs}` : ""}`}
                        en={`${d.commits} commit${d.commits === 1 ? "" : "s"}${d.prs ? ` · ${d.prs} PR${d.prs === 1 ? "" : "s"}` : ""}`}
                      />
                    ),
                  },
                ]
              : []),
            ...(d.hasFail ? [{ text: <T ko="삽질" en="rabbit hole" />, tone: "warn" as const }] : []),
          ]}
        />
      ))}
    </Card>
  );
}
