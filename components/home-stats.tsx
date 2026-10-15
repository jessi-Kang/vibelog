"use client";
/**
 * 홈 통계 줄 + 잔디 — 한 덩어리다. 둘 다 "커밋이 몇 번"을 말한다.
 *
 * 수치는 방문 시점 실시간이다. 낮에 커밋해도 숫자가 올라야 한다. 페이지는 정적 빌드라 서버 값이 굳으므로 숫자만 따로 받아 온다.
 *
 * 받아 오는 곳은 우리 `/api/commits`다. 전에는 여기서 GitHub 공개 API를 직접
 * 불렀는데 그게 IP당 시간당 60회라 새로고침 몇 번에 403이 떨어지고 화면이
 * 조용히 저장값으로 되돌아갔다 (브라우저 콘솔에서 드러났다). 서버가 5분에 한 번
 * 세서 나눠주면 요청 수가 방문자 수와 무관해진다.
 *
 * 한 응답에 오늘 수·이번 주 수·오늘의 시간별 줄이 함께 온다. 숫자와 잔디의
 * 오늘 줄이 같은 목록에서 나오므로 둘이 어긋날 수가 없다.
 *
 * 못 받으면(오프라인·GitHub 장애) 파이프라인이 밤에 정산해 둔 저장값으로
 * 폴백하되, countsDate가 어제 것이면 "오늘"은 0으로 본다 (KST 자정 리셋).
 *
 * 배치: 좁은 화면에선 통계가 한 줄로 흐르고 잔디가 아래. md부터는 통계가
 * 2×2 격자로 서고 잔디가 옆에 선다 — 넓은 화면에서 왼쪽이
 * 한 줄만 있으면 빈약해 보였다.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  activeThisWeek,
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
        className={`font-sans text-md font-semibold leading-none tabular-nums tracking-[-.01em] md:text-xl lg:text-2xl ${
          zero ? "text-muted" : "text-accent"
        }`}
      >
        {typeof n === "number" ? fmtNum(n) : n}
      </b>
      {/* 이름은 한글 글꼴로 — 코딩용 글꼴엔 한글이 없어 기기마다 다른 글꼴로 바뀌었다. 데스크톱은 숫자를 키운 만큼 이름도 키운다 (시안 docs/home-stats-size.html A안) */}
      <span className="font-sans md:text-2xs lg:text-sm">{label}</span>
    </span>
  );
}

export function HomeStats({
  sources,
  activity,
  hours,
  buildDate,
}: {
  sources: FactSource[];
  /** 프로젝트마다 마지막 활동 날짜 — "만드는 중"은 이 중 최근 7일 안인 것의 수 */
  activity: string[];
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
          [
            "a",
            activity.filter((d) => activeThisWeek(d, today)).length,
            <T key="a" ko="만드는 중" en="building" />,
          ],
        ];

  return (
    /* 위아래 여백을 같게 — 위 14 / 아래 49로 블록이 위로 치우쳐 있었다
       */
    <div className="flex flex-col gap-4 border-t border-line pt-6 md:flex-row md:items-center md:justify-between md:gap-8">
      {/* 좁은 화면에서도 2단 격자 — 한 줄로 흘리면 "3 + 1"로 애매하게 끊긴다
          */}
      {/* 데스크톱은 잔디 옆에 나란히 세로 가운데로 맞추는데, 잔디 밑의 시각 눈금 줄(9px + 간격 6px)까지
          높이로 쳐서 통계가 칸보다 14px 아래로 처졌다 (10/11). 같은 15px을 아래에 비워 칸 덩어리의
          가운데에 맞춘다 — 눈금 줄 높이는 commit-heatmap.tsx에서 9px로 못 박았다.
          거기서 조금 더 내린다(데스크톱 4px, 태블릿 2px): 글자 픽셀로는 위아래가 19px씩 같았는데, 위는 크고
          밝은 숫자·아래는 작고 옅은 이름이라 눈에는 위로 치우쳐 보였다 (10/11) */}
      <div className="grid grid-cols-2 gap-x-5 gap-y-3.5 font-mono text-xs leading-snug text-muted md:max-w-[340px] md:flex-1 md:gap-x-7 md:gap-y-4 md:pb-[11px] lg:max-w-[380px] lg:gap-y-5 lg:pb-[7px]">
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
