/**
 * collect.ts — GitHub API에서 topic `vibelog` 레포들의 활동을 수집한다.
 *
 * pull 방식: 프로젝트 레포에는 아무것도 설치하지 않는다. topic 하나가 등록의 전부다.
 * 체크포인트(content/state.json)의 lastRun 이후 활동만 모은다.
 */
import { Octokit } from "@octokit/rest";

export interface RepoCommit {
  sha: string;
  message: string;
  date: string;
  files: string[];
}

export interface RepoPR {
  number: number;
  title: string;
  body: string;
  mergedAt: string;
}

export interface RepoDevlogFile {
  name: string;
  content: string;
}

export interface VibelogJson {
  name?: string;
  status?: "idea" | "building" | "live" | "paused";
  stack?: string[];
  hide?: boolean;
  demo?: unknown;
}

export interface RepoActivity {
  repo: string;
  owner: string;
  description: string;
  homepage: string | null;
  language: string | null;
  repoUrl: string;
  pushedAt: string;
  vibelogJson: VibelogJson | null;
  readme: string;
  commits: RepoCommit[];
  mergedPRs: RepoPR[];
  devlogFiles: RepoDevlogFile[];
  /** 이번 수집이 실제로 쓴 창의 시작 — run.ts가 state.daySince로 저장한다 */
  since: string;
  hasActivity: boolean;
  latestSha: string | null;
  /** 최근 7일 커밋 수 — 프로젝트 카드의 "이번 주 커밋" */
  weekCommits: number;
  /** 오늘(KST) 커밋 수 — 홈의 "오늘 움직임" (Jessi 지시: 개수 말고 커밋 수) */
  todayCommits: number;
}

export interface RepoState {
  lastSha?: string;
  lastRun?: string; // ISO
  /** 마지막으로 발행한 글의 날짜 버킷 (KST YYYY-MM-DD) */
  lastDate?: string;
  /** lastDate 글이 다루는 수집 창의 시작 (ISO) — 같은 날 재실행이 이 창을 다시 쓴다 */
  daySince?: string;
}

export type State = Record<string, RepoState>;

const MAX_COMMITS = 20;
const MAX_PRS = 10;
const MAX_DEVLOG_FILES = 5;
const README_MAX_CHARS = 3000;
/** 체크포인트가 없는 첫 수집은 최근 7일만 본다 — 오래된 히스토리로 첫 글을 오염시키지 않기 위해 */
const FIRST_RUN_LOOKBACK_DAYS = 7;

function b64(content: string): string {
  return Buffer.from(content, "base64").toString("utf8");
}

async function getOwner(octokit: Octokit): Promise<string> {
  if (process.env.VIBELOG_OWNER) return process.env.VIBELOG_OWNER;
  // Actions의 GITHUB_TOKEN으로는 getAuthenticated가 안 되므로 레포 소유자로 폴백
  if (process.env.GITHUB_REPOSITORY) {
    return process.env.GITHUB_REPOSITORY.split("/")[0];
  }
  const { data } = await octokit.rest.users.getAuthenticated();
  return data.login;
}

async function getVibelogJson(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<VibelogJson | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: "vibelog.json",
    });
    if (Array.isArray(data) || data.type !== "file") return null;
    return JSON.parse(b64(data.content)) as VibelogJson;
  } catch {
    return null;
  }
}

async function getReadme(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<string> {
  try {
    const { data } = await octokit.rest.repos.getReadme({ owner, repo });
    return b64(data.content).slice(0, README_MAX_CHARS);
  } catch {
    return "";
  }
}

async function getCommits(
  octokit: Octokit,
  owner: string,
  repo: string,
  since: string,
): Promise<RepoCommit[]> {
  const { data } = await octokit.rest.repos.listCommits({
    owner,
    repo,
    since,
    per_page: MAX_COMMITS,
  });
  const commits: RepoCommit[] = [];
  for (const c of data) {
    // 파일 목록은 커밋별 추가 호출이 필요하다. 데브로그 재료로 쓸 만큼만.
    let files: string[] = [];
    try {
      const { data: detail } = await octokit.rest.repos.getCommit({
        owner,
        repo,
        ref: c.sha,
      });
      files = (detail.files ?? []).map((f) => f.filename).slice(0, 30);
    } catch {
      // 파일 목록 없이도 데브로그는 쓸 수 있다
    }
    commits.push({
      sha: c.sha,
      message: c.commit.message,
      date: c.commit.committer?.date ?? c.commit.author?.date ?? "",
      files,
    });
  }
  return commits;
}

async function getMergedPRs(
  octokit: Octokit,
  owner: string,
  repo: string,
  since: string,
): Promise<RepoPR[]> {
  try {
    const { data } = await octokit.rest.pulls.list({
      owner,
      repo,
      state: "closed",
      sort: "updated",
      direction: "desc",
      per_page: 30,
    });
    return data
      .filter((p) => p.merged_at && p.merged_at >= since)
      .slice(0, MAX_PRS)
      .map((p) => ({
        number: p.number,
        title: p.title,
        body: (p.body ?? "").slice(0, 2000),
        mergedAt: p.merged_at as string,
      }));
  } catch {
    return [];
  }
}

async function getDevlogFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  since: string,
): Promise<RepoDevlogFile[]> {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: "devlog",
    });
    if (!Array.isArray(data)) return [];
    const sinceDate = since.slice(0, 10);
    const targets = data
      .filter(
        (f) =>
          f.type === "file" &&
          /^\d{4}-\d{2}-\d{2}\.md$/.test(f.name) &&
          f.name.slice(0, 10) >= sinceDate,
      )
      .slice(-MAX_DEVLOG_FILES);
    const files: RepoDevlogFile[] = [];
    for (const f of targets) {
      const { data: file } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: f.path,
      });
      if (!Array.isArray(file) && file.type === "file") {
        files.push({ name: f.name, content: b64(file.content) });
      }
    }
    return files;
  } catch {
    return [];
  }
}

export async function collect(state: State, date?: string): Promise<RepoActivity[]> {
  const auth = process.env.GH_PAT || process.env.GITHUB_TOKEN || undefined;
  const octokit = new Octokit({ auth });
  const owner = await getOwner(octokit);

  const { data: search } = await octokit.rest.search.repos({
    q: `topic:vibelog user:${owner}`,
    per_page: 100,
  });

  const results: RepoActivity[] = [];
  for (const r of search.items) {
    const repo = r.name;
    const fallbackSince = new Date(
      Date.now() - FIRST_RUN_LOOKBACK_DAYS * 24 * 3600 * 1000,
    ).toISOString();
    // 글은 날짜 버킷당 하나이므로, 같은 날의 재실행은 그날 첫 실행이 쓴 수집 창을
    // 그대로 다시 쓴다. lastRun만 기준으로 하면 재실행마다 "그 사이 커밋" 조각으로
    // 하루치 글을 통째로 덮어써 이전 내용이 지워진다.
    const prev = state[repo];
    const since =
      date && prev?.lastDate === date && prev.daySince
        ? prev.daySince
        : (prev?.lastRun ?? fallbackSince);

    const vibelogJson = await getVibelogJson(octokit, owner, repo);
    if (vibelogJson?.hide) continue;

    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    // KST 자정 — 오늘 커밋 수의 창 시작
    const kstMidnight = `${new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)}T00:00:00+09:00`;
    const countCommits = (sinceIso: string) =>
      octokit.rest.repos
        .listCommits({ owner, repo, since: sinceIso, per_page: 100 })
        .then((r) => r.data.length)
        .catch(() => 0);
    const [allCommits, mergedPRs, devlogFiles, readme, weekCommits, todayCommits] =
      await Promise.all([
        getCommits(octokit, owner, repo, since),
        getMergedPRs(octokit, owner, repo, since),
        getDevlogFiles(octokit, owner, repo, since),
        getReadme(octokit, owner, repo),
        countCommits(weekAgo),
        countCommits(new Date(kstMidnight).toISOString()),
      ]);

    // 파이프라인 자신의 발행 커밋은 재료도 활동도 아니다 — 끼면 글이
    // "자동 발행했다"를 자동 발행하는 자기 인용이 되고, 활동 판정도 헛돈다
    const commits = allCommits.filter(
      (c) => !/^chore: (데브로그 자동 발행|쇼츠 다시 만듦)/.test(c.message),
    );

    // 활동 판정은 체크포인트 sha "이후" 커밋만 센다 (목록은 최신순).
    // 글 재료는 창 전체(commits) — 재실행에도 하루치가 통째로 들어간다.
    const idx = prev?.lastSha
      ? commits.findIndex((c) => c.sha === prev.lastSha)
      : -1;
    const newCommits = idx === -1 ? commits : commits.slice(0, idx);
    const newPRs = prev?.lastRun
      ? mergedPRs.filter((p) => p.mergedAt > prev.lastRun!)
      : mergedPRs;

    results.push({
      repo,
      owner,
      description: r.description ?? "",
      homepage: r.homepage || null,
      language: r.language ?? null,
      repoUrl: r.html_url,
      pushedAt: r.pushed_at ?? "",
      vibelogJson,
      readme,
      commits,
      mergedPRs,
      devlogFiles,
      since,
      hasActivity:
        newCommits.length > 0 || newPRs.length > 0 || devlogFiles.length > 0,
      latestSha: commits[0]?.sha ?? prev?.lastSha ?? null,
      weekCommits,
      todayCommits,
    });
  }
  return results;
}
