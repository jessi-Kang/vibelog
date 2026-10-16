/**
 * 봇이 남긴 커밋인가 — 글 재료를 고르는 수집(scripts/collect.ts)과 홈·프로젝트의
 * 커밋 수(app/api/commits·repo-stats)가 같이 쓴다.
 *
 * 로그인·이름·메일 로컬파트에 "bot"이 낱말로 들어 있으면 봇이다 —
 * github-actions[bot], dependabot[bot], apt-gam-bot, vibelog-bot,
 * bot@users.noreply.github.com. "Botond" 같은 이름은 낱말 경계로 비껴간다.
 *
 * 사이트별 목록을 두지 않는다 — 어느 레포의 자동 커밋이든 같은 규칙으로 걸러야
 * 새 프로젝트에서 또 새지 않는다.
 */
const BOT_WORD = /(^|[^a-z0-9])bot([^a-z0-9]|$)/i;

export interface CommitAuthor {
  /** GitHub 로그인(없으면 커밋 author 이름) */
  author?: string;
  /** 커밋에 적힌 작성자 이름 — GitHub 계정과 다를 수 있다 (vibelog-bot은 계정이 actions다) */
  authorName?: string;
  authorEmail?: string;
}

export function isBotCommit(c: CommitAuthor): boolean {
  // 계정 이름과 커밋에 적힌 이름을 둘 다 본다. 계정 이름만 보던 때는 vibelog 밤 실행이
  // 남기는 커밋(이름 vibelog-bot, 계정 actions)을 사람 커밋으로 셌다 (Jev 시험에서 드러났다).
  const local = (c.authorEmail ?? "").split("@")[0];
  return BOT_WORD.test(c.author ?? "") || BOT_WORD.test(c.authorName ?? "") || BOT_WORD.test(local);
}

/** GitHub 커밋 목록 API가 돌려주는 한 줄 — 봇 판정과 시각에 쓰는 필드만 */
export interface ApiCommit {
  author?: { login?: string } | null;
  commit: {
    author?: { name?: string; email?: string; date?: string } | null;
    committer?: { date?: string } | null;
  };
}

export function isBotApiCommit(c: ApiCommit): boolean {
  return isBotCommit({
    author: c.author?.login,
    authorName: c.commit.author?.name,
    authorEmail: c.commit.author?.email,
  });
}

/** 사람 커밋의 시각만 (커밋된 시각, 없으면 쓴 시각) */
export function humanCommitTimes(list: ApiCommit[]): string[] {
  const out: string[] = [];
  for (const c of list) {
    if (isBotApiCommit(c)) continue;
    const t = c.commit.committer?.date ?? c.commit.author?.date;
    if (t) out.push(t);
  }
  return out;
}

/**
 * vibelog 파이프라인이 남기는 커밋의 작성자 메일 (devlog.yml·projects.yml의 git config).
 * 누적 커밋 수는 전부 받아 세기엔 너무 많아서, 전체 수에서 이 메일로 쓴 커밋 수를 뺀다
 */
export const PIPELINE_BOT_EMAIL = "actions@users.noreply.github.com";
