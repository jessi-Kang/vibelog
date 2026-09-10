"use client";
/**
 * 홈 통계 줄 — "오늘/이번 주 커밋"은 방문 시점 실시간이다 (Jessi 지시:
 * 낮에 커밋해도 카운트가 올라야 한다). 페이지는 정적 빌드라 서버 값이
 * 굳으므로, 방문자 브라우저가 GitHub 공개 API로 직접 센다 — 파이프라인
 * 쓰기·커밋·배포 없이 항상 최신. 실패(레이트 리밋·오프라인·private)하면
 * 파이프라인이 밤에 정산해 둔 저장값으로 폴백하되, countsDate가 어제 것이면
 * "오늘"은 0으로 본다 (자정 리셋).
 */
import { useEffect, useState, type ReactNode } from "react";
import { fmtNum } from "@/lib/format";
import { T } from "./lang";

export interface FactSource {
  repoUrl: string;
  /** 저장된 카운트의 기준 날짜(KST) — 오늘이 아니면 todayCommits는 어제 것 */
  countsDate?: string;
  todayCommits?: number;
  weekCommits?: number;
}

/** 파이프라인(run.ts todayKST)과 같은 식 — 시계만 방문자 것 */
function todayKst(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

/** 커밋 수 세기 — per_page=1 요청의 Link 헤더 마지막 페이지 번호가 총 개수
 *  (collect.ts countCommits와 같은 기법. GitHub가 CORS로 Link를 노출한다) */
async function countSince(repoUrl: string, since: string): Promise<number> {
  const m = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/);
  if (!m) return 0;
  const res = await fetch(
    `https://api.github.com/repos/${m[1]}/commits?since=${encodeURIComponent(since)}&per_page=1`,
  );
  if (!res.ok) throw new Error(String(res.status));
  const link = res.headers.get("link");
  const pm = link?.match(/[?&]page=(\d+)>; rel="last"/);
  if (pm) return Number(pm[1]);
  return ((await res.json()) as unknown[]).length;
}

function Fact({ n, label }: { n: number | string; label: ReactNode }) {
  const zero = n === 0 || n === "—";
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <b
        suppressHydrationWarning // 실시간 값은 클라이언트에서 갱신된다
        className={`font-sans text-md font-bold tabular-nums tracking-[-.01em] ${
          zero ? "text-muted" : "text-accent"
        }`}
      >
        {typeof n === "number" ? fmtNum(n) : n}
      </b>
      <span>{label}</span>
    </span>
  );
}

export function HomeFacts({
  sources,
  active,
}: {
  sources: FactSource[];
  active: number;
}) {
  const [live, setLive] = useState<{ today: number; week: number } | null>(null);

  useEffect(() => {
    let dead = false;
    const load = async () => {
      try {
        const midnight = `${todayKst()}T00:00:00+09:00`;
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
        const pairs = await Promise.all(
          sources.map(async (s) => {
            const [t, w] = await Promise.all([
              countSince(s.repoUrl, midnight),
              countSince(s.repoUrl, weekAgo),
            ]);
            return [t, w];
          }),
        );
        if (!dead) {
          setLive({
            today: pairs.reduce((n, [t]) => n + t, 0),
            week: pairs.reduce((n, [, w]) => n + w, 0),
          });
        }
      } catch {
        // 레이트 리밋·오프라인 — 저장값 폴백 유지
      }
    };
    load();
    // 열어 둔 화면도 따라오게 5분마다 재조회 (방문자당 시간당 요청 ~48개 — 한도 60 안)
    const id = setInterval(load, 5 * 60_000);
    return () => {
      dead = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 폴백(저장값): 오늘은 countsDate가 오늘일 때만, 주간은 그대로
  const d = todayKst();
  const storedToday = sources.reduce(
    (n, s) => n + (s.countsDate === d ? (s.todayCommits ?? 0) : 0),
    0,
  );
  const storedWeek = sources.reduce((n, s) => n + (s.weekCommits ?? 0), 0);
  const today = live?.today ?? storedToday;
  const week = live?.week ?? storedWeek;

  const facts: [string, number | string, ReactNode][] =
    sources.length === 0
      ? [["w", "—", <T key="w" ko="첫 실행 대기" en="waiting for first run" />]]
      : [
          ["t", today, <T key="t" ko="오늘 커밋" en="commits today" />],
          ["k", week, <T key="k" ko="이번 주 커밋" en="commits this week" />],
          ["a", active, <T key="a" ko="만드는 중" en="building" />],
        ];

  return (
    <div className="flex flex-wrap gap-5 border-t border-line pt-3.5 font-mono text-xs leading-snug text-muted">
      {facts.map(([k, n, l]) => (
        <Fact key={k} n={n} label={l} />
      ))}
    </div>
  );
}
