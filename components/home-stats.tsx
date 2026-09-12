"use client";
/**
 * 홈 통계 줄 + 잔디 — 한 덩어리다. 둘 다 "커밋이 몇 번"을 말한다.
 *
 * 수치는 방문 시점 실시간이다 (Jessi 지시: 낮에 커밋해도 카운트가 올라야
 * 한다). 페이지는 정적 빌드라 서버 값이 굳으므로 숫자만 따로 받아 온다.
 *
 * 받아 오는 곳은 우리 `/api/commits`다. 전에는 여기서 GitHub 공개 API를 직접
 * 불렀는데 그게 IP당 시간당 60회라 새로고침 몇 번에 403이 떨어지고 화면이
 * 조용히 저장값으로 되돌아갔다 (Jessi가 콘솔에서 잡았다). 서버가 5분에 한 번
 * 세서 나눠주면 요청 수가 방문자 수와 무관해진다.
 *
 * 한 응답에 오늘 수·이번 주 수·오늘의 시간별 줄이 함께 온다. 숫자와 잔디의
 * 오늘 줄이 같은 목록에서 나오므로 둘이 어긋날 수가 없다 (Jessi 지적:
 * "지난 실행, 커밋 수, 잔디가 모두 같은걸 보고 갱신해야지").
 *
 * 못 받으면(오프라인·GitHub 장애) 파이프라인이 밤에 정산해 둔 저장값으로
 * 폴백하되, countsDate가 어제 것이면 "오늘"은 0으로 본다 (KST 자정 리셋).
 *
 * 배치: 좁은 화면에선 통계가 한 줄로 흐르고 잔디가 아래. md부터는 통계가
 * 2×2 격자로 서고 잔디가 옆에 선다 (Jessi 선택) — 넓은 화면에서 왼쪽이
 * 한 줄만 있으면 빈약해 보였다.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  HEATMAP_DAYS,
  hourRows,
  todayKst,
  type CommitHours,
  type LiveCounts,
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
  const [live, setLive] = useState<LiveCounts | null>(null);

  useEffect(() => setToday(todayKst()), []);

  useEffect(() => {
    let dead = false;
    const load = async () => {
      try {
        const res = await fetch("/api/commits");
        if (!res.ok) return;
        const data = (await res.json()) as LiveCounts | { error: string };
        // 서버가 못 셌으면 error만 온다 — 그때는 저장값을 그대로 쓴다
        if (dead || !("today" in data)) return;
        setLive(data);
      } catch {
        // 오프라인 — 저장값 폴백 유지
      }
    };
    void load();
    // 열어 둔 화면도 따라오게 5분마다 (서버 캐시와 같은 주기라 GitHub엔 더 안 간다)
    const id = setInterval(() => void load(), 5 * 60_000);
    return () => {
      dead = true;
      clearInterval(id);
    };
  }, []);

  // 폴백(저장값): 오늘은 countsDate가 오늘일 때만, 주간은 그대로
  const storedToday = sources.reduce(
    (n, s) => n + (s.countsDate === today ? (s.todayCommits ?? 0) : 0),
    0,
  );
  const storedWeek = sources.reduce((n, s) => n + (s.weekCommits ?? 0), 0);

  // 열어 둔 화면이 자정을 넘기면 서버가 센 날짜가 어제 것이 된다 — 그때는
  // 오늘 값으로 쓰지 않는다 (다음 재조회가 새 날짜로 채운다)
  const fresh = live && live.date === today ? live : null;

  const grid = useMemo(
    () => hourRows(hours, today, fresh?.row ?? null),
    [hours, today, fresh],
  );

  const facts: [string, number | string, ReactNode][] =
    sources.length === 0
      ? [["w", "—", <T key="w" ko="첫 실행 대기" en="waiting for first run" />]]
      : [
          [
            "t",
            fresh?.today ?? storedToday,
            <T key="t" ko="오늘 커밋" en="commits today" />,
          ],
          [
            "k",
            fresh?.week ?? storedWeek,
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
