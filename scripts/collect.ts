/**
 * collect.ts — GitHub API에서 topic `vibelog` 레포들의 활동을 수집한다.
 *
 * pull 방식: 프로젝트 레포에는 아무것도 설치하지 않는다. topic 하나가 등록의 전부다.
 * 체크포인트(content/state.json)의 lastRun 이후 활동만 모은다.
 */
import { Octokit } from "@octokit/rest";
import { PIPELINE_BOT_EMAIL, humanCommitTimes, isBotCommit } from "../lib/bot-commit";
import { HIDDEN_TOPIC } from "../lib/hidden-projects";

export interface RepoCommit {
  sha: string;
  message: string;
  date: string;
  files: string[];
  /** GitHub 로그인(없으면 커밋 author 이름) — 봇 판정용 */
  author?: string;
  /** 커밋에 적힌 작성자 이름 — GitHub 계정과 다를 수 있다 (vibelog-bot은 계정이 actions다) */
  authorName?: string;
  authorEmail?: string;
}

// 봇 판정은 홈·프로젝트의 커밋 수와 같이 쓴다 (lib/bot-commit.ts)
export { isBotCommit } from "../lib/bot-commit";

/**
 * 글 한 편을 쓸 만큼 활동이 있었나 — 본문을 쓴 사람 커밋이 **5개 이상** 모여야 쓴다.
 *
 * 처음엔 "커밋 1개 이상"이었다. apart의 야간 자동 수집 커밋 하나가 12밤 연속으로
 * 글·삽화·쇼츠를 만들었다 (9/23–10/5, 편당 $0.4쯤 낭비). 그래서 봇 커밋을 빼고,
 * 필요한 커밋 수를 5개로 올렸다 — 5개가 모이기 전에는 글과 쇼츠를 만들지
 * 않기로 정했다. PR·세션 요약이 있어도 마찬가지다.
 *
 * 5개가 안 된 레포는 처리 위치(lastRun·lastSha)를 옮기지 않는다. 그래서 그 커밋들은
 * 다음 밤에 다시 읽히고, 5개가 차는 밤의 글에 한꺼번에 들어간다.
 */
export const MIN_HUMAN_COMMITS = 5;
export function enoughForPost(ruleCommits: number): boolean {
  return ruleCommits >= MIN_HUMAN_COMMITS;
}

// 커밋 규칙(본문 40자, 서명 줄 제외)은 check-commit.ts와 같이 쓰려고 commit-rule.ts로 옮겼다
export { RULE_BODY_MIN, followsCommitRule } from "./commit-rule";
import { followsCommitRule } from "./commit-rule";

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
  /** "paused"는 옛 이름 — resting으로 읽는다 */
  status?: "idea" | "building" | "preview" | "live" | "resting" | "paused";
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
  /** 체크포인트 이후의 사람 커밋 수 — 글을 안 쓸 때 이유를 적기 위해 */
  newCommits: number;
  /** 그중 본문을 쓴 커밋 수 — "5개가 모였나"는 이걸로 센다 */
  ruleCommits: number;
  /** 창 안의 봇 커밋 수 (걸러진 것) */
  botCommits: number;
  latestSha: string | null;
  /** 최근 7일 커밋 수 — 프로젝트 카드의 "이번 주 커밋" */
  weekCommits: number;
  /** 오늘(KST) 커밋 수 — 홈의 "오늘 움직임" */
  todayCommits: number;
  /** 레포 전체 누적 커밋 수 — 프로젝트 상세의 "누적 커밋" */
  totalCommits: number;
  /** 최근 HOURS_DAYS일 커밋 시각(ISO) — 홈 잔디 재료. 글 재료(commits)와 달리 안 자른다 */
  commitTimes: string[];
  /** 쇼츠 테마 — vibelog.json "theme" 우선, 없으면 topic "vibelog-theme-<이름>" */
  theme?: string;
  /** topic vibelog-hidden이 달렸나 — 사이트에서 이름·글·쇼츠를 숨긴다 (lib/hidden-projects.ts) */
  hidden: boolean;
  /**
   * 릴리즈 선언 여부 — GitHub Release가 하나라도 있으면 true. 없으면 배포돼
   * 있어도 preview. About Website는
   * 주소 지정용일 뿐 상태와 무관 — 강제 지정은 vibelog.json status로.
   */
  released: boolean;
}

export interface RepoState {
  lastSha?: string;
  lastRun?: string; // ISO
  /** 마지막으로 발행한 글의 날짜 버킷 (KST YYYY-MM-DD) */
  lastDate?: string;
  /** lastDate 글이 다루는 수집 창의 시작 (ISO) — 같은 날 재실행이 이 창을 다시 쓴다 */
  daySince?: string;
  /**
   * 소개 글을 미룬 때의 레포 마지막 푸시 시각 — AI가 "무엇을 만드는지 아직 모르겠다"고
   * 답한 레포는 새로 푸시될 때까지 다시 묻지 않는다 (밤마다 같은 질문에 돈을 쓰지 않게)
   */
  introDeferredAt?: string;
  /**
   * 마지막으로 서비스 이름을 읽은 기획서들의 지문(파일 내용 해시를 이은 것) — 밤마다 레포 파일 목록만
   * 보고 이 값이 같으면 AI를 부르지 않는다 (scripts/plan-name.ts)
   */
  planSha?: string;
}

export type State = Record<string, RepoState>;

/**
 * 수집 창의 커밋은 개수로 자르지 않는다 — 20개로 자르던 때 10/11 vibelog는 사람 커밋 121개 중
 * 최근 20개만 읽혀, 댓글 기능 커밋 19개가 글에서 통째로 빠졌다. 처리 위치는 이미 지나가서
 * 다시 읽히지도 않았다. 이 값은 끝없이 받지 않으려는 안전장치일 뿐이다 (100개씩 10장).
 */
const COMMIT_PAGES = 10;
/** 파일 목록은 커밋마다 따로 불러야 해서 최근 것만 받는다. 나머지 커밋은 메시지만 재료가 된다 */
const COMMIT_FILES = 20;
const MAX_PRS = 10;
const MAX_DEVLOG_FILES = 5;
const README_MAX_CHARS = 3000;
/** 체크포인트가 없는 첫 수집은 최근 7일만 본다 — 오래된 히스토리로 첫 글을 오염시키지 않기 위해 */
const FIRST_RUN_LOOKBACK_DAYS = 7;

function b64(content: string): string {
  return Buffer.from(content, "base64").toString("utf8");
}

export async function getOwner(octokit: Octokit): Promise<string> {
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

export async function getReadme(
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

export async function getCommits(
  octokit: Octokit,
  owner: string,
  repo: string,
  since: string,
  until?: string,
): Promise<RepoCommit[]> {
  const data: Awaited<ReturnType<typeof octokit.rest.repos.listCommits>>["data"] = [];
  for (let page = 1; page <= COMMIT_PAGES; page++) {
    const { data: part } = await octokit.rest.repos.listCommits({ owner, repo, since, ...(until ? { until } : {}), per_page: 100, page });
    data.push(...part);
    if (part.length < 100) break;
  }
  const commits: RepoCommit[] = [];
  for (const [i, c] of data.entries()) {
    // 파일 목록은 커밋별 추가 호출이 필요하다. 최근 COMMIT_FILES개만 (목록은 최신순)
    let files: string[] = [];
    if (i < COMMIT_FILES) {
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
    }
    commits.push({
      sha: c.sha,
      message: c.commit.message,
      date: c.commit.committer?.date ?? c.commit.author?.date ?? "",
      files,
      author: c.author?.login ?? c.commit.author?.name ?? undefined,
      authorName: c.commit.author?.name ?? undefined,
      authorEmail: c.commit.author?.email ?? undefined,
    });
  }
  return commits;
}

/**
 * 커밋 시각만 훑어 온다 — 홈의 커밋 잔디(시간 × 날) 재료.
 *
 * 글 재료를 가져오는 getCommits는 수집 창(마지막 처리 뒤)만 본다. 잔디는 지난
 * HOURS_DAYS일의 진짜 밀도를 보여 줘야 하므로 여기서 따로, 파일 목록 없이
 * 시각만 모두 받는다 (페이지당 100개, 최대 HOURS_PAGES장).
 */
// 봇 커밋도 페이지를 차지하므로 넉넉히 받는다 — vibelog는 2주에 1,000개가 넘는다
const HOURS_PAGES = 15;
/** 잔디가 다시 채우는 기간 — 매 실행이 이 기간을 통째로 새로 계산해 덮는다 */
export const HOURS_DAYS = 14;
export async function getCommitTimes(
  octokit: Octokit,
  owner: string,
  repo: string,
  since: string,
): Promise<string[]> {
  const out: string[] = [];
  for (let page = 1; page <= HOURS_PAGES; page++) {
    const { data } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      since,
      per_page: 100,
      page,
    });
    out.push(...humanCommitTimes(data));
    if (data.length < 100) break; // 마지막 장
  }
  return out;
}

export async function getMergedPRs(
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
 * Vercel API로 "GitHub 레포 → Vercel 프로젝트" 지도를 만든다 (VERCEL_TOKEN 필요).
 * GitHub Deployments 기록보다 이 경로가 우선인 이유: CLI로 올린 배포는 GitHub에
 * 기록이 안 남고(apart가 실제로 그랬다), 기록의 URL은 배포별 해시 주소라 배포마다
 * 바뀐다. 여기선 프로젝트의 고정 production 도메인(커스텀 도메인 우선)이 나온다.
 * 실패·토큰 없음은 조용히 GitHub Deployments 폴백으로.
 */
function vercelTeamQuery(): string {
  return process.env.VERCEL_TEAM_ID ? `&teamId=${process.env.VERCEL_TEAM_ID}` : "";
}

async function getVercelProjectMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>(); // repo명(소문자) → projectId
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    console.log("vercel: VERCEL_TOKEN 없음 — 배포 주소 자동 감지 생략");
    return map;
  }
  try {
    const res = await fetch(
      `https://api.vercel.com/v9/projects?limit=100${vercelTeamQuery()}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) {
      console.warn(`vercel: 프로젝트 조회 실패 (HTTP ${res.status}) — 토큰/팀 ID 확인`);
      return map;
    }
    const data = (await res.json()) as {
      projects?: { id: string; link?: { type?: string; repo?: string } }[];
    };
    for (const p of data.projects ?? []) {
      if (p.link?.type === "github" && p.link.repo) {
        // 같은 레포에 프로젝트가 둘 연결된 경우(signalConsole이 실제 그렇다):
        // API가 최근 활동순으로 주므로 첫 것(활발한 쪽)을 지킨다
        const key = p.link.repo.toLowerCase();
        if (!map.has(key)) map.set(key, p.id);
      }
    }
  } catch {
    console.warn("vercel: 프로젝트 조회 중 네트워크 오류 — GitHub Deployments 폴백");
    return map;
  }
  console.log(`vercel: GitHub 연결된 프로젝트 ${map.size}개 확인`);
  return map;
}

async function getVercelUrl(projectId?: string): Promise<string | null> {
  const token = process.env.VERCEL_TOKEN;
  if (!token || !projectId) return null;
  try {
    const res = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/domains?limit=50${vercelTeamQuery()}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      domains?: { name: string; verified?: boolean }[];
    };
    const names = (data.domains ?? [])
      .filter((d) => d.verified !== false)
      .map((d) => d.name);
    const pick =
      names.find((n) => !n.endsWith(".vercel.app")) ?? // 커스텀 도메인 우선
      names.find((n) => n.endsWith(".vercel.app") && !n.includes("-git-")) ?? // 브랜치 별칭 제외
      names[0];
    return pick ? `https://${pick}` : null;
  } catch {
    return null;
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

/**
 * 배포 주소를 고른다. 우선순위: About Website(커스텀 의도) → Vercel API(고정 도메인)
 * → GitHub Deployments 기록. 아무것도 안 채워도 배포되는 순간 live 판정·카드
 * 링크·쇼츠 데모 URL이 생긴다. 단, About Website가 *.vercel.app이면
 * "커스텀 도메인 의도"가 아니라 예전에 적어 둔 기본 주소다 — 커스텀 도메인을 붙인 뒤에도
 * 옛 주소가 카드·녹화에 남는다 (vibelog.space 전환 때 확인). 이때는 자동 감지가 이긴다.
 *
 * 고른 주소는 로그에 적지 않는다 — 이 레포는 공개라 Actions 로그도 공개다. live 전
 * 주소는 숨기기로 했다 (10/11, scripts/homepage.ts).
 */
async function pickHomepage(
  octokit: Octokit,
  owner: string,
  repo: string,
  about: string | null | undefined,
  vercelProjects: Map<string, string>,
): Promise<string | null> {
  const vercelUrl = await getVercelUrl(vercelProjects.get(repo.toLowerCase()));
  const stalePreset = /^https?:\/\/[^/]+\.vercel\.app\/?$/i.test(about ?? "");
  const preferred = stalePreset && vercelUrl ? vercelUrl : about;
  const homepage = preferred || vercelUrl || (await getDeployedUrl(octokit, owner, repo));
  if (!about && homepage) console.log(`- ${repo}: 배포 주소 자동 감지`);
  else if (stalePreset && vercelUrl && vercelUrl !== about)
    console.log(`- ${repo}: About Website가 기본 주소라 커스텀 도메인 우선`);
  return homepage || null;
}

/**
 * GitHub를 부르는 클라이언트 — 서버 쪽 오류(5xx)는 두 번까지 다시 묻는다.
 * GitHub가 커밋 목록 한 번에 500을 돌려준 것만으로 30분짜리 인식 실행 전체가
 * 실패로 끝나고 실패 메일이 왔다 (10/14 02:00, Anchor 커밋 목록). 잠깐 난 오류라
 * 몇 초 뒤 다시 물으면 된다. 4xx(권한·없음)는 다시 물어도 같으므로 그대로 던진다.
 */
export function githubClient(): Octokit {
  const octokit = new Octokit({ auth: process.env.GH_PAT || process.env.GITHUB_TOKEN || undefined });
  octokit.hook.wrap("request", async (request, options) => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await request(options);
      } catch (err) {
        const status = (err as { status?: number }).status ?? 0;
        if (status < 500 || attempt >= 2) throw err;
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      }
    }
  });
  return octokit;
}

/** 레포 하나의 배포 주소를 지금 찾는다 — 쇼츠만 다시 만드는 실행처럼 수집을 안 거친 경우 */
export async function lookupHomepage(repo: string): Promise<string | null> {
  const octokit = githubClient();
  const owner = await getOwner(octokit);
  const { data } = await octokit.rest.repos.get({ owner, repo });
  return pickHomepage(octokit, owner, repo, data.homepage, await getVercelProjectMap());
}

/** 글 재료가 되는 커밋인가 — 밤 수집과 지난 글 다시 쓰기(run.ts --rewrite)가 같이 쓴다 */
export function isMaterialCommit(c: RepoCommit): boolean {
  return (
    // 파이프라인 자신의 발행 커밋은 재료도 활동도 아니다 — 끼면 글이
    // "자동 발행했다"를 자동 발행하는 자기 인용이 되고, 활동 판정도 헛돈다
    !/^chore: (데브로그 자동 발행|쇼츠 다시 만듦|쇼츠 썸네일 재추출|새 프로젝트 인식|지난 글 다시 씀)/.test(c.message) &&
    // 머지 커밋은 git 자동 메시지라 재료가 아니다 — 글 원료에 브랜치
    // 주소가 그대로 노출되기도 한다
    !/^Merge (branch|remote-tracking branch|pull request)/.test(c.message) &&
    // 레포를 만들 때 GitHub가 찍는 첫 커밋은 일이 아니다 — agency·portfolio-tmp가
    // "Initial commit" 하나로 글·쇼츠가 됐다 (9/24). 커밋 규칙(타입: 요약 + 왜)에
    // 맞지 않는 유일하게 확실한 꼴이라 이것만 거른다
    !/^Initial commit$/i.test(c.message.trim()) &&
    // 봇 커밋은 글 재료도, 활동도 아니다 (isBotCommit 주석)
    !isBotCommit(c)
  );
}

export async function collect(state: State, date?: string): Promise<RepoActivity[]> {
  const octokit = githubClient();
  const owner = await getOwner(octokit);

  const repos = await listVibelogRepos(octokit, owner);
  const vercelProjects = await getVercelProjectMap();

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

    // 배포 주소 — 고르는 순서와 이유는 pickHomepage
    const homepage = await pickHomepage(octokit, owner, repo, r.homepage, vercelProjects);
    // 릴리즈 선언은 GitHub Release 발행 하나뿐. 처음엔 About Website 채움도
    // 선언으로 쳤는데, Website는 "주소 지정"과 겸직이라 다른 세션이 레포를
    // 정리하며 주소만 채워도 live로 승격되는 사고가 났다 (apart — 주소를
    // 비웠는데 다시 채워져 live 복귀). 강제 지정은 vibelog.json status로.
    const released = await octokit.rest.repos
      .listReleases({ owner, repo, per_page: 1 })
      .then((res) => res.data.length > 0)
      .catch(() => false);

    // 테마 지정도 topic 한 개로 — "vibelog-theme-signal"처럼. vibelog.json이 있으면 그게 우선.
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
    const countCommits = (author?: string) =>
      octokit.rest.repos
        .listCommits({ owner, repo, ...(author ? { author } : {}), per_page: 1 })
        .then((r) => {
          const m = r.headers.link?.match(/[?&]page=(\d+)>; rel="last"/);
          return m ? Number(m[1]) : r.data.length;
        })
        .catch(() => 0);
    // 커밋 수는 사람 커밋만 센다. 봇 커밋까지 세던 때는 30분마다 도는 프로젝트 인식이
    // 남긴 커밋이 vibelog 자신의 수를 바꾸고, 바뀐 수를 적으러 다음 회차가 또 커밋해
    // 하루 50개씩 쌓였다 — 홈의 이번 주 커밋이 584개, 잔디는 새벽까지 전부 칠해졌다.
    // 누적은 전체에서 파이프라인 커밋 수를 뺀다 (전부 받아 세기엔 너무 많다)
    const countHumanTotal = async () =>
      Math.max(0, (await countCommits()) - (await countCommits(PIPELINE_BOT_EMAIL)));
    const [
      allCommits,
      mergedPRs,
      devlogFiles,
      readme,
      totalCommits,
      commitTimes,
    ] = await Promise.all([
      getCommits(octokit, owner, repo, since),
      getMergedPRs(octokit, owner, repo, since),
      getDevlogFiles(octokit, owner, repo, since),
      getReadme(octokit, owner, repo),
      countHumanTotal(),
      getCommitTimes(
        octokit,
        owner,
        repo,
        new Date(Date.now() - HOURS_DAYS * 24 * 3600 * 1000).toISOString(),
      ).catch(() => [] as string[]),
    ]);

    // 이번 주·오늘은 잔디와 같은 사람 커밋 시각 목록에서 센다
    const weekCommits = commitTimes.filter((t) => t >= weekAgo).length;
    const todayStart = new Date(kstMidnight).getTime();
    const todayCommits = commitTimes.filter((t) => new Date(t).getTime() >= todayStart).length;

    // 파이프라인 자신의 발행 커밋은 재료도 활동도 아니다 — 끼면 글이
    // "자동 발행했다"를 자동 발행하는 자기 인용이 되고, 활동 판정도 헛돈다
    const commits = allCommits.filter(isMaterialCommit);
    const botCommits = allCommits.length - commits.length;

    // 활동 판정은 체크포인트 sha "이후" 커밋만 센다 (목록은 최신순).
    // 글 재료는 창 전체(commits) — 재실행에도 하루치가 통째로 들어간다.
    const idx = prev?.lastSha
      ? commits.findIndex((c) => c.sha === prev.lastSha)
      : -1;
    const newCommits = idx === -1 ? commits : commits.slice(0, idx);
    const ruleCommits = newCommits.filter((c) => followsCommitRule(c.message)).length;
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
      hasActivity: enoughForPost(ruleCommits),
      newCommits: newCommits.length,
      ruleCommits,
      botCommits,
      latestSha: commits[0]?.sha ?? prev?.lastSha ?? null,
      weekCommits,
      todayCommits,
      totalCommits,
      commitTimes,
      ...(theme ? { theme } : {}),
      hidden: (r.topics ?? []).includes(HIDDEN_TOPIC),
      released,
    });
  }
  return results;
}
