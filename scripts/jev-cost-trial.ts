/**
 * jev-cost-trial.ts — 돈이 드는 단계 앞에서 Jev(TypeSafe AI)가 "할 만한가"를 먼저 판단할 수
 * 있는지 시험한다. 발행하지 않는다.
 *
 *   TYPESAFE_API_KEY=… npx tsx scripts/jev-cost-trial.ts
 *
 * 1) 쇼츠: 대본·목소리·녹화·렌더가 가장 비싼 단계다. 글마다 "실제 사이트 화면으로 보여 줄
 *    것이 얼마나 있나"를 점수로 받아, 실제로 만들어진 쇼츠에서 화면이 차지한 비율과 비교한다.
 *    점수가 낮은 날을 건너뛰면 화면 없는 영상을 덜 만들게 되는지 본다.
 * 2) 삽화: 글이 다 써진 뒤 Opus가 섹션마다 그림을 그린다. 섹션마다 "그림이 있으면 이해가
 *    쉬워지나"를 먼저 물어, 실제로 그림이 붙은 섹션과 비교한다. 맞는다면 그림이 필요 없는
 *    섹션은 Opus에 넘기지 않아 출력이 준다.
 *
 * 결과는 표준 출력과 Actions 실행 요약(GITHUB_STEP_SUMMARY)에 남는다.
 */
import fs from "node:fs";
import path from "node:path";

const JEV_URL = process.env.JEV_URL ?? "https://api.typesafe.ai/v1/systemone";
const PRICE_PER_MTOK = 0.042;
const SECTIONS = { did: "뭘 했나", why: "왜", fail: "삽질 포인트", next: "다음 할 것" } as const;
type Sec = keyof typeof SECTIONS;

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

function sectionsOf(body: string): Partial<Record<Sec, string>> {
  const out: Partial<Record<Sec, string>> = {};
  for (const part of body.split(/^## /m).slice(1)) {
    const nl = part.indexOf("\n");
    const head = part.slice(0, nl).trim();
    const key = (Object.keys(SECTIONS) as Sec[]).find((k) => SECTIONS[k] === head);
    if (key) out[key] = part.slice(nl + 1).trim();
  }
  return out;
}

/** 실제 쇼츠에서 화면이 붙은 문장의 비율 (hook·end 제외) */
function screenShare(file: string): number | null {
  if (!fs.existsSync(file)) return null;
  const s = JSON.parse(fs.readFileSync(file, "utf8"));
  const lines = (s.lines ?? []).filter((l: { scene: string }) => l.scene !== "hook" && l.scene !== "end");
  if (lines.length === 0) return null;
  return lines.filter((l: { screen?: string; find?: string }) => l.screen || l.find).length / lines.length;
}

async function main() {
  if (!process.env.TYPESAFE_API_KEY) throw new Error("TYPESAFE_API_KEY가 없습니다");
  let tokens = 0;
  const posts: { id: string; score?: number; conf?: number; share: number | null; error?: string }[] = [];
  const secs: { id: string; sec: Sec; jev?: number; figures: number; error?: string }[] = [];

  for (const repo of fs.readdirSync("content/devlog")) {
    for (const f of fs.readdirSync(path.join("content/devlog", repo)).filter((x) => /^\d{4}-\d{2}-\d{2}\.md$/.test(x))) {
      const date = f.replace(".md", "");
      const raw = fs.readFileSync(path.join("content/devlog", repo, f), "utf8");
      const title = raw.match(/^title:\s*"(.*)"/m)?.[1] ?? "";
      const body = raw.split(/\n---\n/).slice(1).join("\n---\n").split("<!-- en -->")[0];
      const sections = sectionsOf(body);
      const figFile = path.join("content/devlog", repo, `${date}.figures.json`);
      const figs: { section: Sec }[] = fs.existsSync(figFile) ? JSON.parse(fs.readFileSync(figFile, "utf8")) : [];
      const id = `${repo}/${date}`;

      // 1) 쇼츠 — 글 하나에 한 번
      const p: (typeof posts)[number] = { id, share: screenShare(path.join("content/shorts", repo, `${date}.json`)) };
      try {
        const { a, tokens: t } = await jev(
          { project: repo, title, post: body },
          {
            showable: {
              type: "score",
              instructions:
                "A 40-second vertical video will retell this post while showing screen recordings of the project's live website. " +
                "How much of what the post talks about can actually be seen on the live site's pages?",
              criteria: [
                "Nothing visible: the post is about internal code, automation, costs, docs, or ideas",
                "A little: one thing on the site relates, but most of the story is invisible",
                "Some: a few changes the post describes are visible on the site",
                "Most: the post is about things a visitor can see and use on the site",
              ],
            },
          },
        );
        tokens += t;
        p.score = a.showable?.score;
        p.conf = a.showable?.confidence;
      } catch (err) {
        p.error = (err as Error).message;
      }
      posts.push(p);

      // 2) 삽화 — 섹션마다 한 번에 묻는다 (질문 4개를 한 요청에)
      const qs: Record<string, unknown> = {};
      for (const k of Object.keys(sections) as Sec[]) {
        qs[k] = {
          type: "noul",
          instructions: {
            section: sections[k],
            question:
              "This is one section of a blog post for readers who do not code. Would a simple diagram placed right after `section` make it noticeably easier to understand?",
          },
          criteria: {
            true: "A diagram would clarify a process, a before/after, a comparison, a flow, or numbers in the section",
            false: "The section is short, a plain statement, or a plan; a diagram would only repeat the text",
          },
        };
      }
      try {
        const { a, tokens: t } = await jev({ title }, qs);
        tokens += t;
        for (const k of Object.keys(sections) as Sec[])
          secs.push({ id, sec: k, jev: a[k]?.noul, figures: figs.filter((x) => x.section === k).length });
      } catch (err) {
        for (const k of Object.keys(sections) as Sec[])
          secs.push({ id, sec: k, figures: figs.filter((x) => x.section === k).length, error: (err as Error).message });
      }
    }
  }

  const out: string[] = [];
  const line = (x = "") => out.push(x);
  line(`# Jev 비용 앞 판단 시험 — 글 ${posts.length}편 (발행 안 함)`);
  line();
  line(`| 항목 | 값 |`);
  line(`|---|---|`);
  line(`| 실패 | 쇼츠 ${posts.filter((p) => p.error).length}개, 삽화 ${secs.filter((s) => s.error).length}개 |`);
  line(`| 입력 토큰 | ${tokens.toLocaleString("en-US")} |`);
  line(`| 비용 | $${((tokens / 1e6) * PRICE_PER_MTOK).toFixed(5)} |`);
  const e = [...posts, ...secs].find((x) => x.error);
  if (e) line(`\n실패 예: ${e.error}`);

  // 1) 쇼츠
  const withShort = posts.filter((p) => p.share != null && p.score != null).sort((a, b) => a.score! - b.score!);
  line();
  line(`## 쇼츠 — 영상이 있는 글 ${withShort.length}편: Jev 점수(0–3) vs 실제 화면 비율`);
  line();
  line(`화면 비율 = hook·end를 뺀 문장 중 실제 사이트 화면이 붙은 문장의 몫. 나머지는 그림·아이콘이다.`);
  line();
  line(`| 글 | Jev 점수 | 확신 | 화면 비율 |`);
  line(`|---|---|---|---|`);
  for (const p of withShort) line(`| ${p.id} | ${p.score!.toFixed(2)} | ${p.conf?.toFixed(2)} | ${Math.round(p.share! * 100)}% |`);
  // 순위 상관 (스피어만)
  const rank = (xs: number[]) => {
    const idx = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
    const r = new Array(xs.length);
    idx.forEach(([, i], k) => (r[i] = k));
    return r as number[];
  };
  if (withShort.length > 2) {
    const a = rank(withShort.map((p) => p.score!));
    const b = rank(withShort.map((p) => p.share!));
    const n = a.length;
    const d2 = a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0);
    line();
    line(`순위 상관(스피어만): ${(1 - (6 * d2) / (n * (n * n - 1))).toFixed(2)} — 1에 가까울수록 Jev 점수가 높은 글이 실제로 화면을 많이 썼다`);
  }
  for (const th of [1, 1.5]) {
    const skip = withShort.filter((p) => p.score! < th);
    const avg = (xs: typeof withShort) => (xs.length ? Math.round((xs.reduce((s, p) => s + p.share!, 0) / xs.length) * 100) : 0);
    line();
    line(`점수 ${th} 미만을 건너뛰면: ${skip.length}편을 안 만든다. 건너뛴 편의 평균 화면 비율 ${avg(skip)}%, 남는 편 ${avg(withShort.filter((p) => p.score! >= th))}%`);
  }
  const noShort = posts.filter((p) => p.share == null && p.score != null);
  line();
  line(`쇼츠가 없는 글 ${noShort.length}편의 Jev 점수: ${noShort.map((p) => `${p.id} ${p.score!.toFixed(1)}`).join(", ") || "—"}`);

  // 2) 삽화
  const ok = secs.filter((s) => s.jev != null);
  const yes = (s: (typeof ok)[number]) => (s.jev ?? 0) >= 0.5;
  const tp = ok.filter((s) => yes(s) && s.figures > 0).length;
  const fp = ok.filter((s) => yes(s) && s.figures === 0).length;
  const fn = ok.filter((s) => !yes(s) && s.figures > 0).length;
  const tn = ok.filter((s) => !yes(s) && s.figures === 0).length;
  line();
  line(`## 삽화 — 섹션 ${ok.length}개 (그림이 실제로 붙은 섹션 ${ok.filter((s) => s.figures > 0).length}개)`);
  line();
  line(`| | 실제 그림 있음 | 실제 그림 없음 |`);
  line(`|---|---|---|`);
  line(`| Jev "필요" | ${tp} | ${fp} |`);
  line(`| Jev "불필요" | ${fn} | ${tn} |`);
  line();
  line(`섹션별:`);
  for (const k of Object.keys(SECTIONS) as Sec[]) {
    const m = ok.filter((s) => s.sec === k);
    line(`- ${SECTIONS[k]}: 섹션 ${m.length}개, 실제 그림 있음 ${m.filter((s) => s.figures > 0).length}, Jev "필요" ${m.filter(yes).length}`);
  }
  const allNo = [...new Set(ok.map((s) => s.id))].filter((id) => ok.filter((s) => s.id === id).every((s) => !yes(s)));
  line();
  line(`모든 섹션에 Jev가 "불필요"라고 한 글: ${allNo.length}편 ${allNo.join(", ")} — 이 글들은 삽화 단계를 통째로 건너뛸 수 있었다`);
  line(`Jev가 "불필요"라고 했는데 실제로 그림이 붙은 섹션 ${fn}개는 건너뛰면 그 그림을 잃는다`);

  const md = out.join("\n");
  console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
