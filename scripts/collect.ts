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
  /** 쇼츠 영상 테마 — terminal(기본)/blueprint/signal/paper/highlighter */
  theme?: string;
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
  /** 레포 전체 누적 커밋 수 — 프로젝트 상세의 "누적 커밋" */
  totalCommits: number;
  /** 쇼츠 테마 — vibelog.json "theme" 우선, 없으면 topic "vibelog-theme-<이름>" */
  theme?: string;
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

/**
 * topic `vibelog` 레포 목록. search API를 쓰지 않는다 — search는 새 레포·새
 * topic이 인덱스에 반영되기까지 지연이 있고, fork를 기본 제외하고, fine-grained
 * PAT에서 불완전해서 "topic을 달았는데 안 잡히는" 사고가 난다 (apart 레포가
 * 실제로 그랬다). 인증 사용자의 레포를 직접 나열하고 topics로 거른다.
 */
async function listVibelogRepos(octokit: Octokit, owner: string) {
  try {
    // GH_PAT 경로 — private 포함 내 레포 전부, topic이 달리는 즉시 보인다
    const repos = await octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
      per_page: 100,
      sort: "pushed",
    });
    return repos.filter(
      (r) =>
        r.owner.login.toLowerCase() === owner.toLowerCase() &&
        (r.topics ?? []).includes("vibelog"),
    );
  } catch {
    // GITHUB_TOKEN 폴백 — 설치 토큰은 /user 엔드포인트가 안 되므로 search로.
    // fork:true — search는 fork를 기본 제외한다.
    const { data } = await octokit.rest.search.repos({
      q: `topic:vibelog user:${owner} fork:true`,
      per_page: 100,
    });
    return data.items;
  }
}

/**
 * About의 Website(homepage)가 비어 있을 때 배포 주소를 자동 감지한다 — 손품 제로.
 * Vercel·GitHub Pages 연동은 배포마다 GitHub Deployments에 기록을 남기므로,
 * 최신 production 계열 배포의 성공 상태에서 environment_url을 읽는다.
 * Website 칸을 채우면 그게 우선 (커스텀 도메인·깔끔한 주소용).
 * preview 배포는 건너뛴다 — 브랜치 미리보기가 대표 주소가 되면 안 된다.
 */
async function getDeployedUrl(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<string | null> {
  try {
    const { data: deployments } = await octokit.rest.repos.listDeployments({
      owner,
      repo,
      per_page: 10,
    });
    for (const d of deployments) {
      // 최신순
      if ((d.environment ?? "").toLowerCase().includes("preview")) continue;
      const { data: statuses } =
        await octokit.rest.repos.listDeploymentStatuses({
          owner,
          repo,
          deployment_id: d.id,
          per_page: 5,
        });
      const ok = statuses.find(
        (s) => s.state === "success" && s.environment_url,
      );
      if (ok?.environment_url) return ok.environment_url;
    }
  } catch {
    // Deployments 기록 없음 — homepage 없이 진행 (building 판정)
  }
  return null;
}

export async function collect(state: State, date?: string): Promise<RepoActivity[]> {
  const auth = process.env.GH_PAT || process.env.GITHUB_TOKEN || undefined;
  const octokit = new Octokit({ auth });
  const owner = await getOwner(octokit);

  const repos = await listVibelogRepos(octokit, owner);

  const results: RepoActivity[] = [];
  for (const r of repos) {
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

    // 배포 주소: About Website 우선, 없으면 Deployments 기록에서 자동 감지 —
    // Jessi가 아무것도 안 채워도 배포되는 순간 live 판정·카드 링크·쇼츠 데모
    // URL이 생긴다 ("수동이네" 지적).
    const homepage = r.homepage || (await getDeployedUrl(octokit, owner, repo));

    // 테마 지정도 topic 한 개로 — "vibelog-theme-signal"처럼 (Jessi 지시:
    // 파일 만들기보다 topic이 손품이 덜하다). vibelog.json이 있으면 그게 우선.
    const topicTheme = (r.topics ?? [])
      .find((t) => t.startsWith("vibelog-theme-"))
      ?.slice("vibelog-theme-".length);
    const theme = vibelogJson?.theme ?? topicTheme;

    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    // KST 자정 — 오늘 커밋 수의 창 시작
    const kstMidnight = `${new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)}T00:00:00+09:00`;
    // per_page=1로 요청하면 Link 헤더의 마지막 페이지 번호가 총 개수다.
    // 한 페이지(100개)를 받아 length를 세면 100에서 포화한다 — 이번 주 커밋이
    // 100개를 넘던 날 "이번 주"와 "오늘"이 똑같이 100으로 잘렸다.
    const countCommits = (since?: string) =>
      octokit.rest.repos
        .listCommits({ owner, repo, ...(since ? { since } : {}), per_page: 1 })
        .then((r) => {
          const m = r.headers.link?.match(/[?&]page=(\d+)>; rel="last"/);
          return m ? Number(m[1]) : r.data.length;
        })
        .catch(() => 0);
    const countAllCommits = () => countCommits();
    const [
      allCommits,
      mergedPRs,
      devlogFiles,
      readme,
      weekCommits,
      todayCommits,
      totalCommits,
    ] = await Promise.all([
      getCommits(octokit, owner, repo, since),
      getMergedPRs(octokit, owner, repo, since),
      getDevlogFiles(octokit, owner, repo, since),
      getReadme(octokit, owner, repo),
      countCommits(weekAgo),
      countCommits(new Date(kstMidnight).toISOString()),
      countAllCommits(),
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
      homepage,
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
      totalCommits,
      ...(theme ? { theme } : {}),
    });
  }
  return results;
}
