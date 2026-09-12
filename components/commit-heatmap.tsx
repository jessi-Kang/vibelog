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
 * 숫자는 여기서 안 센다 — 격자만 그린다. 재료(rows)는 통계 줄과 같은
 * 계산(lib/commit-hours)에서 나온다. 합계·최대가 옆 통계 줄과 다른 값으로
 * 적히던 사고의 교훈이다.
 */
import type { HourCell } from "@/lib/commit-hours";
import { fmtNum } from "@/lib/format";
import { useLang } from "./lang";
import { useState } from "react";

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

export function CommitHeatmap({
  rows,
  days,
}: {
  rows: HourCell[][];
  days: number;
}) {
  const { lang } = useLang();
  const [picked, setPicked] = useState<HourCell | null>(null);

  const label = (c: HourCell) => {
    const [, m, d] = c.date.split("-");
    return lang === "ko"
      ? `${Number(m)}월 ${Number(d)}일 ${c.hour}시 · 커밋 ${fmtNum(c.count)}개`
      : `${m}/${d} ${c.hour}:00 · ${fmtNum(c.count)} commits`;
  };

  return (
    <figure
      className="m-0 flex flex-col gap-1.5"
      // 합계는 안 읽는다 — 바로 옆 통계 줄이 같은 숫자를 이미 말한다
      aria-label={
        lang === "ko"
          ? `최근 ${days}일 커밋 격자 — 가로 24시간, 세로 하루`
          : `commit grid, last ${days} days — 24 hours across, one day per row`
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

      {/* 축 눈금과 고른 칸을 한 줄에 — 위에 요약 줄을 따로 두면 바로 옆
          통계 줄과 같은 숫자가 두 번 적힌다. 숫자는 통계 줄이 맡는다. */}
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
              ? `최근 ${days}일`
              : `last ${days} days`}
        </span>
      </figcaption>
    </figure>
  );
}
