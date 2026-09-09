/**
 * run.ts — collect → generate → content/ 파일 쓰기.
 *
 * 사용:
 *   npx tsx scripts/run.ts                # 전체 실행 (ANTHROPIC_API_KEY 필요)
 *   npx tsx scripts/run.ts --collect-only # 수집 결과만 출력 (생성·쓰기 없음, 디버깅용)
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { collect, type RepoActivity, type State } from "./collect";
import { generateDevlog } from "./generate";
import { runShorts } from "./shorts";

const CONTENT_DIR = path.join(process.cwd(), "content");
const STATE_FILE = path.join(CONTENT_DIR, "state.json");
const PROJECTS_FILE = path.join(CONTENT_DIR, "projects.json");

/** cron이 14:00 UTC(23:00 KST)에 돌므로 날짜 버킷은 KST 기준으로 잡는다 */
function todayKST(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

function loadState(): State {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}

function autoStatus(a: RepoActivity): "building" | "live" | "paused" {
  if (a.homepage) return "live";
  const days = (Date.now() - new Date(a.pushedAt).getTime()) / 86400000;
  return days <= 30 ? "building" : "paused";
}

function updateProjects(activities: RepoActivity[]): void {
  const projects = activities.map((a) => ({
    slug: a.repo,
    name: a.vibelogJson?.name ?? a.repo,
    description: a.description,
    status: a.vibelogJson?.status ?? autoStatus(a),
    stack: a.vibelogJson?.stack ?? (a.language ? [a.language] : []),
    repoUrl: a.repoUrl,
    ...(a.homepage ? { homepage: a.homepage } : {}),
    ...(a.language ? { language: a.language } : {}),
    lastActivity: (a.pushedAt || new Date().toISOString()).slice(0, 10),
  }));
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2) + "\n");
}

function devlogPath(repo: string, date: string): string {
  return path.join(CONTENT_DIR, "devlog", repo, `${date}.md`);
}

/** frontmatter manual: true인 파일은 파이프라인이 덮어쓰지 않는다 */
function isProtected(file: string): boolean {
  if (!fs.existsSync(file)) return false;
  try {
    return matter(fs.readFileSync(file, "utf8")).data.manual === true;
  } catch {
    return false;
  }
}

function writeDevlog(
  repo: string,
  date: string,
  d: { title: string; titleEn: string; ko: string; en: string },
): void {
  const file = devlogPath(repo, date);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const frontmatter = [
    "---",
    `title: ${JSON.stringify(d.title)}`,
    `titleEn: ${JSON.stringify(d.titleEn)}`,
    `date: "${date}"`,
    `repo: ${JSON.stringify(repo)}`,
    "---",
  ].join("\n");
  fs.writeFileSync(
    file,
    `${frontmatter}\n\n${d.ko.trim()}\n\n<!-- en -->\n\n${d.en.trim()}\n`,
  );
}

async function main(): Promise<void> {
  const collectOnly = process.argv.includes("--collect-only");
  const state = loadState();
  const date = todayKST();

  const activities = await collect(state);
  console.log(`수집: 레포 ${activities.length}개`);
  for (const a of activities) {
    console.log(
      `- ${a.repo}: 커밋 ${a.commits.length}, PR ${a.mergedPRs.length}, ` +
        `devlog ${a.devlogFiles.length} → ${a.hasActivity ? "생성 대상" : "건너뜀"}`,
    );
  }
  if (collectOnly) {
    console.log(JSON.stringify(activities, null, 2));
    return;
  }

  let failed = 0;
  const published: string[] = [];
  for (const a of activities) {
    if (!a.hasActivity) continue;
    const file = devlogPath(a.repo, date);
    if (isProtected(file)) {
      console.log(`- ${a.repo}/${date}.md: manual 보호 — 건너뜀`);
      published.push(a.repo); // 글은 이미 있으므로 쇼츠는 시도한다
    } else {
      try {
        const devlog = await generateDevlog(a, date);
        writeDevlog(a.repo, date, devlog);
        console.log(`- ${a.repo}/${date}.md 생성: ${devlog.title}`);
        published.push(a.repo);
      } catch (err) {
        // 한 레포의 실패가 나머지 발행을 막지 않게 한다
        failed++;
        console.error(`- ${a.repo} 생성 실패:`, err);
        continue;
      }
    }
    state[a.repo] = {
      lastSha: a.latestSha ?? state[a.repo]?.lastSha,
      lastRun: new Date().toISOString(),
    };
  }

  // 쇼츠 단계 (2단계) — 실패해도 데브로그 발행은 막지 않는다
  if (process.env.SKIP_SHORTS === "1") {
    console.log("쇼츠: SKIP_SHORTS=1 — 건너뜀");
  } else if (
    !process.env.ELEVENLABS_API_KEY ||
    !process.env.ELEVENLABS_VOICE_ID
  ) {
    console.log("쇼츠: ELEVENLABS_API_KEY/VOICE_ID 없음 — 건너뜀");
  } else {
    for (const repo of published) {
      try {
        await runShorts(repo, date);
      } catch (err) {
        console.error(`- ${repo} 쇼츠 실패 (데브로그 발행에는 영향 없음):`, err);
      }
    }
  }

  updateProjects(activities);
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n");
  console.log("projects.json / state.json 갱신 완료");
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
