"use client";
/**
 * 커밋 잔디 — 날짜별 커밋 수를 주 단위 격자로.
 *
 * GitHub의 기여 그래프와 같은 문법이지만 **데이터는 우리 것**이다. GitHub의
 * 기여 수는 공개 REST에 없고(GraphQL + 토큰), 무엇보다 여기서 보여 줄 것은
 * "vibelog가 추적하는 레포에서 그날 몇 번 커밋했나"다 — 그 값은 매일 밤
 * 파이프라인이 데브로그 frontmatter(commits)에 이미 적어 둔다.
 *
 * 오늘이 언제인지는 방문자 시계로 판단한다 (홈은 정적 빌드라 서버 값이
 * 굳는다 — HomeFacts와 같은 이유). 첫 렌더는 빌드 시각 기준으로 그리고
 * 마운트 뒤 방문자의 오늘로 맞춘다. 어긋나 봐야 칸 하나 차이다.
 */
import { useEffect, useMemo, useState } from "react";
import { fmtNum } from "@/lib/format";
import { useLang } from "./lang";

/** 보여 줄 기간 — 12주. 한 화면에 들어가면서 계절의 리듬이 보이는 길이 */
const WEEKS = 12;

export interface CommitDay {
  /** YYYY-MM-DD (KST) */
  date: string;
  count: number;
}

/** 파이프라인(run.ts)과 같은 식 — 시계만 방문자 것 */
function todayKst(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 그날 커밋 수 → 0~4단계. 경계는 이 프로젝트의 실제 하루치(한 자리~수십)에 맞췄다 */
function level(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count < 5) return 1;
  if (count < 15) return 2;
  if (count < 30) return 3;
  return 4;
}

// 빈 칸은 패널색, 나머지는 강조색을 4단계로. 토큰 위에서만 논다.
const FILL = [
  "var(--color-panel2)",
  "color-mix(in srgb, var(--color-accent) 26%, var(--color-panel2))",
  "color-mix(in srgb, var(--color-accent) 50%, var(--color-panel2))",
  "color-mix(in srgb, var(--color-accent) 75%, var(--color-panel2))",
  "var(--color-accent)",
] as const;

const MONTH_KO = ["1","2","3","4","5","6","7","8","9","10","11","12"];
const MONTH_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function CommitHeatmap({
  days,
  buildDate,
}: {
  days: CommitDay[];
  /** 빌드 시점의 오늘(KST) — 마운트 전 첫 렌더용 */
  buildDate: string;
}) {
  const { lang } = useLang();
  const [today, setToday] = useState(buildDate);
  const [picked, setPicked] = useState<CommitDay | null>(null);

  useEffect(() => setToday(todayKst()), []);

  const { weeks, total } = useMemo(() => {
    const byDate = new Map(days.map((d) => [d.date, d.count]));
    // 마지막 열이 이번 주가 되도록, 오늘이 속한 주의 토요일에서 끝낸다
    const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0=일
    const end = addDays(today, 6 - dow);
    const start = addDays(end, -(WEEKS * 7 - 1));
    const cols: CommitDay[][] = [];
    let sum = 0;
    for (let w = 0; w < WEEKS; w++) {
      const col: CommitDay[] = [];
      for (let d = 0; d < 7; d++) {
        const date = addDays(start, w * 7 + d);
        const count = byDate.get(date) ?? 0;
        if (date <= today) sum += count;
        col.push({ date, count });
      }
      cols.push(col);
    }
    return { weeks: cols, total: sum };
  }, [days, today]);

  const months = MONTH_KO.map((m, i) => (lang === "ko" ? `${m}월` : MONTH_EN[i]));
  const label = (d: CommitDay) => {
    const [, m, day] = d.date.split("-");
    const when =
      lang === "ko"
        ? `${Number(m)}월 ${Number(day)}일`
        : `${MONTH_EN[Number(m) - 1]} ${Number(day)}`;
    return lang === "ko"
      ? `${when} · 커밋 ${fmtNum(d.count)}개`
      : `${when} · ${fmtNum(d.count)} commits`;
  };

  return (
    <figure
      className="m-0 flex flex-col gap-2.5"
      // 격자는 장식이 아니라 정보다 — 칸마다 읽히면 시끄러우니 요약으로 대신한다
      aria-label={
        lang === "ko"
          ? `최근 ${WEEKS}주 커밋 ${fmtNum(total)}개`
          : `${fmtNum(total)} commits in the last ${WEEKS} weeks`
      }
    >
      <figcaption className="flex items-baseline justify-between gap-3 font-mono text-2xs text-muted">
        <span aria-hidden>
          {picked
            ? label(picked)
            : lang === "ko"
              ? `최근 ${WEEKS}주 · 커밋 ${fmtNum(total)}개`
              : `last ${WEEKS} weeks · ${fmtNum(total)} commits`}
        </span>
        <span aria-hidden className="flex items-center gap-1">
          <span>{lang === "ko" ? "적음" : "less"}</span>
          {FILL.map((bg, i) => (
            <span
              key={i}
              className="size-2.5 rounded-[3px]"
              style={{ background: bg }}
            />
          ))}
          <span>{lang === "ko" ? "많음" : "more"}</span>
        </span>
      </figcaption>

      <div aria-hidden className="flex gap-[3px]">
        {weeks.map((col, w) => {
          // 그 주에 달이 바뀌면 열 위에 달 이름을 적는다
          const first = col[0].date;
          const prev = w > 0 ? weeks[w - 1][0].date : null;
          const newMonth = !prev || first.slice(0, 7) !== prev.slice(0, 7);
          return (
            <div key={first} className="flex flex-1 flex-col gap-[3px]">
              <div className="h-3 font-mono text-[9px] leading-3 text-muted">
                {newMonth ? months[Number(first.slice(5, 7)) - 1] : ""}
              </div>
              {col.map((d) => (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setPicked(d)}
                  onMouseEnter={() => setPicked(d)}
                  onMouseLeave={() => setPicked(null)}
                  onFocus={() => setPicked(d)}
                  onBlur={() => setPicked(null)}
                  tabIndex={-1}
                  title={label(d)}
                  className="aspect-square w-full cursor-pointer rounded-[3px] transition-opacity duration-150 hover:opacity-80"
                  style={{
                    background: FILL[level(d.count)],
                    // 아직 오지 않은 날은 격자만 남긴다
                    opacity: d.date > today ? 0.35 : 1,
                  }}
                />
              ))}
            </div>
          );
        })}
      </div>
    </figure>
  );
}
