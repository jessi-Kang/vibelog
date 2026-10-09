/**
 * jev-highlight-trial.ts — 일주일 치 글에서 "이번 주 가장 큰 일" 2–3편을 Jev(TypeSafe AI)가
 * 고를 수 있는지 시험한다. 발행하지 않고 content/를 건드리지 않는다.
 *
 *   TYPESAFE_API_KEY=… npx tsx scripts/jev-highlight-trial.ts
 *
 * 두 가지로 묻는다.
 * 1) 점수: 글마다 따로 "처음 들어온 사람에게 이 일이 얼마나 큰가"를 0–3으로.
 * 2) 고르기: 한 주의 글 전부를 보기로 주고 "이번 주를 대표하는 글 하나"를. 보기별 확률로 순위를 낸다.
 * 정답 표가 없으므로 주마다 글 제목·첫 문장 옆에 두 답과 참고 신호(커밋 수, 삽질 배지,
 * 쇼츠 유무)를 나란히 적어 사람이 읽고 맞는지 본다. 결과는 실행 요약에 남는다.
 */
import fs from "node:fs";
import { getDevlogs, type DevlogEntry } from "../lib/content";

const JEV_URL = process.env.JEV_URL ?? "https://api.typesafe.ai/v1/systemone";
const PRICE_PER_MTOK = 0.042;

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

/** KST 기준 그 주 월요일 날짜 */
function weekOf(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 월=0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

const SCORE = {
  type: "score",
  instructions:
    "A weekly highlight on a devlog site shows the 2-3 biggest things that happened this week, for visitors who do not code. " +
    "How big is what this post describes, from such a visitor's point of view?",
  criteria: [
    "Tiny: internal cleanup, docs, or a small tweak nobody would notice",
    "Small: a visible fix or change, but minor",
    "Notable: a clear new ability, a fixed problem people hit, or a real lesson",
    "Major: a milestone, a new feature people can use, or a story worth retelling",
  ],
};

interface Row {
  post: DevlogEntry;
  score?: number;
  pickProb?: number;
  error?: string;
}

async function main() {
  if (!process.env.TYPESAFE_API_KEY) throw new Error("TYPESAFE_API_KEY가 없습니다");
  const posts = getDevlogs();
  const weeks = new Map<string, DevlogEntry[]>();
  for (const p of posts) weeks.set(weekOf(p.date), [...(weeks.get(weekOf(p.date)) ?? []), p]);
  let tokens = 0;
  const byWeek = new Map<string, Row[]>();

  for (const [wk, list] of [...weeks].sort()) {
    const rows: Row[] = list.map((post) => ({ post }));
    // 1) 점수 — 글마다 따로
    await Promise.all(
      rows.map(async (r) => {
        try {
          const { a, tokens: t } = await jev(
            { project: r.post.repo, title: r.post.title, what_was_done: r.post.sections.did ?? r.post.body.slice(0, 800) },
            { size: SCORE },
          );
          tokens += t;
          r.score = a.size?.score;
        } catch (err) {
          r.error = (err as Error).message;
        }
      }),
    );
    // 2) 고르기 — 한 주를 보기로
    if (rows.length > 1) {
      const criteria: Record<string, string> = {};
      rows.forEach((r, i) => (criteria[`p${i}`] = `[${r.post.repo}] ${r.post.title} — ${r.post.summary ?? ""}`));
      try {
        const { a, tokens: t } = await jev(
          { week_starting: wk },
          {
            pick: {
              type: "choice",
              instructions:
                "These are all devlog posts from one week across several projects. Which single post describes the biggest thing " +
                "that happened this week, for a visitor who does not code?",
              criteria,
            },
          },
        );
        tokens += t;
        const probs = (a.pick?.probabilities ?? {}) as Record<string, number>;
        rows.forEach((r, i) => (r.pickProb = probs[`p${i}`]));
      } catch (err) {
        rows.forEach((r) => (r.error ??= (err as Error).message));
      }
    }
    byWeek.set(wk, rows);
    console.log(`물음: ${wk} 주 ${rows.length}편`);
  }

  const out: string[] = [];
  const line = (x = "") => out.push(x);
  const esc = (s: string) => s.replace(/\|/g, "\\|");
  line(`# Jev 주간 하이라이트 시험 — 글 ${posts.length}편, ${byWeek.size}주 (발행 안 함)`);
  line();
  line(`| 항목 | 값 |`);
  line(`|---|---|`);
  line(`| 실패 | ${[...byWeek.values()].flat().filter((r) => r.error).length}개 |`);
  line(`| 입력 토큰 | ${tokens.toLocaleString("en-US")} |`);
  line(`| 비용 | $${((tokens / 1e6) * PRICE_PER_MTOK).toFixed(5)} |`);
  const e = [...byWeek.values()].flat().find((r) => r.error);
  if (e) line(`\n실패 예: ${e.error}`);

  for (const [wk, rows] of byWeek) {
    const sorted = [...rows].sort((a, b) => (b.pickProb ?? 0) - (a.pickProb ?? 0) || (b.score ?? 0) - (a.score ?? 0));
    line();
    line(`## ${wk} 주 — ${rows.length}편`);
    line();
    line(`| 고르기 순위 | 고르기 확률 | 점수(0–3) | 글 | 첫 문장 | 커밋 | 삽질 | 쇼츠 |`);
    line(`|---|---|---|---|---|---|---|---|`);
    sorted.forEach((r, i) =>
      line(
        `| ${i + 1} | ${r.pickProb?.toFixed(2) ?? "—"} | ${r.score?.toFixed(2) ?? "—"} | ${r.post.repo}/${r.post.date.slice(5)} ${esc(r.post.title)} | ${esc(r.post.summary ?? "")} | ${r.post.commits ?? ""} | ${r.post.hasFail ? "있음" : ""} | ${r.post.short ? "있음" : ""} |`,
      ),
    );
  }

  const md = out.join("\n");
  console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
