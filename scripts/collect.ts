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
  hasActivity: boolean;
  latestSha: string | null;
}

export interface RepoState {
  lastSha?: string;
  lastRun?: string; // ISO
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

export async function collect(state: State): Promise<RepoActivity[]> {
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
    const since = state[repo]?.lastRun ?? fallbackSince;

    const vibelogJson = await getVibelogJson(octokit, owner, repo);
    if (vibelogJson?.hide) continue;

    const [commits, mergedPRs, devlogFiles, readme] = await Promise.all([
      getCommits(octokit, owner, repo, since),
      getMergedPRs(octokit, owner, repo, since),
      getDevlogFiles(octokit, owner, repo, since),
      getReadme(octokit, owner, repo),
    ]);

    // 체크포인트 sha와 같은 커밋만 있으면 활동 없음으로 본다
    const newCommits = commits.filter((c) => c.sha !== state[repo]?.lastSha);

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
      commits: newCommits,
      mergedPRs,
      devlogFiles,
      hasActivity:
        newCommits.length > 0 || mergedPRs.length > 0 || devlogFiles.length > 0,
      latestSha: commits[0]?.sha ?? state[repo]?.lastSha ?? null,
    });
  }
  return results;
}
