/**
 * jev-story-trial.ts — 글 페이지에 붙일 두 가지를 Jev(TypeSafe AI)가 고를 수 있는지 시험한다.
 * 발행하지 않고 content/를 건드리지 않는다.
 *
 *   TYPESAFE_API_KEY=… npx tsx scripts/jev-story-trial.ts
 *
 * 4) 이어지는 글: 같은 프로젝트의 지난 글을 보기로 주고 "이 글은 어느 글의 이야기를
 *    이어 가나"를 고르게 한다. 이어지는 글이 없으면 none. 글 페이지의 "이전 이야기" 링크가 된다.
 * 5) 글 종류: 기능 추가 · 버그 잡기 · 디자인 · 자동화·인프라 · 비용 중 하나를 고르게 한다.
 *    글 목록의 "버그 잡기만 보기" 같은 필터가 된다.
 *
 * 정답 표가 없으므로 글마다 제목과 Jev의 답을 나란히 적어, 사람이 읽고 맞는지 본다.
 * 결과는 표준 출력과 Actions 실행 요약(GITHUB_STEP_SUMMARY)에 남는다.
 */
import fs from "node:fs";
import path from "node:path";

const JEV_URL = process.env.JEV_URL ?? "https://api.typesafe.ai/v1/systemone";
const PRICE_PER_MTOK = 0.042;

const KINDS = {
  feature: "Adds something new that a visitor or the author can now do or see",
  bugfix: "The story is mainly about something that was broken and how it got fixed",
  design: "The story is mainly about how things look: layout, colors, typography, icons, motion",
  infra: "The story is mainly about automation, pipelines, schedules, deploys, checks, or tooling behind the scenes",
  cost: "The story is mainly about spending less money or fewer resources",
} as const;
const KIND_KO: Record<string, string> = {
  feature: "기능 추가",
  bugfix: "버그 잡기",
  design: "디자인",
  infra: "자동화·인프라",
  cost: "비용",
};

interface Post {
  repo: string;
  date: string;
  title: string;
  failStory: boolean;
  did: string;
  next: string;
}

function section(body: string, head: string): string {
  const m = body.split(/^## /m).find((p) => p.startsWith(head));
  return m ? m.slice(m.indexOf("\n") + 1).trim() : "";
}

function loadPosts(): Post[] {
  const out: Post[] = [];
  for (const repo of fs.readdirSync("content/devlog")) {
    for (const f of fs.readdirSync(path.join("content/devlog", repo)).filter((x) => /^\d{4}-\d{2}-\d{2}\.md$/.test(x)).sort()) {
      const raw = fs.readFileSync(path.join("content/devlog", repo, f), "utf8");
      const body = raw.split(/\n---\n/).slice(1).join("\n---\n").split("<!-- en -->")[0];
      out.push({
        repo,
        date: f.replace(".md", ""),
        title: raw.match(/^title:\s*"(.*)"/m)?.[1] ?? "",
        failStory: /^failStory:\s*true/m.test(raw),
        did: section(body, "뭘 했나"),
        next: section(body, "다음 할 것"),
      });
    }
  }
  return out;
}

async function jev(state: unknown, questions: Record<string, unknown>) {
  const res = await fetch(JEV_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "jev-latest", state, questions }),
  });
  if (!res.ok) throw new Error(`Jev ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = (await res.json()) as { answers: Record<string, any>; usage?: { input_tokens?: number } };
  return { a: j.answers, tokens: j.usage?.input_tokens ?? 0 };
}

interface Row {
  post: Post;
  prevPick?: string;
  prevConf?: number;
  prevTop2?: string;
  kind?: string;
  kindConf?: number;
  kindTop2?: string;
  error?: string;
}

async function main() {
  if (!process.env.TYPESAFE_API_KEY) throw new Error("TYPESAFE_API_KEY가 없습니다");
  const posts = loadPosts();
  let tokens = 0;
  const rows: Row[] = [];

  for (const p of posts) {
    const row: Row = { post: p };
    const earlier = posts.filter((x) => x.repo === p.repo && x.date < p.date);
    const questions: Record<string, unknown> = {
      kind: {
        type: "choice",
        instructions: "Which one kind best describes what this devlog post is mainly about?",
        criteria: KINDS,
      },
    };
    if (earlier.length > 0) {
      const criteria: Record<string, string> = {
        none: "This post starts a new topic; no earlier post's story continues here",
      };
      // 보기 이름은 날짜, 설명은 그 글의 제목과 "다음 할 것" — 이어진다면 지난 글이 예고한 일이 오늘 글이 된다
      for (const e of earlier) criteria[e.date] = `${e.title}. Planned next: ${e.next.slice(0, 300)}`;
      questions.continues = {
        type: "choice",
        instructions:
          "Each option is an earlier post from the same project. Which earlier post's story does this post directly continue " +
          "(it finishes, fixes, or extends the same thing)? Pick `none` if it is a different topic. A wrong link is worse than no link.",
        criteria,
      };
    }
    try {
      const { a, tokens: t } = await jev({ project: p.repo, title: p.title, what_was_done: p.did }, questions);
      tokens += t;
      const top2 = (x: { probabilities?: Record<string, number> }) => {
        const s = Object.entries(x?.probabilities ?? {}).sort((m, n) => n[1] - m[1]);
        return s[1] ? `${s[1][0]} ${s[1][1].toFixed(2)}` : "";
      };
      row.kind = a.kind?.choice;
      row.kindConf = a.kind?.confidence;
      row.kindTop2 = top2(a.kind);
      if (a.continues) {
        row.prevPick = a.continues.choice;
        row.prevConf = a.continues.confidence;
        row.prevTop2 = top2(a.continues);
      }
    } catch (err) {
      row.error = (err as Error).message;
    }
    rows.push(row);
    console.log(`물음: ${p.repo}/${p.date}`);
  }

  const out: string[] = [];
  const line = (x = "") => out.push(x);
  const esc = (s: string) => s.replace(/\|/g, "\\|");
  line(`# Jev 이어지는 글·글 종류 시험 — 글 ${rows.length}편 (발행 안 함)`);
  line();
  line(`| 항목 | 값 |`);
  line(`|---|---|`);
  line(`| 실패 | ${rows.filter((r) => r.error).length}개 |`);
  line(`| 입력 토큰 | ${tokens.toLocaleString("en-US")} |`);
  line(`| 비용 | $${((tokens / 1e6) * PRICE_PER_MTOK).toFixed(5)} |`);
  const e = rows.find((r) => r.error);
  if (e) line(`\n실패 예: ${e.error}`);

  line();
  line(`## 4) 이어지는 글`);
  line();
  line(`| 글 | 제목 | Jev가 고른 지난 글 | 확신 | 2순위 |`);
  line(`|---|---|---|---|---|`);
  for (const r of rows) {
    if (r.prevPick === undefined) continue;
    const prev = rows.find((x) => x.post.repo === r.post.repo && x.post.date === r.prevPick);
    const pick = prev ? `${r.prevPick} ${esc(prev.post.title)}` : r.prevPick;
    line(`| ${r.post.repo}/${r.post.date} | ${esc(r.post.title)} | ${pick} | ${r.prevConf?.toFixed(2)} | ${r.prevTop2} |`);
  }

  line();
  line(`## 5) 글 종류`);
  line();
  const counts = Object.keys(KINDS).map((k) => `${KIND_KO[k]} ${rows.filter((r) => r.kind === k).length}`);
  line(`나눠진 수: ${counts.join(" · ")}`);
  line();
  line(`| 글 | 제목 | Jev 종류 | 확신 | 2순위 | 삽질 배지 |`);
  line(`|---|---|---|---|---|---|`);
  for (const r of rows)
    line(
      `| ${r.post.repo}/${r.post.date} | ${esc(r.post.title)} | ${KIND_KO[r.kind ?? ""] ?? r.kind ?? "—"} | ${r.kindConf?.toFixed(2) ?? ""} | ${r.kindTop2 ?? ""} | ${r.post.failStory ? "있음" : ""} |`,
    );

  const md = out.join("\n");
  console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
