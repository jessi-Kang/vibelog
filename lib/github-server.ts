/**
 * 서버에서 GitHub를 읽는 공용 함수 — `/api/commits`(홈)와 `/api/repo-stats`(프로젝트 상세)가 같이 쓴다.
 *
 * 토큰(`GH_PAT`/`GITHUB_TOKEN`)으로 읽어야 비공개 레포가 보인다. 브라우저가 GitHub를
 * 직접 부르던 상세 페이지는 비공개 레포에서 늘 404였다 (10/11).
 */
import { PIPELINE_BOT_EMAIL, humanCommitTimes, type ApiCommit } from "@/lib/bot-commit";

const API = "https://api.github.com";

const TOKEN = process.env.GH_PAT || process.env.GITHUB_TOKEN;

function headers(withToken: boolean): HeadersInit {
  return {
    accept: "application/vnd.github+json",
    ...(withToken && TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
  };
}

export function repoOf(repoUrl: string): string | null {
  return repoUrl.match(/github\.com\/([^/]+\/[^/]+)/)?.[1] ?? null;
}

export async function ghGet(path: string): Promise<Response> {
  const url = `${API}${path}`;
  const res = await fetch(url, {
    headers: headers(true),
    signal: AbortSignal.timeout(8000),
  });
  if (res.ok) return res;
  // 토큰이 만료·오설정이면 401/403이 온다. 공개 레포는 토큰 없이도 읽히므로 한 번 더
  // 맨손으로 물어본다 — 잘못된 토큰 하나가 기능을 죽이면 안 된다
  if (TOKEN && (res.status === 401 || res.status === 403)) {
    const plain = await fetch(url, {
      headers: headers(false),
      signal: AbortSignal.timeout(8000),
    });
    if (plain.ok) return plain;
    throw new Error(`GitHub ${res.status}/${plain.status} ${path}`);
  }
  throw new Error(`GitHub ${res.status} ${path}`);
}

/** 읽을 브랜치의 쿼리 조각 — 없으면 기본 브랜치 (수집이 projects.json에 적는다, lib/work-branch.ts) */
export function branchQuery(branch?: string): string {
  return branch ? `sha=${encodeURIComponent(branch)}&` : "";
}

/** per_page=1의 Link 헤더 마지막 페이지 번호가 총 개수 (collect.ts와 같은 기법) */
export function countFromLink(res: Response, bodyLen: number): number {
  const last = res.headers.get("link")?.match(/[?&]page=(\d+)>;\s*rel="last"/);
  return last ? Number(last[1]) : bodyLen;
}

export async function countSince(repo: string, since?: string, branch?: string): Promise<number> {
  const q = (since ? `since=${encodeURIComponent(since)}&` : "") + branchQuery(branch);
  const res = await ghGet(`/repos/${repo}/commits?${q}per_page=1`);
  return countFromLink(res, ((await res.json()) as unknown[]).length);
}

/**
 * 사람 커밋의 시각 목록 — 봇 커밋은 뺀다 (lib/bot-commit.ts). 봇 커밋도 페이지를
 * 차지하므로 넉넉히 받는다: vibelog는 파이프라인 커밋만 하루 50개 안팎이었다
 */
export async function humanTimesSince(repo: string, since: string, branch?: string, pages = 10): Promise<string[]> {
  const out: string[] = [];
  for (let page = 1; page <= pages; page++) {
    const res = await ghGet(
      `/repos/${repo}/commits?${branchQuery(branch)}since=${encodeURIComponent(since)}&per_page=100&page=${page}`,
    );
    const data = (await res.json()) as ApiCommit[];
    out.push(...humanCommitTimes(data));
    if (data.length < 100) break;
  }
  return out;
}

/** 누적 사람 커밋 수 — 전부 받아 세기엔 많아서, 전체에서 파이프라인 커밋 수를 뺀다 */
export async function humanTotal(repo: string, branch?: string): Promise<number> {
  const bot = await ghGet(
    `/repos/${repo}/commits?${branchQuery(branch)}author=${encodeURIComponent(PIPELINE_BOT_EMAIL)}&per_page=1`,
  );
  const botCount = countFromLink(bot, ((await bot.json()) as unknown[]).length);
  return Math.max(0, (await countSince(repo, undefined, branch)) - botCount);
}
