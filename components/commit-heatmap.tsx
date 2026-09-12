"use client";
/**
 * 커밋 잔디 — 가로 24시간 × 세로 최근 7일.
 *
 * GitHub의 기여 그래프를 그대로 옮기지 않는다 (Jessi 지시: 사이트에 맞게
 * 새로 만든다). 타일은 지키되 단위를 하루에서 **한 시간**으로 내렸다.
 * 하루 한 칸으로 그렸더니 나흘치가 칸 네 개라 텅 비어 보였는데, 실제로는
 * 그 나흘에 399번 커밋했다 — 밀도가 통째로 뭉개지고 있었다. 시간 단위로
 * 내리니 격자가 차고, 덤으로 "새벽에도 커밋한다"가 그림으로 읽힌다.
 *
 * 요일 행·범례·달 라벨은 뺐다. 우리 데이터에 요일 리듬이 담길 일이 없고,
 * 모바일에서 세로를 잡아먹는다. 축은 아래 시각 눈금 네 개로 충분하다.
 *
 * 재료는 파이프라인이 매일 밤 쌓는 content/commit-hours.json이다.
 * 데브로그 frontmatter의 commits는 글 재료라 레포당 20개로 잘린 값이므로
 * 쓰지 않는다 (실제 하루치는 150개도 넘는다).
 */
import { useEffect, useMemo, useState } from "react";
import { fmtNum } from "@/lib/format";
import { useLang } from "./lang";

/** 세로 — 최근 며칠. 모바일 한 화면을 안 잡아먹는 길이 */
const DAYS = 7;

/** 날짜(KST) → 0~23시 커밋 수 */
export type CommitHours = Record<string, number[]>;

/** 파이프라인(run.ts)과 같은 식 — 시계만 방문자 것 */
function todayKst(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 한 시간 커밋 수 → 0~4단계. 경계는 실제 분포(한 시간 최대 22)에 맞췄다 */
function level(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count < 4) return 1;
  if (count < 9) return 2;
  if (count < 16) return 3;
  return 4;
}

// 빈 칸은 패널색, 나머지는 강조색을 4단계로 — 토큰 위에서만 논다
const FILL = [
  "var(--color-panel2)",
  "color-mix(in srgb, var(--color-accent) 24%, var(--color-panel2))",
  "color-mix(in srgb, var(--color-accent) 48%, var(--color-panel2))",
  "color-mix(in srgb, var(--color-accent) 74%, var(--color-panel2))",
  "var(--color-accent)",
] as const;

interface Cell {
  date: string;
  hour: number;
  count: number;
}

export function CommitHeatmap({
  hours,
  buildDate,
}: {
  hours: CommitHours;
  /** 빌드 시점의 오늘(KST) — 마운트 전 첫 렌더용 (홈은 정적 빌드다) */
  buildDate: string;
}) {
  const { lang } = useLang();
  const [today, setToday] = useState(buildDate);
  const [picked, setPicked] = useState<Cell | null>(null);

  useEffect(() => setToday(todayKst()), []);

  const { rows, total, peak } = useMemo(() => {
    const list: Cell[][] = [];
    let sum = 0;
    let max = 0;
    for (let i = DAYS - 1; i >= 0; i--) {
      const date = addDays(today, -i);
      const day = hours[date] ?? [];
      const row = Array.from({ length: 24 }, (_, hour) => {
        const count = day[hour] ?? 0;
        sum += count;
        if (count > max) max = count;
        return { date, hour, count };
      });
      list.push(row);
    }
    return { rows: list, total: sum, peak: max };
  }, [hours, today]);

  const label = (c: Cell) => {
    const [, m, d] = c.date.split("-");
    return lang === "ko"
      ? `${Number(m)}월 ${Number(d)}일 ${c.hour}시 · 커밋 ${fmtNum(c.count)}개`
      : `${m}/${d} ${c.hour}:00 · ${fmtNum(c.count)} commits`;
  };
  const summary =
    lang === "ko"
      ? `최근 ${DAYS}일 · 커밋 ${fmtNum(total)}개`
      : `last ${DAYS} days · ${fmtNum(total)} commits`;

  return (
    <figure
      className="m-0 flex flex-col gap-1.5"
      aria-label={
        lang === "ko"
          ? `${summary}. 한 시간 최대 ${fmtNum(peak)}개.`
          : `${summary}. Peak ${fmtNum(peak)} in an hour.`
      }
    >
      <div aria-hidden className="flex flex-col gap-[3px]">
        {rows.map((row) => (
          <div key={row[0].date} className="flex gap-[3px]">
            {row.map((c) => (
              <button
                key={c.hour}
                type="button"
                tabIndex={-1}
                title={label(c)}
                onClick={() => setPicked(c)}
                onMouseEnter={() => setPicked(c)}
                onMouseLeave={() => setPicked(null)}
                // 칸은 늘 정사각 — 가로로 늘이면 잔디가 아니라 막대가 된다.
                // 폭은 컨테이너가 준 만큼 쓴다 (md부터는 통계 줄 옆자리다).
                className="aspect-square flex-1 cursor-pointer rounded-[2px] transition-opacity duration-150 hover:opacity-75"
                style={{ background: FILL[level(c.count)] }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* 축 눈금과 고른 칸을 한 줄에 — 위에 요약 줄을 따로 두면 바로 위
          통계 줄("오늘 커밋 / 이번 주 커밋")과 두 줄이 겹쳐 보였고, 무엇보다
          거기 적히는 합계가 통계 줄의 숫자와 달라(집계 출처가 다르다)
          읽는 사람을 헷갈리게 했다 (Jessi 지적). 숫자는 통계 줄이 맡는다. */}
      <figcaption className="flex items-baseline justify-between gap-3 font-mono text-[9px] leading-none text-muted">
        <span aria-hidden className="flex flex-1">
          {[0, 6, 12, 18].map((h) => (
            <span key={h} className="flex-1">
              {lang === "ko" ? `${h}시` : `${h}:00`}
            </span>
          ))}
        </span>
        <span aria-hidden className="flex-none tabular-nums">
          {picked
            ? label(picked)
            : lang === "ko"
              ? `한 시간 최대 ${fmtNum(peak)}`
              : `peak ${fmtNum(peak)}/h`}
        </span>
      </figcaption>
    </figure>
  );
}
