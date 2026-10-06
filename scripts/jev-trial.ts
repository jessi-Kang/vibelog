/**
 * jev-trial.ts — Jev(TypeSafe AI)를 밤 수집의 판단에 쓸 만한지 시험한다. 발행하지 않는다.
 *
 *   TYPESAFE_API_KEY=… GH_PAT=… npx tsx scripts/jev-trial.ts [since=2026-09-01]
 *
 * 지금 밤 수집은 두 가지를 규칙으로 판단한다.
 * - 봇 커밋인가: 작성자 이름·메일에 "bot"이 낱말로 들어 있는가.
 * - 글을 쓸 만한 커밋인가: 서명 줄을 뺀 본문이 40자 이상인가.
 * 같은 커밋들을 Jev에게 물어 규칙과 나란히 놓는다. 타입(feat/fix …)도 같이 물어,
 * 타입이 붙은 커밋으로 맞히는지 보고, 9/12 이후 타입 없이 올라간 vibelog 커밋에도
 * 붙여 본다 (쇼츠 첫 장면의 커밋 그래프가 타입으로 색을 정한다).
 *
 * 결과는 표준 출력과 Actions 실행 요약(GITHUB_STEP_SUMMARY)에 남는다.
 * .github/workflows/jev-trial.yml이 부른다.
 */
import fs from "node:fs";
import { Octokit } from "@octokit/rest";
import { isBotCommit } from "./collect";
import { COMMIT_TYPES, commitBody, followsCommitRule } from "./commit-rule";

const JEV_URL = process.env.JEV_URL ?? "https://api.typesafe.ai/v1/systemone"; // 시험용으로 바꿀 수 있다
const SINCE = process.argv[2] ?? "2026-09-01";
const PER_REPO_MAX = Number(process.env.PER_REPO_MAX ?? 150);
const PRICE_PER_MTOK = 0.042; // 입력 백만 토큰당 달러, 출력은 무료

interface Row {
  repo: string;
  sha: string;
  day: string; // 그 커밋이 들어갔을 "그 밤" (KST, 06:00 경계)
  subject: string;
  bodyLen: number;
  ruleBot: boolean;
  rulePass: boolean;
  prefix: string | null;
  jevWorth?: number; // 0–3
  jevWorthConf?: number;
  jevBot?: number; // 0–1
  jevType?: string;
  jevTypeConf?: number;
  error?: string;
}

function nightKST(iso: string): string {
  const t = new Date(iso).getTime() + 9 * 3600_000 - 6 * 3600_000;
  return new Date(t).toISOString().slice(0, 10);
}

async function askJev(state: unknown): Promise<{ answers: Record<string, any>; tokens: number }> {
  const res = await fetch(JEV_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "jev-latest",
      state,
      questions: {
        worth: {
          type: "score",
          instructions:
            "This is a git commit from a solo developer's project. A blog writes one post per day from the day's commits for readers who do not code. How useful is this commit as material for that post?",
          criteria: [
            "Nothing to write about: automated data refresh, version bump, merge, typo, empty or generic message",
            "Minor touch-up a reader would not notice, or a message that says what changed but not why",
            "A change a reader could notice, or a message that explains why it was done",
            "Could be the center of the day's post: a new feature, a real bug hunt with cause and fix, or a decision with reasons",
          ],
        },
        is_bot: {
          type: "noul",
          instructions: "Was this commit made automatically by a program or scheduled job rather than written by a person?",
        },
        type: {
          type: "choice",
          instructions: "Which conventional commit type fits this change best?",
          criteria: {
            feat: "Adds a new capability or user-visible feature",
            fix: "Repairs something that was actually broken",
            docs: "Only documentation or written guides change",
            chore: "Maintenance, data refresh, config, dependencies, automation",
            design: "Visual or layout change without new capability",
            asset: "Adds or replaces images, fonts, audio or other asset files",
          },
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`Jev ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { answers: Record<string, any>; usage?: { input_tokens?: number } };
  return { answers: json.answers, tokens: json.usage?.input_tokens ?? 0 };
}

async function main() {
  if (!process.env.TYPESAFE_API_KEY) throw new Error("TYPESAFE_API_KEY가 없습니다");
  const octokit = new Octokit({ auth: process.env.GH_PAT || process.env.GITHUB_TOKEN });
  const owner = (process.env.GITHUB_REPOSITORY ?? "jessi-Kang/vibelog").split("/")[0];
  const repos: string[] = JSON.parse(fs.readFileSync("content/projects.json", "utf8")).map(
    (p: { slug: string }) => p.slug,
  );

  const rows: Row[] = [];
  const shaInfo = new Map<string, { message: string; files: string[] }>();
  for (const repo of repos) {
    let page = 1;
    const list: any[] = [];
    try {
      while (list.length < PER_REPO_MAX) {
        const { data } = await octokit.rest.repos.listCommits({ owner, repo, since: `${SINCE}T00:00:00Z`, per_page: 100, page });
        list.push(...data);
        if (data.length < 100) break;
        page++;
      }
    } catch (err) {
      // 레포 하나를 못 읽어도 나머지로 시험한다
      console.warn(`수집 실패: ${repo} — ${(err as Error).message.slice(0, 120)}`);
      continue;
    }
    for (const c of list.slice(0, PER_REPO_MAX)) {
      if (c.parents?.length > 1) continue; // 병합 커밋은 밤 수집도 뺀다
      let files: string[] = [];
      try {
        const { data: d } = await octokit.rest.repos.getCommit({ owner, repo, ref: c.sha });
        files = (d.files ?? []).map((f: { filename: string }) => f.filename).slice(0, 15);
      } catch {
        /* 파일 목록 없이도 판단은 한다 */
      }
      const message: string = c.commit.message;
      const subject = message.split("\n")[0];
      shaInfo.set(`${repo}@${c.sha}`, { message, files });
      rows.push({
        repo,
        sha: c.sha.slice(0, 7),
        day: nightKST(c.commit.committer?.date ?? c.commit.author?.date ?? ""),
        subject,
        bodyLen: commitBody(message).length,
        ruleBot: isBotCommit({ author: c.author?.login ?? c.commit.author?.name, authorName: c.commit.author?.name, authorEmail: c.commit.author?.email }),
        rulePass: followsCommitRule(message),
        prefix: subject.match(new RegExp(`^(${COMMIT_TYPES.join("|")}):`))?.[1] ?? null,
      });
    }
    console.log(`수집: ${repo} 커밋 ${list.length}개`);
  }

  // Jev에 묻는다 — 한 번에 5개씩
  let tokens = 0;
  const shaFull = [...shaInfo.keys()];
  for (let i = 0; i < rows.length; i += 5) {
    await Promise.all(
      rows.slice(i, i + 5).map(async (r, k) => {
        const info = shaInfo.get(shaFull[i + k])!;
        try {
          const { answers, tokens: t } = await askJev({
            repo: r.repo,
            commit_message: info.message
              .split("\n")
              .filter((l) => !/^(Co-Authored-By|Claude-Session|Signed-off-by):/i.test(l.trim()))
              .join("\n")
              .trim(),
            changed_files: info.files,
          });
          tokens += t;
          r.jevWorth = answers.worth?.score;
          r.jevWorthConf = answers.worth?.confidence;
          r.jevBot = answers.is_bot?.noul;
          r.jevType = answers.type?.choice;
          r.jevTypeConf = answers.type?.confidence;
        } catch (err) {
          r.error = (err as Error).message;
        }
      }),
    );
  }

  report(rows, tokens);
}

function report(rows: Row[], tokens: number) {
  const ok = rows.filter((r) => !r.error);
  const errs = rows.filter((r) => r.error);
  const out: string[] = [];
  const line = (s = "") => out.push(s);
  const cut = (s: string) => (s.length > 60 ? s.slice(0, 59) + "…" : s).replace(/\|/g, "/");

  line(`# Jev 시험 — ${SINCE} 이후 커밋 ${rows.length}개 (발행 안 함)`);
  line();
  line(`| 항목 | 값 |`);
  line(`|---|---|`);
  line(`| 물어본 커밋 | ${ok.length}개 (실패 ${errs.length}개) |`);
  line(`| 입력 토큰 | ${tokens.toLocaleString("en-US")} |`);
  line(`| 비용 | $${((tokens / 1e6) * PRICE_PER_MTOK).toFixed(5)} |`);
  if (errs.length) {
    line();
    line(`실패 예: ${errs[0].error}`);
  }

  // 1) 봇 판정
  const botAgree = ok.filter((r) => r.ruleBot === (r.jevBot ?? 0) >= 0.5).length;
  line();
  line(`## 봇 판정 — 규칙과 ${botAgree}/${ok.length} 일치`);
  line();
  line(`| 레포 | sha | 제목 | 규칙 | Jev |`);
  line(`|---|---|---|---|---|`);
  for (const r of ok.filter((r) => r.ruleBot !== (r.jevBot ?? 0) >= 0.5).slice(0, 25)) {
    line(`| ${r.repo} | ${r.sha} | ${cut(r.subject)} | ${r.ruleBot ? "봇" : "사람"} | ${(r.jevBot ?? 0).toFixed(2)} |`);
  }

  // 2) 쓸 만한 커밋 — 사람 커밋만
  const human = ok.filter((r) => !r.ruleBot);
  const jevPass = (r: Row) => (r.jevWorth ?? 0) >= 1.5;
  const both = human.filter((r) => r.rulePass && jevPass(r)).length;
  const ruleOnly = human.filter((r) => r.rulePass && !jevPass(r));
  const jevOnly = human.filter((r) => !r.rulePass && jevPass(r));
  const neither = human.filter((r) => !r.rulePass && !jevPass(r)).length;
  line();
  line(`## 글을 쓸 만한 커밋 — 사람 커밋 ${human.length}개`);
  line();
  line(`규칙: 서명 줄을 뺀 본문 40자 이상. Jev: 점수 0–3 중 1.5 이상.`);
  line();
  line(`| | Jev 통과 | Jev 탈락 |`);
  line(`|---|---|---|`);
  line(`| 규칙 통과 | ${both} | ${ruleOnly.length} |`);
  line(`| 규칙 탈락 | ${jevOnly.length} | ${neither} |`);
  line();
  line(`### 규칙은 통과, Jev는 탈락 (본문은 길지만 쓸 거리가 적다고 본 것)`);
  line();
  line(`| 레포 | sha | 제목 | 본문 | Jev 점수 |`);
  line(`|---|---|---|---|---|`);
  for (const r of ruleOnly.slice(0, 20)) line(`| ${r.repo} | ${r.sha} | ${cut(r.subject)} | ${r.bodyLen}자 | ${r.jevWorth?.toFixed(2)} |`);
  line();
  line(`### 규칙은 탈락, Jev는 통과 (본문은 짧지만 쓸 거리가 있다고 본 것)`);
  line();
  line(`| 레포 | sha | 제목 | 본문 | Jev 점수 |`);
  line(`|---|---|---|---|---|`);
  for (const r of jevOnly.slice(0, 20)) line(`| ${r.repo} | ${r.sha} | ${cut(r.subject)} | ${r.bodyLen}자 | ${r.jevWorth?.toFixed(2)} |`);

  // 3) 밤마다 글이 나오는지 — 같은 밤 5개 조건을 두 기준으로
  const days = new Map<string, { rule: number; jev: number }>();
  for (const r of human) {
    const k = `${r.repo} ${r.day}`;
    const d = days.get(k) ?? { rule: 0, jev: 0 };
    if (r.rulePass) d.rule++;
    if (jevPass(r)) d.jev++;
    days.set(k, d);
  }
  const diff = [...days.entries()].filter(([, d]) => d.rule >= 5 !== d.jev >= 5);
  line();
  line(`## 밤마다 글이 나오는가 — 같은 밤 5개 조건, ${days.size}밤 중 ${diff.length}밤이 갈린다`);
  line();
  line(`모자란 밤의 커밋이 다음 밤으로 넘어가는 것은 셈에 넣지 않았다 (어림).`);
  line();
  line(`| 레포·밤 | 규칙 개수 | Jev 개수 |`);
  line(`|---|---|---|`);
  for (const [k, d] of diff.slice(0, 20)) line(`| ${k} | ${d.rule} | ${d.jev} |`);

  // 4) 타입 맞히기
  const typed = ok.filter((r) => r.prefix);
  const hit = typed.filter((r) => r.jevType === r.prefix).length;
  line();
  line(`## 타입 맞히기 — 타입이 붙은 커밋 ${typed.length}개 중 ${hit}개 일치`);
  line();
  const conf = new Map<string, number>();
  for (const r of typed) conf.set(`${r.prefix}→${r.jevType}`, (conf.get(`${r.prefix}→${r.jevType}`) ?? 0) + 1);
  line(`| 실제→Jev | 개수 |`);
  line(`|---|---|`);
  for (const [k, v] of [...conf.entries()].sort((a, b) => b[1] - a[1])) line(`| ${k} | ${v} |`);
  const untyped = ok.filter((r) => r.repo === "vibelog" && !r.prefix && !r.ruleBot);
  line();
  line(`### 타입 없이 올라간 vibelog 커밋에 Jev가 붙인 타입 (${untyped.length}개 중 최대 20개)`);
  line();
  line(`| sha | 제목 | Jev 타입 | 확신 |`);
  line(`|---|---|---|---|`);
  for (const r of untyped.slice(0, 20)) line(`| ${r.sha} | ${cut(r.subject)} | ${r.jevType} | ${r.jevTypeConf?.toFixed(2)} |`);

  const md = out.join("\n");
  console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
  fs.writeFileSync("jev-trial.json", JSON.stringify(rows, null, 1));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
