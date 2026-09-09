import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content");

export type ProjectStatus = "idea" | "building" | "live" | "paused";

export interface Project {
  slug: string; // 레포 이름
  name: string;
  description: string;
  status: ProjectStatus;
  stack: string[];
  repoUrl: string;
  homepage?: string;
  language?: string;
  lastActivity: string; // ISO date
  weekCommits?: number; // collect 단계에서 계산
}

/** 데브로그 본문의 고정 구조 — "뭘 했다 / 왜 / 삽질 포인트 / 다음 할 것" */
export interface DevlogSections {
  did?: string;
  why?: string;
  fail?: string;
  next?: string;
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
  commits?: number; // 원료 커밋 수 (frontmatter)
  prs?: number;
  shas?: [string, string][]; // 원료 git log [sha, 한 줄 메시지]
  day: number; // 이 레포의 몇 번째 글
  short?: ShortsMeta; // 이 글의 쇼츠 (있으면)
}

export interface ShortsMeta {
  repo: string;
  date: string;
  template: string;
  hook: string; // 훅 문장 (썸네일용)
  hookKeywords: string[];
  title: string; // 데브로그 제목
  day: number;
  duration?: number; // 초
  media?: { ko?: string; en?: string; poster?: string };
}

export interface RunLogLine {
  text: string;
  kind?: "cmd" | "ok" | "fail" | "cur";
}

export interface RunLog {
  at: string; // ISO
  lines: RunLogLine[];
}

/* ---------- projects ---------- */

export function getProjects(): Project[] {
  const file = path.join(CONTENT_DIR, "projects.json");
  if (!fs.existsSync(file)) return [];
  const projects: Project[] = JSON.parse(fs.readFileSync(file, "utf8"));
  // 마지막 활동은 저장값과 최신 데브로그 날짜 중 더 최근 것 — 오늘 글이
  // 나왔으면 밤 실행을 기다리지 않고도 "오늘 움직임"으로 잡힌다
  const latestPost = new Map<string, string>();
  for (const d of getDevlogs()) {
    const cur = latestPost.get(d.repo);
    if (!cur || d.date > cur) latestPost.set(d.repo, d.date);
  }
  for (const p of projects) {
    const post = latestPost.get(p.slug);
    if (post && post > p.lastActivity) p.lastActivity = post;
  }
  return [...projects].sort((a, b) =>
    b.lastActivity.localeCompare(a.lastActivity),
  );
}

export function getProject(slug: string): Project | undefined {
  return getProjects().find((p) => p.slug === slug);
}

export { DOW, fmtDate, fmtShort, humanizeLastActive } from "./format";

/* ---------- devlogs ---------- */

const SECTION_MAP: Record<string, keyof DevlogSections> = {
  "뭘 했나": "did",
  "뭘 했다": "did",
  왜: "why",
  "삽질 포인트": "fail",
  "다음 할 것": "next",
  "what i did": "did",
  why: "why",
  "rabbit holes": "fail",
  "next up": "next",
};

function parseSections(markdown: string): DevlogSections {
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

function computeHasFail(fail?: string): boolean {
  const t = fail?.trim();
  if (!t) return false;
  return !/^(특별한 삽질은 없|오늘은 없었습니다|없었습니다|없음)/.test(t);
}

function firstSentence(text?: string): string | undefined {
  if (!text) return undefined;
  const plain = text.replace(/\s+/g, " ").trim();
  const m = plain.match(/^.{10,}?\.(?=\s|$)/);
  return (m ? m[0] : plain.slice(0, 90)).trim();
}

export function getDevlogs(repo?: string): DevlogEntry[] {
  const devlogDir = path.join(CONTENT_DIR, "devlog");
  if (!fs.existsSync(devlogDir)) return [];

  const repos = repo
    ? [repo]
    : fs
        .readdirSync(devlogDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

  const entries: DevlogEntry[] = [];
  for (const r of repos) {
    const dir = path.join(devlogDir, r);
    if (!fs.existsSync(dir)) continue;
    const files = fs
      .readdirSync(dir)
      .filter((f) => /\.mdx?$/.test(f))
      .sort(); // 오래된 순 — day 번호 계산용
    files.forEach((f, i) => {
      const raw = fs.readFileSync(path.join(dir, f), "utf8");
      const { data, content } = matter(raw);
      const date = String(data.date ?? f.replace(/\.mdx?$/, ""));
      const [ko, en] = content.split(/<!--\s*en\s*-->/);
      const body = ko.trim();
      const bodyEn = en?.trim();
      const sections = parseSections(body);
      const shas = Array.isArray(data.shas)
        ? (data.shas
            .filter((s: unknown) => Array.isArray(s) && s.length >= 2)
            .map((s: unknown[]) => [String(s[0]), String(s[1])]) as [
            string,
            string,
          ][])
        : undefined;
      entries.push({
        repo: r,
        date,
        title: String(data.title ?? date),
        ...(data.titleEn ? { titleEn: String(data.titleEn) } : {}),
        manual: data.manual === true,
        body,
        ...(bodyEn ? { bodyEn } : {}),
        sections,
        sectionsEn: bodyEn ? parseSections(bodyEn) : {},
        hasFail: computeHasFail(sections.fail),
        summary: firstSentence(sections.did),
        ...(typeof data.commits === "number" ? { commits: data.commits } : {}),
        ...(typeof data.prs === "number" ? { prs: data.prs } : {}),
        ...(shas ? { shas } : {}),
        day: i + 1,
      });
    });
  }
  const sorted = entries.sort(
    (a, b) => b.date.localeCompare(a.date) || a.repo.localeCompare(b.repo),
  );
  // 쇼츠 연결
  const shorts = getShorts();
  for (const e of sorted) {
    const s = shorts.find((x) => x.repo === e.repo && x.date === e.date);
    if (s) e.short = s;
  }
  return sorted;
}

export function getDevlog(repo: string, date: string): DevlogEntry | undefined {
  return getDevlogs(repo).find((d) => d.date === date);
}

/* ---------- shorts ---------- */

export function getShorts(): ShortsMeta[] {
  const dir = path.join(CONTENT_DIR, "shorts");
  if (!fs.existsSync(dir)) return [];
  const out: ShortsMeta[] = [];
  for (const repo of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!repo.isDirectory()) continue;
    const rdir = path.join(dir, repo.name);
    for (const f of fs.readdirSync(rdir)) {
      if (!/^\d{4}-\d{2}-\d{2}\.json$/.test(f)) continue;
      try {
        const j = JSON.parse(fs.readFileSync(path.join(rdir, f), "utf8"));
        const hookLine = (j.lines ?? []).find(
          (l: { scene: string }) => l.scene === "hook",
        );
        let duration: number | undefined;
        const timingFile = path.join(rdir, f.replace(".json", ".ko.timing.json"));
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

export function getRunLog(): RunLog | null {
  const file = path.join(CONTENT_DIR, "run.json");
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as RunLog;
  } catch {
    return null;
  }
}
