"use client";
/**
 * 홈 통계 줄 — "오늘 커밋"은 KST 자정 기준으로 리셋된다 (Jessi 지시).
 * 페이지는 정적 빌드라 서버 값이 빌드 시점에 굳는다. 그래서 파이프라인이
 * projects.json에 남긴 카운트 기준 날짜(countsDate)를 방문 시점의 오늘과
 * 클라이언트에서 비교해, 자정이 지났으면 0부터 다시 보여준다. 분 단위로
 * 다시 판정하므로 자정을 넘겨 열려 있는 화면도 그 자리에서 0이 된다.
 */
import { useEffect, useState, type ReactNode } from "react";
import { fmtNum } from "@/lib/format";
import { T } from "./lang";

export interface TodayItem {
  /** 카운트가 계산된 날(KST). 없거나 오늘이 아니면 그 값은 어제 것 — 0으로 본다 */
  date?: string;
  n: number;
}

/** 파이프라인(run.ts todayKST)과 같은 식 — 시계만 방문자 것 */
function todayKst(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

function Fact({ n, label }: { n: number | string; label: ReactNode }) {
  const zero = n === 0 || n === "—";
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <b
        suppressHydrationWarning // 자정 직후엔 빌드 시점 값과 다를 수 있다 — 클라이언트 값이 맞다
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
  today,
  week,
  active,
}: {
  today: TodayItem[];
  week: number;
  active: number;
}) {
  // 분 단위 재판정 — 자정을 넘기면 열려 있는 화면도 0으로 넘어간다
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  const d = todayKst();
  const todayCount = today.reduce((s, it) => s + (it.date === d ? it.n : 0), 0);

  const facts: [string, number | string, ReactNode][] =
    today.length === 0
      ? [["w", "—", <T key="w" ko="첫 실행 대기" en="waiting for first run" />]]
      : [
          ["t", todayCount, <T key="t" ko="오늘 커밋" en="commits today" />],
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
