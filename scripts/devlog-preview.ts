/**
 * devlog-preview.ts — 이미 발행된 글을 지금 지시문으로 다시 써 보고, 원래 글과
 * 나란히 보여 준다. **발행하지 않는다** — content/는 건드리지 않는다.
 *
 *   npx tsx scripts/devlog-preview.ts vibelog/2026-09-22,apart/2026-09-21
 *
 * 글 지시문을 고쳤을 때 "밤까지 기다려 새 글 한 편"으로는 비교가 안 된다. 같은
 * 재료로 전후를 나란히 놓아야 고친 게 나아졌는지 보인다. 재료는 그 글의
 * frontmatter에 남은 커밋(shas)을 GitHub에서 다시 읽어 만든다 — 그날 PR·세션
 * 요약은 빠지므로 원래 재료와 완전히 같지는 않다.
 *
 * 결과는 Actions 실행 요약(GITHUB_STEP_SUMMARY)과 표준 출력에 남는다. Run
 * workflow의 `preview` 입력이 이걸 부른다 (.github/workflows/devlog.yml).
 * 비용은 글당 Opus 1–2번 + 읽기 검사 1–2번.
 */
import fs from "node:fs";
import { Octokit } from "@octokit/rest";
import { getDevlog, getDevlogs, getProject } from "../lib/content";
import { getOwner, getReadme, type RepoCommit } from "./collect";
import { generateDevlog } from "./generate";
import { fmtTally, takeUsage } from "./usage";

/** 글의 섹션 제목(##)이 미리보기의 글 단위 제목(##)과 같은 층이 되지 않게 내린다 */
function demote(md: string): string {
  return md.trim().replace(/^## /gm, "#### ");
}

async function main() {
  const arg = process.argv[2] ?? "";
  const ids = arg.split(",").map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) {
    console.error("사용법: npx tsx scripts/devlog-preview.ts <repo>/<date>[,<repo>/<date>…]");
    process.exit(1);
  }
  const octokit = new Octokit({ auth: process.env.GH_PAT || process.env.GITHUB_TOKEN || undefined });
  const owner = await getOwner(octokit);
  const out: string[] = ["# 데브로그 미리보기 — 지금 글 vs 새 지시문 (발행 안 함)", ""];
  let failed = 0;

  for (const id of ids) {
    const [repo, date] = id.split("/");
    const post = repo && date ? getDevlog(repo, date) : undefined;
    if (!post) {
      console.warn(`- 글이 없다: ${id}`);
      failed++;
      continue;
    }
    try {
      const commits: RepoCommit[] = [];
      for (const [sha] of post.shas ?? []) {
        const { data } = await octokit.rest.repos.getCommit({ owner, repo, ref: sha });
        commits.push({
          sha: data.sha,
          message: data.commit.message,
          date: data.commit.author?.date ?? "",
          files: (data.files ?? []).map((f) => f.filename),
        });
      }
      const recent = getDevlogs(repo)
        .filter((d) => d.date < date)
        .sort((x, y) => y.date.localeCompare(x.date))
        .slice(0, 3)
        .map((d) => ({ date: d.date, title: d.title }));
      const next = await generateDevlog(
        {
          repo,
          description: getProject(repo)?.description ?? "",
          readme: await getReadme(octokit, owner, repo),
          commits,
          mergedPRs: [],
          devlogFiles: [],
        },
        date,
        { recent },
      );
      const r = next.readability;
      const gen = fmtTally(takeUsage("generate"));
      const rev = fmtTally(takeUsage("review"));
      out.push(
        `## ${id}`,
        "",
        `커밋 ${commits.length}개로 다시 씀 · 글 ${gen} · 읽기 검사 ${rev}`,
        "",
        r.error
          ? `읽기 검사: ${r.error}`
          : r.rewritten
            ? `읽기 검사: 막힌 문장 ${r.before}개 → 다시 씀 → 남은 것 ${r.after ?? "?"}개`
            : "읽기 검사: 막힌 문장 없음",
        ...r.unclear.map((u) => `- "${u.sentence}" → ${u.why}`),
        "",
        "### 지금 글",
        "",
        `**${post.title}**`,
        "",
        demote(post.body),
        "",
        "### 새 지시문으로",
        "",
        `**${next.title}**`,
        "",
        demote(next.ko),
        "",
        "---",
        "",
      );
    } catch (err) {
      failed++;
      console.error(`- ${id} 실패:`, err);
      out.push(`## ${id}`, "", `실패: ${(err as Error).message}`, "");
    }
  }

  const md = out.join("\n");
  console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
  if (failed === ids.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
