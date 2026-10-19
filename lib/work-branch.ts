/**
 * 어느 브랜치를 읽나 — 가장 최근에 사람 커밋이 올라온 브랜치.
 *
 * 수집이 기본 브랜치만 읽던 때, 거짓말 탐정은 작업을 `preview`에만 올리고 있어서
 * 하루 103개 커밋이 통째로 안 보였다. 새 커밋이 0개로 세어져 실행 기록에 이름도
 * 남지 않았다 (10/19). 브랜치를 기본으로 바꾸라고 요구하지 않고 이쪽이 따라간다.
 *
 * 브랜치 전부를 합치지 않는 이유: 스쿼시 병합이면 같은 작업이 브랜치 쪽 커밋과
 * 기본 브랜치 쪽 묶음 커밋으로 두 번 세어진다. 한 브랜치만 읽으면 그런 일이 없다.
 *
 * 수집(scripts/collect.ts)이 정하고 projects.json의 `branch`에 적는다 — 기본
 * 브랜치와 다를 때만. 홈·프로젝트의 실시간 커밋 수(lib/github-server.ts)는 그 값을 읽는다.
 */

export interface BranchTip {
  name: string;
  /** 가장 새 사람 커밋이 커밋된 시각 (ISO) */
  date: string;
  /** 최근 커밋이 전부 봇 커밋인가 — 봇만 만지는 브랜치는 작업 브랜치가 아니다 */
  bot: boolean;
}

/** 사람 커밋이 가장 최근인 브랜치. 시각이 같으면 기본 브랜치, 고를 것이 없어도 기본 브랜치 */
export function pickWorkBranch(defaultBranch: string, tips: BranchTip[]): string {
  let best: BranchTip | undefined;
  for (const t of tips) {
    if (t.bot || !t.date) continue;
    if (
      !best ||
      t.date > best.date ||
      (t.date === best.date && t.name === defaultBranch)
    ) {
      best = t;
    }
  }
  return best?.name ?? defaultBranch;
}
