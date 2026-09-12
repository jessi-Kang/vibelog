"use client";
/**
 * 홈 통계 줄 + 잔디 — 한 덩어리다. 둘 다 "커밋이 몇 번"을 말한다.
 *
 * 수치는 방문 시점 실시간이다 (Jessi 지시: 낮에 커밋해도 카운트가 올라야
 * 한다). 페이지는 정적 빌드라 서버 값이 굳으므로, 방문자 브라우저가 GitHub
 * 공개 API로 직접 센다 — 파이프라인 쓰기·커밋·배포 없이 항상 최신.
 * 실패(레이트 리밋·오프라인·private)하면 파이프라인이 밤에 정산해 둔
 * 저장값으로 폴백하되, countsDate가 어제 것이면 "오늘"은 0으로 본다.
 *
 * 받아 오는 것은 레포당 두 번뿐이다 — 오늘 커밋 **시각 목록**과 이번 주
 * 커밋 **수**. 오늘 숫자와 잔디의 오늘 줄이 같은 목록에서 나오므로 둘이
 * 어긋날 수가 없다 (Jessi 지적: "지난 실행, 커밋 수, 잔디가 모두 같은걸
 * 보고 갱신해야지").
 *
 * 배치: 좁은 화면에선 통계가 한 줄로 흐르고 잔디가 아래. md부터는 통계가
 * 2×2 격자로 서고 잔디가 옆에 선다 (Jessi 선택) — 넓은 화면에서 왼쪽이
 * 한 줄만 있으면 빈약해 보였다.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  HEATMAP_DAYS,
  addDays,
  hourHistogram,
  hourRows,
  todayKst,
  type CommitHours,
} from "@/lib/commit-hours";
import { fmtNum } from "@/lib/format";
import { CommitHeatmap } from "./commit-heatmap";
import { T } from "./lang";

export interface FactSource {
  repoUrl: string;
  /** 저장된 카운트의 기준 날짜(KST) — 오늘이 아니면 todayCommits는 어제 것 */
  countsDate?: string;
  todayCommits?: number;
  weekCommits?: number;
}

function repoOf(repoUrl: string): string | null {
  return repoUrl.match(/github\.com\/([^/]+\/[^/]+)/)?.[1] ?? null;
}

/** 커밋 수 세기 — per_page=1 요청의 Link 헤더 마지막 페이지 번호가 총 개수
 *  (collect.ts countCommits와 같은 기법. GitHub가 CORS로 Link를 노출한다) */
async function countSince(repoUrl: string, since: string): Promise<number> {
  const repo = repoOf(repoUrl);
  if (!repo) return 0;
  const res = await fetch(
    `https://api.github.com/repos/${repo}/commits?since=${encodeURIComponent(since)}&per_page=1`,
  );
  if (!res.ok) throw new Error(String(res.status));
  const link = res.headers.get("link");
  const last = link?.match(/[?&]page=(\d+)>; rel="last"/);
  if (last) return Number(last[1]);
  return ((await res.json()) as unknown[]).length;
}

/** 오늘 0시(KST) 이후 커밋 시각. 보통 요청 한 번이면 끝난다 (최대 300개) */
async function commitTimesSince(
  repoUrl: string,
  since: string,
): Promise<string[]> {
  const repo = repoOf(repoUrl);
  if (!repo) return [];
  const out: string[] = [];
  for (let page = 1; page <= 3; page++) {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/commits?since=${encodeURIComponent(since)}&per_page=100&page=${page}`,
    );
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as {
      commit: { committer?: { date?: string }; author?: { date?: string } };
    }[];
    for (const c of data) {
      const t = c.commit.committer?.date ?? c.commit.author?.date;
      if (t) out.push(t);
    }
    if (data.length < 100) break;
  }
  return out;
}

function Fact({ n, label }: { n: number | string; label: ReactNode }) {
  const zero = n === 0 || n === "—";
  return (
    <span className="inline-flex items-baseline gap-1.5 md:flex-col md:items-start md:gap-1">
      <b
        suppressHydrationWarning // 실시간 값은 클라이언트에서 갱신된다
        className={`font-sans text-md font-bold leading-none tabular-nums tracking-[-.01em] md:text-xl ${
          zero ? "text-muted" : "text-accent"
        }`}
      >
        {typeof n === "number" ? fmtNum(n) : n}
      </b>
      <span className="md:text-2xs">{label}</span>
    </span>
  );
}

export function HomeStats({
  sources,
  active,
  hours,
  buildDate,
}: {
  sources: FactSource[];
  active: number;
  hours: CommitHours;
  /** 빌드 시점의 오늘(KST) — 마운트 전 첫 렌더용 (홈은 정적 빌드다) */
  buildDate: string;
}) {
  const [today, setToday] = useState(buildDate);
  const [live, setLive] = useState<{
    today: number;
    week: number;
    row: number[];
  } | null>(null);

  useEffect(() => setToday(todayKst()), []);

  const urls = useMemo(() => sources.map((s) => s.repoUrl), [sources]);

  useEffect(() => {
    let dead = false;
    const load = async () => {
      try {
        const midnight = `${todayKst()}T00:00:00+09:00`;
        // "이번 주"는 잔디가 그리는 것과 같은 창이다 — 오늘 포함 7일치.
        // 굴러가는 168시간으로 세면 격자엔 399개가 그려졌는데 숫자는 365라고
        // 적히는 식으로 둘이 갈린다 (Jessi 지시: 같은 걸 보고 갱신한다).
        const weekAgo = `${addDays(todayKst(), -(HEATMAP_DAYS - 1))}T00:00:00+09:00`;
        const pairs = await Promise.all(
          urls.map(async (url) =>
            Promise.all([
              commitTimesSince(url, midnight),
              countSince(url, weekAgo),
            ]),
          ),
        );
        if (dead) return;
        const times = pairs.flatMap(([t]) => t);
        setLive({
          today: times.length,
          week: pairs.reduce((n, [, w]) => n + w, 0),
          row: hourHistogram(times),
        });
      } catch {
        // 레이트 리밋·오프라인 — 저장값 폴백 유지
      }
    };
    void load();
    // 열어 둔 화면도 따라오게 5분마다 재조회 (방문자당 시간당 요청 ~48개 — 한도 60 안)
    const id = setInterval(() => void load(), 5 * 60_000);
    return () => {
      dead = true;
      clearInterval(id);
    };
  }, [urls]);

  // 폴백(저장값): 오늘은 countsDate가 오늘일 때만, 주간은 그대로
  const storedToday = sources.reduce(
    (n, s) => n + (s.countsDate === today ? (s.todayCommits ?? 0) : 0),
    0,
  );
  const storedWeek = sources.reduce((n, s) => n + (s.weekCommits ?? 0), 0);

  const grid = useMemo(
    () => hourRows(hours, today, live?.row ?? null),
    [hours, today, live],
  );

  const facts: [string, number | string, ReactNode][] =
    sources.length === 0
      ? [["w", "—", <T key="w" ko="첫 실행 대기" en="waiting for first run" />]]
      : [
          [
            "t",
            live?.today ?? storedToday,
            <T key="t" ko="오늘 커밋" en="commits today" />,
          ],
          [
            "k",
            live?.week ?? storedWeek,
            <T key="k" ko="이번 주 커밋" en="commits this week" />,
          ],
          [
            "p",
            grid.peak,
            <T key="p" ko="한 시간 최대" en="peak in an hour" />,
          ],
          ["a", active, <T key="a" ko="만드는 중" en="building" />],
        ];

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-3.5 md:flex-row md:items-center md:justify-between md:gap-8">
      <div className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs leading-snug text-muted md:grid md:max-w-[340px] md:flex-1 md:grid-cols-2 md:gap-x-7 md:gap-y-4">
        {facts.map(([k, n, l]) => (
          <Fact key={k} n={n} label={l} />
        ))}
      </div>
      <div className="md:w-[56%] md:flex-none lg:w-[552px]">
        <CommitHeatmap rows={grid.rows} days={HEATMAP_DAYS} />
      </div>
    </div>
  );
}
