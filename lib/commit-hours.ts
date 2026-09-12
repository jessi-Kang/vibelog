/**
 * 시간별 커밋 격자의 셈 — 잔디(그림)와 통계 줄(숫자)이 같은 계산을 쓴다.
 *
 * 둘이 각자 세던 시절엔 같은 화면에서 다른 말을 했다 (Jessi 지적:
 * "지난 실행, 커밋 수, 잔디가 모두 같은걸 보고 갱신해야지"). 그래서 셈은
 * 여기 순수 함수 하나로 모으고, 재료는 home-stats가 한 번만 받아 온다.
 */

/** 세로 — 최근 며칠. 모바일 한 화면을 안 잡아먹는 길이 */
export const HEATMAP_DAYS = 7;

/** 날짜(KST) → 0~23시 커밋 수 */
export type CommitHours = Record<string, number[]>;

/** /api/commits 응답 — 서버가 센 실시간 값 (화면과 격자가 같이 쓴다) */
export interface LiveCounts {
  /** 센 기준 날짜(KST) — 방문자 자정을 넘겼는지 가린다 */
  date: string;
  today: number;
  week: number;
  /** 오늘 0~23시 커밋 수 */
  row: number[];
}

export interface HourCell {
  date: string;
  hour: number;
  count: number;
}

/** 파이프라인(run.ts todayKST)과 같은 식 — 시계만 방문자 것 */
export function todayKst(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** ISO 시각들 → 0~23시(KST) 개수 */
export function hourHistogram(times: string[]): number[] {
  const row = new Array<number>(24).fill(0);
  for (const iso of times) {
    const t = new Date(iso);
    if (Number.isNaN(t.getTime())) continue;
    row[new Date(t.getTime() + 9 * 3600 * 1000).getUTCHours()] += 1;
  }
  return row;
}

/**
 * 최근 HEATMAP_DAYS일치 격자.
 * 오늘 줄만 실시간 값이 이긴다 — 저장값은 밤에 정산된 것이라 낮엔 옛것이다.
 */
export function hourRows(
  hours: CommitHours,
  today: string,
  liveToday: number[] | null,
): { rows: HourCell[][]; total: number; peak: number } {
  const rows: HourCell[][] = [];
  let total = 0;
  let peak = 0;
  for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const day = (i === 0 ? liveToday : null) ?? hours[date] ?? [];
    rows.push(
      Array.from({ length: 24 }, (_, hour) => {
        const count = day[hour] ?? 0;
        total += count;
        if (count > peak) peak = count;
        return { date, hour, count };
      }),
    );
  }
  return { rows, total, peak };
}
