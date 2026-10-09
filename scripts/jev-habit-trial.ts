/**
 * jev-habit-trial.ts — 프로젝트 레포의 커밋 습관을 세는 한 줄 알림을 시험한다. 발행하지 않는다.
 *
 *   TYPESAFE_API_KEY=… GH_PAT=… npx tsx scripts/jev-habit-trial.ts
 *
 * 글의 질은 커밋 메시지에서 나온다. 레포마다 최근 3주 사람 커밋을 세 가지로 본다.
 * - 타입이 없는 커밋 (feat/fix/… — 쇼츠 커밋 그래프의 색)
 * - 본문이 없는 커밋 (40자 미만 — 글을 쓸 만한 커밋으로 치지 않는다)
 * - 본문은 있는데 "왜"가 없는 커밋 — 이것만 규칙으로 못 세서 Jev에게 묻는다
 * 마지막 것이 쓸 만한지 보려고, 공개 레포인 vibelog 커밋은 본문 앞부분을 같이 적어 사람이
 * 맞는지 읽는다. 다른 레포는 본문을 적지 않는다 (실행 기록이 공개된다).
 */
import fs from "node:fs";
import { Octokit } from "@octokit/rest";
import { COMMIT_TYPES, commitBody, followsCommitRule } from "./commit-rule";
import { isBotCommit } from "./collect";

const JEV_URL = process.env.JEV_URL ?? "https://api.typesafe.ai/v1/systemone";
const PRICE_PER_MTOK = 0.042;
const SINCE = new Date(Date.now() - 21 * 864e5).toISOString();
const TYPE_RE = new RegExp(`^(${COMMIT_TYPES.join("|")}): \\S`);
const PUBLIC_BODY = new Set(["vibelog"]);

const WHY = {
  type: "noul",
  instructions:
    "This is the body of a git commit message. Does it explain WHY the change was made — the problem it solves, the reason, " +
    "or what was tried and rejected — and not only WHAT was changed?",
  criteria: {
    true: "A reason, problem, or rejected alternative is stated",
    false: "It only lists what changed, or restates the subject",
  },
};

async function jev(text: string) {
  const res = await fetch(JEV_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "jev-latest", state: { text }, questions: { why: WHY } }),
  });
  if (!res.ok) throw new Error(`Jev ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = (await res.json()) as { answers: Record<string, any>; usage?: { input_tokens?: number } };
  return { p: j.answers.why?.noul as number, tokens: j.usage?.input_tokens ?? 0 };
}

interface C {
  repo: string;
  subject: string;
  body: string;
  typed: boolean;
  hasBody: boolean;
  why?: number;
  error?: string;
}

async function main() {
  if (!process.env.TYPESAFE_API_KEY) throw new Error("TYPESAFE_API_KEY가 없습니다");
  const octokit = new Octokit({ auth: process.env.GH_PAT || process.env.GITHUB_TOKEN });
  const owner = (process.env.GITHUB_REPOSITORY ?? "jessi-Kang/vibelog").split("/")[0];
  const repos: string[] = JSON.parse(fs.readFileSync("content/projects.json", "utf8")).map((p: { slug: string }) => p.slug);
  const out: string[] = [];
  const line = (x = "") => out.push(x);
  const all: C[] = [];

  for (const repo of repos) {
    try {
      const data = await octokit.paginate(octokit.rest.repos.listCommits, { owner, repo, since: SINCE, per_page: 100 });
      for (const c of data) {
        if ((c.parents?.length ?? 0) > 1) continue;
        const msg = c.commit.message;
        if (isBotCommit({ author: c.author?.login, authorName: c.commit.author?.name, authorEmail: c.commit.author?.email })) continue;
        if (/^(Initial commit|Merge |Revert ")/.test(msg)) continue;
        all.push({
          repo,
          subject: msg.split("\n")[0],
          body: commitBody(msg),
          typed: TYPE_RE.test(msg),
          hasBody: followsCommitRule(msg),
        });
      }
    } catch (err) {
      line(`커밋 수집 실패: ${repo} — ${(err as Error).message.slice(0, 80)}`);
    }
  }

  let tokens = 0;
  const withBody = all.filter((c) => c.hasBody);
  for (let i = 0; i < withBody.length; i += 5) {
    await Promise.all(
      withBody.slice(i, i + 5).map(async (c) => {
        try {
          const r = await jev(c.body);
          c.why = r.p;
          tokens += r.tokens;
        } catch (err) {
          c.error = (err as Error).message;
        }
      }),
    );
  }

  const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n+/g, " ");
  const head = [`# Jev 커밋 습관 시험 — 최근 3주 사람 커밋 ${all.length}개 (발행 안 함)`, ""];
  line();
  line(`| 항목 | 값 |`);
  line(`|---|---|`);
  line(`| Jev 실패 | ${all.filter((c) => c.error).length}개 |`);
  line(`| 입력 토큰 | ${tokens.toLocaleString("en-US")} |`);
  line(`| 비용 | $${((tokens / 1e6) * PRICE_PER_MTOK).toFixed(5)} |`);
  const e = all.find((c) => c.error);
  if (e) line(`\n실패 예: ${e.error}`);

  line();
  line(`## 레포별 — 실행 기록에 남길 한 줄의 재료`);
  line();
  line(`| 레포 | 사람 커밋 | 타입 없음 | 본문 없음 | 본문은 있는데 "왜" 없음 (Jev < 0.5) |`);
  line(`|---|---|---|---|---|`);
  for (const repo of repos) {
    const m = all.filter((c) => c.repo === repo);
    if (m.length === 0) {
      line(`| ${repo} | 0 | | | |`);
      continue;
    }
    line(
      `| ${repo} | ${m.length} | ${m.filter((c) => !c.typed).length} | ${m.filter((c) => !c.hasBody).length} | ${m.filter((c) => c.hasBody && c.why != null && c.why < 0.5).length} |`,
    );
  }

  const hist = [0, 0.2, 0.4, 0.6, 0.8].map((lo) => withBody.filter((c) => c.why != null && c.why >= lo && c.why < lo + 0.2 + (lo === 0.8 ? 0.01 : 0)).length);
  line();
  line(`"왜" 확률 분포 (본문 있는 커밋 ${withBody.length}개): 0–0.2 ${hist[0]} · 0.2–0.4 ${hist[1]} · 0.4–0.6 ${hist[2]} · 0.6–0.8 ${hist[3]} · 0.8–1 ${hist[4]}`);

  // 사람이 맞는지 읽어 볼 vibelog 커밋 — "왜"가 낮은 것 전부와 높은 것 몇 개
  const pub = withBody.filter((c) => PUBLIC_BODY.has(c.repo) && c.why != null).sort((a, b) => a.why! - b.why!);
  line();
  line(`## vibelog — "왜" 확률이 낮은 커밋 (본문 앞부분과 함께)`);
  line();
  line(`| 확률 | 제목 | 본문 앞 200자 |`);
  line(`|---|---|---|`);
  for (const c of pub.filter((c) => c.why! < 0.6)) line(`| ${c.why!.toFixed(2)} | ${esc(c.subject)} | ${esc(c.body.slice(0, 200))} |`);
  line();
  line(`## vibelog — 비교용으로 "왜" 확률이 높은 커밋 5개`);
  line();
  line(`| 확률 | 제목 | 본문 앞 200자 |`);
  line(`|---|---|---|`);
  for (const c of pub.slice(-5)) line(`| ${c.why!.toFixed(2)} | ${esc(c.subject)} | ${esc(c.body.slice(0, 200))} |`);

  line();
  line(`## 다른 레포 — "왜" 확률이 낮은 커밋 제목 (본문은 적지 않는다)`);
  line();
  line(`| 레포 | 확률 | 제목 | 본문 길이 |`);
  line(`|---|---|---|---|`);
  for (const c of withBody.filter((c) => !PUBLIC_BODY.has(c.repo) && c.why != null && c.why < 0.5).sort((a, b) => a.why! - b.why!))
    line(`| ${c.repo} | ${c.why!.toFixed(2)} | ${esc(c.subject)} | ${c.body.length}자 |`);

  const md = [...head, ...out].join("\n");
  console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
