import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { PostFigure } from "../scripts/figure-types";
import { firstTermsOnly, plainTerms, termsOnly } from "./term-marker";
import { aliasName, hiddenSlugs, isHiddenProject } from "./hidden-projects";

const CONTENT_DIR = path.join(process.cwd(), "content");

export type ProjectStatus = "idea" | "building" | "preview" | "live" | "resting";

export interface Project {
  slug: string; // 레포 이름
  /** 프로젝트 식별색 — 파이프라인이 한 번 정하면 바꾸지 않는다 (lib/project-color.ts) */
  color?: string;
  /** 화면에 쓰는 이름 — vibelog.json name > 소개 글이 코드에서 찾은 서비스 이름 > 레포 이름 */
  name: string;
  nameEn?: string;
  /** 소개 글이 코드를 읽고 쓴 프로젝트 설명 한두 문장 — 글 제목 아래에 붙고, 누르면 소개 글로 간다 */
  about?: string;
  aboutEn?: string;
  /** 프로젝트 아이콘 (Tabler outline) — 소개 글이 고른다 (lib/project-icon.ts) */
  icon?: import("./project-icon").ProjectIcon;
  description: string;
  /** 파이프라인이 만든 영어 번역 — 없으면 UI가 ko로 폴백 */
  descriptionEn?: string;
  status: ProjectStatus;
  stack: string[];
  repoUrl: string;
  /** 읽는 브랜치 — 기본 브랜치가 아닐 때만 적힌다 (lib/work-branch.ts) */
  branch?: string;
  homepage?: string;
  language?: string;
  lastActivity: string; // ISO date
  weekCommits?: number; // collect 단계에서 계산
  todayCommits?: number; // 오늘(KST) 커밋 수 — 홈 "오늘 커밋"
  countsDate?: string; // 위 카운트들의 기준 날짜(KST) — 자정 지나면 화면이 0으로 판정
  totalCommits?: number; // 레포 전체 누적 커밋 — 프로젝트 상세
  /** 쇼츠 테마 — topic vibelog-theme-<이름>에서. 없으면 terminal */
  theme?: string;
  /** topic vibelog-hidden — 방문자에게는 이름 대신 "미공개 프로젝트 <alias>" (lib/hidden-projects.ts) */
  hidden?: boolean;
  alias?: string;
  /** 방문자용 익명 카드 — 이름·설명·주소가 없고 누를 수 없다 (getProjectCards) */
  anon?: boolean;
  /** 카드가 가는 곳 — 관리자 화면의 숨긴 프로젝트는 /private/projects/<slug> */
  href?: string;
}

/** 데브로그 본문의 고정 구조 — "뭘 했다 / 왜 / 삽질 포인트 / 다음 할 것" */
export interface DevlogSections {
  did?: string;
  why?: string;
  fail?: string;
  next?: string;
  /** 소개 글에만 — "지금까지 만든 것" */
  built?: string;
  /** 그 밖의 소식 — 이야기 하나에 못 담은 큰 작업, 소식마다 두 문장 (docs/post-other-work.html A안) */
  news?: string;
}

export interface DevlogEntry {
  repo: string;
  date: string; // YYYY-MM-DD
  title: string;
  titleEn?: string;
  manual: boolean;
  body: string; // 마크다운 본문 (KR)
  bodyEn?: string; // 영어 번역 — <!-- en --> 구분자 뒤
  sections: DevlogSections; // KR 본문의 섹션 파싱 (실패 시 빈 객체 → body 폴백)
  sectionsEn: DevlogSections;
  /** 실제 삽질이 있는 글인지 — "특별한 삽질은 없었습니다" 류는 false */
  hasFail: boolean;
  summary?: string; // 목록용 — "뭘 했다" 첫 문장
  summaryEn?: string; // 목록용 — EN 본문 "What I did" 첫 문장
  commits?: number; // 원료 커밋 수 (frontmatter)
  prs?: number;
  shas?: [string, string][]; // 원료 git log [sha, 한 줄 메시지]
  shasEn?: [string, string][]; // 커밋 메시지 영어 번역 (파이프라인 생성)
  day: number; // 이 레포의 몇 번째 글
  short?: ShortsMeta; // 이 글의 쇼츠 (있으면)
  /** 책 삽화처럼 문단 사이에 들어가는 그림. 검증을 통과한 것만 실린다 */
  figures?: PostFigure[];
  /** 이 글이 이어 가는 같은 레포 지난 글의 날짜 (frontmatter continues). 그 글이 있을 때만 */
  continues?: string;
  /**
   * 프로젝트 소개 글 (frontmatter intro: true) — 그 프로젝트의 첫 글. 커밋이 아니라 레포
   * 코드를 읽고 쓴다 (scripts/intro.ts). day 번호를 세지 않는다(0): 소개 글을 나중에
   * 넣은 프로젝트는 번호가 밀려, 이미 만든 쇼츠에 박힌 DAY 번호와 어긋나기 때문이다.
   */
  intro?: boolean;
}

export interface ShortsMeta {
  /** 관리자 화면의 숨긴 쇼츠 — "숨김" 칩, 글 주소는 /private/p/… (components/private-data.tsx) */
  hidden?: boolean;
  href?: string;
  repo: string;
  date: string;
  template: string;
  hook: string; // 훅 문장 (썸네일용)
  hookKeywords: string[];
  title: string; // 데브로그 제목
  day: number;
  duration?: number; // 초
  /** koSm·enSm: 작게 보는 화면용 540×960 사본 (scripts/small-video.ts) */
  media?: { ko?: string; en?: string; koSm?: string; enSm?: string; poster?: string; posterEn?: string };
}

export interface RunLogLine {
  text: string;
  /** EN 모드 표기 — 없으면 text(ko) 폴백 */
  textEn?: string;
  kind?: "cmd" | "ok" | "fail" | "cur";
}

export interface RunLog {
  at: string; // ISO
  lines: RunLogLine[];
}

/* ---------- projects ---------- */

// 숨긴 프로젝트(topic vibelog-hidden, lib/hidden-projects.ts)는 사이트에서 빠진다. 파이프라인 스크립트는
// 시작할 때 includeHiddenProjects()를 불러 전부 본다 — 숨긴 레포도 글은 계속 쌓인다
let showHidden = false;
export function includeHiddenProjects(): void {
  showHidden = true;
}
const visible = (slug: string, all?: boolean) => showHidden || all === true || !isHiddenProject(slug);
/** all: 숨긴 프로젝트까지 — 관리자 전용 화면(/private, /api/private)만 쓴다 */
export interface ContentOpts {
  all?: boolean;
}

/** 숨긴 프로젝트까지 — 이름이 나오지 않는 숫자(홈 커밋 수·잔디)만 쓴다 */
export function getAllProjects(): Project[] {
  const file = path.join(CONTENT_DIR, "projects.json");
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf8")) as Project[];
}

export function getProjects(opts: ContentOpts = {}): Project[] {
  const file = path.join(CONTENT_DIR, "projects.json");
  if (!fs.existsSync(file)) return [];
  const projects: Project[] = JSON.parse(fs.readFileSync(file, "utf8"));
  // 옛 상태 이름 — 다음 인식이 다시 적기 전까지 resting으로 읽는다
  for (const p of projects) if ((p.status as string) === "paused") p.status = "resting";
  // 마지막 활동은 저장값과 최신 데브로그 날짜 중 더 최근 것 — 오늘 글이
  // 나왔으면 밤 실행을 기다리지 않고도 "오늘 움직임"으로 잡힌다
  const latestPost = new Map<string, string>();
  for (const d of getDevlogs(undefined, opts)) {
    const cur = latestPost.get(d.repo);
    if (!cur || d.date > cur) latestPost.set(d.repo, d.date);
  }
  for (const p of projects) {
    const post = latestPost.get(p.slug);
    if (post && post > p.lastActivity) p.lastActivity = post;
  }
  return projects.filter((p) => visible(p.slug, opts.all)).sort((a, b) =>
    b.lastActivity.localeCompare(a.lastActivity),
  );
}

/**
 * 홈 프로젝트 목록 — 보이는 프로젝트 + 숨긴 프로젝트의 익명 카드. 익명 카드에는 상태·마지막
 * 활동·스택만 남기고 레포 이름이 드러나는 칸(slug·레포 주소·설명·아이콘)을 비운다 — 이 값은
 * 페이지 데이터로 브라우저에 그대로 실린다 (시안 docs/project-status-and-private.html)
 */
export function getProjectCards(): Project[] {
  const shown = getProjects();
  if (showHidden) return shown;
  const anon: Project[] = getAllProjects()
    .filter((p) => isHiddenProject(p.slug))
    .map((p) => {
      const a = p.alias ?? "?";
      return {
        slug: `private-${a.toLowerCase()}`,
        name: aliasName(a),
        nameEn: aliasName(a, true),
        description: "",
        status: (p.status as string) === "paused" ? "resting" : p.status,
        // 스택은 보인다 — 무엇으로 만드는지는 이름 없이도 "만들고 있구나"를 말해 준다 (10/17)
        stack: p.stack ?? [],
        repoUrl: "",
        lastActivity: p.lastActivity,
        alias: a,
        anon: true,
      };
    });
  return [...shown, ...anon].sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
}

export function getProject(slug: string, opts: ContentOpts = {}): Project | undefined {
  return getProjects(opts).find((p) => p.slug === slug);
}

export { DOW, fmtDate, fmtShort, humanizeLastActive } from "./format";

/* ---------- devlogs ---------- */

const SECTION_MAP: Record<string, keyof DevlogSections> = {
  "뭘 했나": "did",
  "뭘 했다": "did",
  왜: "why",
  "삽질 포인트": "fail",
  "다음 할 것": "next",
  "그 밖의 소식": "news",
  "other news": "news",
  // 소개 글 (scripts/intro.ts) — 요약은 "어떤 프로젝트인가" 첫 문장에서 나온다
  "어떤 프로젝트인가": "did",
  "누구를 위해, 왜": "why",
  "지금까지 만든 것": "built",
  "what it is": "did",
  "who it's for, and why": "why",
  "what's built so far": "built",
  "what i did": "did",
  why: "why",
  "rabbit holes": "fail",
  "next up": "next",
};

export function parseSections(markdown: string): DevlogSections {
  const sections: DevlogSections = {};
  const parts = markdown.split(/^##\s+/m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf("\n");
    if (nl === -1) continue;
    const heading = part.slice(0, nl).trim().toLowerCase();
    const key = SECTION_MAP[heading] ?? SECTION_MAP[part.slice(0, nl).trim()];
    if (key) sections[key] = part.slice(nl + 1).trim();
  }
  return sections;
}


/**
 * 목록·카드의 요약 — 본문 "뭘 했나"의 첫 문장을 쓴다.
 *
 * 첫 문장이 길면 목록이 들쭉날쭉해진다. 실제로 한 편만 86자라 다른 줄(17~48자)
 * 사이에서 통째로 튀었다.
 * 그래서 넘치면 절(節) 경계에서 끊고 줄임표를 붙인다 — 목록의 요약은 완결된
 * 문장이 아니라 미끼다. 본문은 건드리지 않는다 (파이프라인이 쓴 글이다).
 *
 * 근본은 첫 문장을 짧게 쓰게 하는 것이고 그건 프롬프트에 넣었다 (generate.ts).
 * 여기는 이미 발행된 글과 앞으로의 예외를 받아 내는 자리다.
 */
const SUMMARY_MAX = 55;
const SUMMARY_CUT = 50;

/** 글자 두 개씩 묶은 조각이 얼마나 겹치나 (0–1). 띄어쓰기·문장부호는 보지 않는다 */
export function bigramOverlap(a: string, b: string): number {
  const grams = (t: string) => {
    const s = t.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    const out = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) out.set(s.slice(i, i + 2), (out.get(s.slice(i, i + 2)) ?? 0) + 1);
    return out;
  };
  const ga = grams(a);
  const gb = grams(b);
  let both = 0;
  let total = 0;
  for (const [g, n] of ga) {
    both += Math.min(n, gb.get(g) ?? 0);
    total += n;
  }
  for (const n of gb.values()) total += n;
  return total ? (2 * both) / total : 0;
}

/** 요약이 제목을 거의 다시 말하는가 — 이 정도 겹치면 목록에서 같은 말이 두 줄로 보인다 */
const SAME_AS_TITLE = 0.55;

function firstSentence(text?: string, title?: string): string | undefined {
  if (!text) return undefined;
  const plain = text.replace(/\s+/g, " ").trim();
  // 첫 문장이 제목을 거의 그대로 되풀이하면 다음 문장을 요약으로 쓴다. 글 모델은
  // 제목과 "뭘 했나" 첫 문장을 같은 호출에서 쓰는데, 둘 다 "달라진 것 하나"를 말하라고
  // 해서 목록에 "하루 10문제 퀴즈를 끝없이 이어지는 게임으로 바꿨습니다" 아래
  // "하루 10문제 퀴즈를 끝없이 풀 수 있는 게임으로 바꿨습니다."가 붙었다 (10/16)
  const sentences = plain.match(/.{10,}?\.(?=\s|$)/g) ?? [];
  const fresh = title
    ? sentences.find((x) => bigramOverlap(x, title) < SAME_AS_TITLE)
    : undefined;
  const one = (fresh ?? sentences[0] ?? plain.slice(0, 90)).trim();
  if (one.length <= SUMMARY_MAX) return one;
  const head = one.slice(0, SUMMARY_CUT);
  // 쉼표·줄표 같은 절 경계가 있으면 거기서, 없으면 낱말 경계에서 끊는다
  const clause = Math.max(head.lastIndexOf(", "), head.lastIndexOf(" — "));
  const at = clause > 20 ? clause : head.lastIndexOf(" ");
  return `${(at > 20 ? head.slice(0, at) : head).trimEnd()}…`;
}

/** 홈 잔디 재료 — 날짜(KST)별 0~23시 커밋 수. 파이프라인이 매일 밤 쌓는다 */
export function getCommitHours(): Record<string, number[]> {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(CONTENT_DIR, "commit-hours.json"), "utf8"),
    );
  } catch {
    return {}; // 아직 없으면 빈 격자 — 첫 실행 뒤 채워진다
  }
}

/** <date>.figures.json — 없으면 빈 배열. 읽다 실패하면 조용히 없는 셈 친다 */
function readFigures(dir: string, mdFile: string): PostFigure[] {
  const p = path.join(dir, mdFile.replace(/\.mdx?$/, ".figures.json"));
  try {
    const v: unknown = JSON.parse(fs.readFileSync(p, "utf8"));
    return Array.isArray(v) ? (v as PostFigure[]) : [];
  } catch {
    return [];
  }
}

export function getDevlogs(repo?: string, opts: ContentOpts = {}): DevlogEntry[] {
  const devlogDir = path.join(CONTENT_DIR, "devlog");
  if (!fs.existsSync(devlogDir)) return [];

  const repos = (
    repo
      ? [repo]
      : fs
          .readdirSync(devlogDir, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name)
  ).filter((r) => visible(r, opts.all));

  const entries: DevlogEntry[] = [];
  for (const r of repos) {
    const dir = path.join(devlogDir, r);
    if (!fs.existsSync(dir)) continue;
    const files = fs
      .readdirSync(dir)
      .filter((f) => /\.mdx?$/.test(f))
      .sort(); // 오래된 순 — day 번호 계산용
    let dayNo = 0;
    files.forEach((f) => {
      const raw = fs.readFileSync(path.join(dir, f), "utf8");
      const { data, content } = matter(raw);
      const intro = data.intro === true;
      if (!intro) dayNo++;
      const date = String(data.date ?? f.replace(/\.mdx?$/, ""));
      const [ko, en] = content.split(/<!--\s*en\s*-->/);
      // 같은 용어의 설명 표시([[용어|설명]])는 글에서 처음 한 번만 — 언어마다 따로 센다
      const body = firstTermsOnly(ko.trim());
      const bodyEn = en ? firstTermsOnly(en.trim()) : undefined;
      const sections = parseSections(body);
      const sectionsEn = bodyEn ? parseSections(bodyEn) : {};
      const parseShas = (v: unknown): [string, string][] | undefined =>
        Array.isArray(v)
          ? (v
              .filter((s: unknown) => Array.isArray(s) && s.length >= 2)
              .map((s: unknown[]) => [String(s[0]), String(s[1])]) as [
              string,
              string,
            ][])
          : undefined;
      const shas = parseShas(data.shas);
      const shasEn = parseShas(data.shasEn);
      // 삽화는 사이드카 JSON이다 — SVG를 frontmatter에 넣으면 글이 안 읽힌다.
      // 파이프라인이 검증을 통과한 것만 쓴다 (scripts/figure-types.ts).
      const figures = readFigures(dir, f);
      entries.push({
        repo: r,
        date,
        title: termsOnly(String(data.title ?? date)),
        ...(data.titleEn ? { titleEn: termsOnly(String(data.titleEn)) } : {}),
        manual: data.manual === true,
        body,
        ...(bodyEn ? { bodyEn } : {}),
        sections,
        sectionsEn,
        // 목록의 "삽질" 배지 — 그날 이야기의 중심이 삽질이었나 (글 모델이 정한
        // frontmatter failStory). 전에는 삽질 섹션이 있으면 붙였는데, 형식상 늘
        // 채워져 27편 전부에 붙었다. 값이 없는 글은 안 붙인다.
        hasFail: data.failStory === true,
        // 요약은 목록·RSS·링크 미리보기 카드에 쓰여 말풍선을 못 띄운다 — 괄호 표기로
        // 글 모델이 따로 쓴 요약(frontmatter summary)이 먼저다 — 제목이 말하지 않은 것을
        // 말하라고 시킨 한 문장이다. 없는 글은 "뭘 했나"에서 제목과 다른 첫 문장을 쓴다
        summary:
          typeof data.summary === "string" && data.summary
            ? plainTerms(data.summary)
            : firstSentence(sections.did && plainTerms(sections.did), String(data.title ?? "")),
        ...(typeof data.summaryEn === "string" && data.summaryEn
          ? { summaryEn: plainTerms(data.summaryEn) }
          : sectionsEn.did
            ? { summaryEn: firstSentence(plainTerms(sectionsEn.did), data.titleEn ? String(data.titleEn) : undefined) }
            : {}),
        ...(typeof data.commits === "number" ? { commits: data.commits } : {}),
        ...(typeof data.prs === "number" ? { prs: data.prs } : {}),
        ...(shas ? { shas } : {}),
        ...(shasEn ? { shasEn } : {}),
        ...(figures?.length ? { figures } : {}),
        ...(typeof data.continues === "string" ? { continues: data.continues } : {}),
        day: intro ? 0 : dayNo,
        ...(intro ? { intro: true } : {}),
      });
    });
  }
  const sorted = entries.sort(
    (a, b) => b.date.localeCompare(a.date) || a.repo.localeCompare(b.repo),
  );
  // 이어지는 글은 같은 레포의 더 앞선 글만 — 없는 글이나 뒤의 글을 가리키면 버린다
  for (const e of sorted) {
    if (e.continues && !sorted.some((x) => x.repo === e.repo && x.date === e.continues && x.date < e.date))
      delete e.continues;
  }
  // 쇼츠 연결
  const shorts = getShorts(opts);
  for (const e of sorted) {
    const s = shorts.find((x) => x.repo === e.repo && x.date === e.date);
    if (s) e.short = s;
  }
  return sorted;
}

/**
 * 글을 쓸 때 넘기는 같은 레포의 지난 글 8편 (최근 것부터) — 제목과 "다음 할 것".
 * 글 모델이 이야기가 이어지는지 보고, 이어지면 그 날짜를 continues로 고른다.
 * 10/7 시험에서 이어진 글은 모두 지난 글이 "다음 할 것"에 적어 둔 일을 한 날이었다.
 * 밤 실행(run.ts)과 지난 글 다시 쓰기(devlog-preview.ts)가 같이 쓴다.
 */
export function recentPosts(
  repo: string,
  before: string,
): { date: string; title: string; next?: string }[] {
  return getDevlogs(repo)
    .filter((d) => d.date < before)
    .slice(0, 8)
    .map((d) => ({
      date: d.date,
      title: d.title,
      ...(d.sections.next ? { next: plainTerms(d.sections.next).replace(/\s+/g, " ").slice(0, 300) } : {}),
    }));
}

/** 이 글의 앞(이어 가는 지난 글)과 뒤(이 글을 이어 간 글들) — 글 끝 "이 이야기의 앞뒤" */
export function storyThread(
  post: DevlogEntry,
  all: DevlogEntry[] = getDevlogs(post.repo),
): { prev?: DevlogEntry; next: DevlogEntry[] } {
  const same = all.filter((d) => d.repo === post.repo);
  return {
    prev: post.continues ? same.find((d) => d.date === post.continues) : undefined,
    next: same.filter((d) => d.continues === post.date).sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export function getDevlog(repo: string, date: string, opts: ContentOpts = {}): DevlogEntry | undefined {
  return getDevlogs(repo, opts).find((d) => d.date === date);
}

/* ---------- shorts ---------- */

export function getShorts(opts: ContentOpts = {}): ShortsMeta[] {
  const dir = path.join(CONTENT_DIR, "shorts");
  if (!fs.existsSync(dir)) return [];
  const out: ShortsMeta[] = [];
  for (const repo of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!repo.isDirectory() || !visible(repo.name, opts.all)) continue;
    const rdir = path.join(dir, repo.name);
    for (const f of fs.readdirSync(rdir)) {
      if (!/^\d{4}-\d{2}-\d{2}\.json$/.test(f)) continue;
      try {
        const j = JSON.parse(fs.readFileSync(path.join(rdir, f), "utf8"));
        const hookLine = (j.lines ?? []).find(
          (l: { scene: string }) => l.scene === "hook",
        );
        let duration: number | undefined;
        const timingFile = path.join(
          rdir,
          f.replace(".json", ".ko.timing.json"),
        );
        if (fs.existsSync(timingFile)) {
          duration = Math.round(
            JSON.parse(fs.readFileSync(timingFile, "utf8")).duration + 3.5,
          );
        }
        out.push({
          repo: repo.name,
          date: f.slice(0, 10),
          template: String(j.template ?? "ship-it").replace("-", " "),
          hook: hookLine?.ko ?? "",
          hookKeywords: hookLine?.keywords ?? [],
          title: "", // 아래에서 데브로그 제목으로 채움 — 순환 방지용 지연
          day: j.day ?? 1,
          ...(duration ? { duration } : {}),
          ...(j.media ? { media: j.media } : {}),
        });
      } catch {
        // 깨진 JSON은 무시
      }
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

/* ---------- run log ---------- */

export function getRunLog(opts: ContentOpts = {}): RunLog | null {
  const file = path.join(CONTENT_DIR, "run.json");
  if (!fs.existsSync(file)) return null;
  try {
    const log = JSON.parse(fs.readFileSync(file, "utf8")) as RunLog;
    if (showHidden || opts.all) return log;
    // 숨긴 프로젝트를 말하는 줄은 남기되 이름을 "미공개 프로젝트 A"로 바꾼다. 글 주소
    // (Anchor/2026-10-17.md)도 날짜까지 통째로 바꾼다 — 주소에 레포 이름이 들어 있다.
    // 화면용 이름 목록(project-name.ts)에는 숨긴 프로젝트가 없으므로 projects.json에서 읽는다
    const all = getAllProjects();
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rules = hiddenSlugs().flatMap((slug) => {
      const p = all.find((x) => x.slug === slug);
      const a = p?.alias ?? "?";
      const names = [slug, p?.name, p?.nameEn].filter((n): n is string => Boolean(n));
      return names
        .sort((x, y) => y.length - x.length)
        .map((n) => ({
          re: new RegExp(`${esc(n)}(?:/\\d{4}-\\d{2}-\\d{2}(?:\\.mdx?)?)?`, "g"),
          ko: aliasName(a),
          en: aliasName(a, true),
        }));
    });
    const mask = (t: string, en: boolean) => rules.reduce((x, r) => x.replace(r.re, en ? r.en : r.ko), t);
    return {
      ...log,
      lines: log.lines.map((l) => ({
        ...l,
        text: mask(l.text, false),
        ...(l.textEn ? { textEn: mask(l.textEn, true) } : {}),
      })),
    };
  } catch {
    return null;
  }
}

/** 그 프로젝트의 소개 글 — 없으면 undefined. 글 제목 아래 프로젝트 설명이 이 글로 간다 */
export function introPost(repo: string, opts: ContentOpts = {}): DevlogEntry | undefined {
  return getDevlogs(repo, opts).find((d) => d.intro);
}
