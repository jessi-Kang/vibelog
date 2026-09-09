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
}

export interface DevlogEntry {
  repo: string;
  date: string; // YYYY-MM-DD
  title: string;
  manual: boolean;
  body: string; // 마크다운 본문 (KR)
}

export function getProjects(): Project[] {
  const file = path.join(CONTENT_DIR, "projects.json");
  if (!fs.existsSync(file)) return [];
  const projects: Project[] = JSON.parse(fs.readFileSync(file, "utf8"));
  return [...projects].sort((a, b) =>
    b.lastActivity.localeCompare(a.lastActivity),
  );
}

export function getProject(slug: string): Project | undefined {
  return getProjects().find((p) => p.slug === slug);
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
    for (const f of fs.readdirSync(dir)) {
      if (!/\.mdx?$/.test(f)) continue;
      const raw = fs.readFileSync(path.join(dir, f), "utf8");
      const { data, content } = matter(raw);
      const date = String(data.date ?? f.replace(/\.mdx?$/, ""));
      entries.push({
        repo: r,
        date,
        title: String(data.title ?? date),
        manual: data.manual === true,
        body: content.trim(),
      });
    }
  }
  return entries.sort(
    (a, b) => b.date.localeCompare(a.date) || a.repo.localeCompare(b.repo),
  );
}
