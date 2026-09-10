/**
 * run.ts — collect → generate → content/ 파일 쓰기.
 *
 * 사용:
 *   npx tsx scripts/run.ts                 # 전체 실행 (ANTHROPIC_API_KEY 필요)
 *   npx tsx scripts/run.ts --collect-only  # 수집 결과만 출력 (생성·쓰기 없음, 디버깅용)
 *   npx tsx scripts/run.ts --projects-only # 새 프로젝트 인식만 — 프로젝트 목록이
 *                                          # 바뀌었을 때만 projects.json을 다시 쓴다.
 *                                          # 글·쇼츠·state는 건드리지 않는다 (짧은 주기 배치용)
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { collect, type RepoActivity, type State } from "./collect";
import { generateDevlog, translateCommitLines, translateLine } from "./generate";
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

async function updateProjects(activities: RepoActivity[]): Promise<void> {
  // 설명 번역 캐시 — 원문이 안 바뀐 레포는 이전 번역을 재사용한다 (API 절약)
  const prev = new Map<string, { description?: string; descriptionEn?: string }>();
  try {
    for (const p of JSON.parse(fs.readFileSync(PROJECTS_FILE, "utf8"))) {
      prev.set(p.slug, p);
    }
  } catch {
    // 첫 실행 — 캐시 없음
  }
  const descriptionEn = new Map<string, string>();
  for (const a of activities) {
    if (!a.description) continue;
    const cached = prev.get(a.repo);
    if (cached?.description === a.description && cached.descriptionEn) {
      descriptionEn.set(a.repo, cached.descriptionEn);
      continue;
    }
    // 사이트가 EN 모드일 때 카드 설명도 영어로 (Jessi 지시). 번역 실패가
    // 발행을 막지 않게 격리 — 없으면 UI가 ko로 폴백한다.
    try {
      descriptionEn.set(a.repo, await translateLine(a.description));
    } catch (err) {
      console.warn(`- ${a.repo} 설명 번역 실패 (ko로 폴백):`, err);
      if (cached?.descriptionEn) descriptionEn.set(a.repo, cached.descriptionEn);
    }
  }

  const projects = activities.map((a) => ({
    slug: a.repo,
    name: a.vibelogJson?.name ?? a.repo,
    description: a.description,
    ...(descriptionEn.has(a.repo)
      ? { descriptionEn: descriptionEn.get(a.repo) }
      : {}),
    status: a.vibelogJson?.status ?? autoStatus(a),
    stack: a.vibelogJson?.stack ?? (a.language ? [a.language] : []),
    repoUrl: a.repoUrl,
    ...(a.homepage ? { homepage: a.homepage } : {}),
    ...(a.language ? { language: a.language } : {}),
    // 마지막 활동 날짜는 KST 기준 — UTC로 자르면 밤 커밋이 "어제"로 밀린다
    lastActivity: new Date(
      new Date(a.pushedAt || Date.now()).getTime() + 9 * 3600 * 1000,
    )
      .toISOString()
      .slice(0, 10),
    weekCommits: a.weekCommits,
    todayCommits: a.todayCommits,
    totalCommits: a.totalCommits,
    // 쇼츠 테마 — script.ts가 이 값을 읽어 렌더에 넘긴다
    ...(a.theme ? { theme: a.theme } : {}),
  }));
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2) + "\n");
}

/** 홈 "지난 실행" 패널이 읽는 실행 로그 */
function writeRunLog(
  lines: { text: string; textEn?: string; kind?: "cmd" | "ok" | "fail" }[],
): void {
  fs.writeFileSync(
    path.join(CONTENT_DIR, "run.json"),
    JSON.stringify({ at: new Date().toISOString(), lines }, null, 2) + "\n",
  );
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

async function writeDevlog(
  repo: string,
  date: string,
  d: { title: string; titleEn: string; ko: string; en: string },
  a: RepoActivity,
): Promise<void> {
  const file = devlogPath(repo, date);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // 원료 메타 — "AI가 커밋 N개로 작성" 표기와 본문의 "원료 · git log"에 쓰인다.
  // 자르지 않는다: "커밋 16개로 썼다"면서 원료에 8개만 보이면 말이 안 맞는다
  // (Jessi 지적). 화면 쪽이 10개 이상은 접어서 보여준다.
  const shas = a.commits.map((c) => [
    c.sha.slice(0, 7),
    c.message.split("\n")[0],
  ]);

  // EN 모드용 커밋 메시지 번역 — 같은 날 재실행에서 이미 번역된 sha는
  // 기존 파일에서 재사용하고, 새 것만 번역한다. 실패해도 발행은 계속.
  const cached = new Map<string, string>();
  try {
    const old = matter(fs.readFileSync(file, "utf8")).data;
    if (Array.isArray(old.shasEn)) {
      for (const s of old.shasEn) {
        if (Array.isArray(s) && s.length >= 2) cached.set(String(s[0]), String(s[1]));
      }
    }
  } catch {
    // 파일 없음 — 캐시 없음
  }
  const missing = shas.filter(([sha]) => !cached.has(sha));
  try {
    const translated = await translateCommitLines(missing.map(([, msg]) => msg));
    missing.forEach(([sha], i) => cached.set(sha, translated[i]));
  } catch (err) {
    console.warn(`- ${repo}/${date} 커밋 메시지 번역 실패 (ko로 폴백):`, err);
  }
  const shasEn = shas
    .filter(([sha]) => cached.has(sha))
    .map(([sha]) => [sha, cached.get(sha)]);

  const frontmatter = [
    "---",
    `title: ${JSON.stringify(d.title)}`,
    `titleEn: ${JSON.stringify(d.titleEn)}`,
    `date: "${date}"`,
    `repo: ${JSON.stringify(repo)}`,
    `commits: ${a.commits.length}`,
    `prs: ${a.mergedPRs.length}`,
    `shas: ${JSON.stringify(shas)}`,
    ...(shasEn.length > 0 ? [`shasEn: ${JSON.stringify(shasEn)}`] : []),
    "---",
  ].join("\n");
  fs.writeFileSync(
    file,
    `${frontmatter}\n\n${d.ko.trim()}\n\n<!-- en -->\n\n${d.en.trim()}\n`,
  );
}

async function main(): Promise<void> {
  const collectOnly = process.argv.includes("--collect-only");
  const projectsOnly = process.argv.includes("--projects-only");
  const state = loadState();
  const date = todayKST();

  if (projectsOnly) {
    // 짧은 주기 인식 배치 (projects.yml) — 새 프로젝트가 밤 23:00까지 기다리지
    // 않고 카드로 뜨게 한다. 목록(slug 집합)이 안 바뀌면 아무것도 쓰지 않아서
    // 30분마다 커밋·배포가 나는 것을 막는다. 숫자·글 갱신은 밤 일반 실행 몫.
    const activities = await collect(state, date);
    let prevSlugs: string[] = [];
    try {
      prevSlugs = JSON.parse(fs.readFileSync(PROJECTS_FILE, "utf8")).map(
        (p: { slug: string }) => p.slug,
      );
    } catch {
      // 첫 실행 — 파일 없음
    }
    const nowSlugs = activities.map((a) => a.repo);
    const same =
      prevSlugs.length === nowSlugs.length &&
      [...prevSlugs].sort().join(",") === [...nowSlugs].sort().join(",");
    if (same) {
      console.log(`프로젝트 변화 없음 (${nowSlugs.length}개) — 쓰기 생략`);
      return;
    }
    console.log(`프로젝트 목록 변경: [${prevSlugs.join(", ")}] → [${nowSlugs.join(", ")}]`);
    await updateProjects(activities);
    console.log("projects.json 갱신 완료");
    return;
  }

  const runLines: { text: string; textEn?: string; kind?: "cmd" | "ok" | "fail" }[] = [
    { text: "npx tsx scripts/run.ts", kind: "cmd" },
  ];

  const activities = await collect(state, date);
  runLines.push({
    text: `collect  · ${activities.length} repos, ${activities.filter((a) => a.hasActivity).length} active`,
  });
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
        await writeDevlog(a.repo, date, devlog, a);
        console.log(`- ${a.repo}/${date}.md 생성: ${devlog.title}`);
        runLines.push({ text: `generate · ${a.repo}/${date}.md (ko, en)` });
        published.push(a.repo);
      } catch (err) {
        // 한 레포의 실패가 나머지 발행을 막지 않게 한다
        failed++;
        console.error(`- ${a.repo} 생성 실패:`, err);
        runLines.push({
          text: `generate · ${a.repo} 실패`,
          textEn: `generate · ${a.repo} failed`,
          kind: "fail",
        });
        continue;
      }
    }
    state[a.repo] = {
      lastSha: a.latestSha ?? state[a.repo]?.lastSha,
      lastRun: new Date().toISOString(),
      // 같은 날 재실행이 같은 창을 다시 쓰도록 날짜 버킷과 창 시작을 남긴다
      lastDate: date,
      daySince: a.since,
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
        runLines.push({ text: `shorts   · ${repo}/${date} (ko, en)` });
      } catch (err) {
        console.error(`- ${repo} 쇼츠 실패 (데브로그 발행에는 영향 없음):`, err);
        runLines.push({
          text: `shorts   · ${repo} 실패 — 글 발행은 계속`,
          textEn: `shorts   · ${repo} failed — post still published`,
          kind: "fail",
        });
      }
    }
  }

  await updateProjects(activities);
  runLines.push({
    text: "publish  · content 커밋 → vercel 자동 배포",
    textEn: "publish  · commit content → vercel auto-deploy",
  });
  writeRunLog(runLines);
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n");
  console.log("projects.json / state.json / run.json 갱신 완료");
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
