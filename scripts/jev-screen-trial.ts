/**
 * jev-screen-trial.ts — 쇼츠 문장마다 보여 줄 화면을 Jev(TypeSafe AI)가 고르게 해 보고,
 * 지난 대본에서 Opus가 고른 화면·실제로 녹화된 화면과 나란히 놓는다. 발행하지 않는다.
 *
 *   TYPESAFE_API_KEY=… npx tsx scripts/jev-screen-trial.ts
 *
 * 쇼츠에서 실제로 생긴 실수는 "같은 화면이 한 편에 두 번 나온다"였다
 * (checkDemoScreens가 warn으로 남긴다). 그 자리에 Jev를 쓰면 나아지는지 본다.
 * 화면 목록은 지금 배포된 사이트에서 읽는다 — 대본을 쓸 때의 사이트와 조금 다를 수 있다.
 *
 * 결과는 표준 출력과 Actions 실행 요약(GITHUB_STEP_SUMMARY), jev-screen-trial.json에 남는다.
 */
import fs from "node:fs";
import path from "node:path";
import { siteScreens, type SiteScreen } from "./script";

const JEV_URL = process.env.JEV_URL ?? "https://api.typesafe.ai/v1/systemone";
const PRICE_PER_MTOK = 0.042;
const NONE = "none";

interface Line {
  scene: string;
  ko: string;
  screen?: string;
  find?: string;
  shot?: string;
  diagram?: unknown;
  motif?: string;
}

interface Row {
  id: string; // repo/date
  idx: number;
  scene: string;
  ko: string;
  opus: string; // 대본이 고른 것: 경로, "find만", "그림", "모티프", "없음"
  recorded?: string; // 실제로 녹화된 경로 (화면을 고른 문장만)
  jev?: string;
  jevConf?: number;
  jevTop2?: string;
  error?: string;
}

async function askJev(state: unknown, criteria: Record<string, string>) {
  const res = await fetch(JEV_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "jev-latest",
      state,
      questions: {
        screen: {
          type: "choice",
          instructions:
            "A short vertical video narrates `sentence` while showing a screen recording of the project's live website. " +
            "Which page of the site best shows what `sentence` is talking about? Pick `none` if no page shows it " +
            "(the sentence explains an idea, a cause, or something invisible), because a wrong page is worse than no page.",
          criteria,
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`Jev ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = (await res.json()) as { answers: Record<string, any>; usage?: { input_tokens?: number } };
  return { a: j.answers.screen, tokens: j.usage?.input_tokens ?? 0 };
}

/** 녹화기와 같은 규칙으로 정류장을 만들어, 문장 → 녹화된 경로를 짝짓는다 (record.ts) */
function recordedPaths(lines: Line[], segs: { path?: string }[]): Map<number, string> {
  const keys: string[] = [];
  const out = new Map<number, string>();
  lines.forEach((l, i) => {
    if (!l.screen && !l.find) return;
    const key = `${l.screen ?? ""}\u0000${l.find ?? ""}`;
    let k = keys.indexOf(key);
    if (k === -1) {
      keys.push(key);
      k = keys.length - 1;
    }
    const p = segs[k]?.path;
    if (p) out.set(i, p.split("?")[0]);
  });
  return out;
}

async function main() {
  if (!process.env.TYPESAFE_API_KEY) throw new Error("TYPESAFE_API_KEY가 없습니다");
  const projects: { slug: string; homepage?: string | null }[] = JSON.parse(
    fs.readFileSync("content/projects.json", "utf8"),
  );
  const rows: Row[] = [];
  const screenCache = new Map<string, SiteScreen[]>();
  let tokens = 0;

  for (const repo of fs.readdirSync("content/shorts")) {
    const home = projects.find((p) => p.slug === repo)?.homepage;
    if (!home) continue;
    if (!screenCache.has(repo)) screenCache.set(repo, await siteScreens(home));
    const screens = screenCache.get(repo)!;
    if (screens.length < 2) {
      console.log(`건너뜀: ${repo} 화면 ${screens.length}개`);
      continue;
    }
    // 고를 수 있는 화면 = 지금 사이트 화면 + "없음"
    const criteria: Record<string, string> = {};
    // 미리보기 그림 주소는 ?버전이 붙는다 — 녹화 기록과 맞추려고 뗀다
    for (const s of screens) criteria[s.path.split("?")[0]] = `${s.label}. Visible text: ${s.sees.slice(0, 8).join(" / ")}`;
    criteria[NONE] = "No page shows this; it explains an idea or something not visible on the site";

    const files = fs.readdirSync(path.join("content/shorts", repo)).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f));
    for (const f of files) {
      const date = f.replace(".json", "");
      const script = JSON.parse(fs.readFileSync(path.join("content/shorts", repo, f), "utf8"));
      const lines: Line[] = script.lines ?? [];
      const segFile = path.join("content/shorts", repo, `${date}.ko.segments.json`);
      const segs = fs.existsSync(segFile) ? JSON.parse(fs.readFileSync(segFile, "utf8")).screens ?? [] : [];
      const rec = recordedPaths(lines, segs);
      lines.forEach((l, i) => {
        if (l.scene === "hook" || l.scene === "end") return; // 화면을 고르지 않는 자리
        rows.push({
          id: `${repo}/${date}`,
          idx: i,
          scene: l.scene,
          ko: l.ko,
          opus: l.screen ? l.screen.split("?")[0] : l.find ? "find만" : l.diagram ? "그림" : l.motif ? "모티프" : "없음",
          recorded: rec.get(i),
        });
      });
      // 문장마다 Jev에 묻는다 — 앞뒤 문장을 같이 준다
      const mine = rows.filter((r) => r.id === `${repo}/${date}`);
      await Promise.all(
        mine.map(async (r) => {
          try {
            const { a, tokens: t } = await askJev(
              {
                project: repo,
                video_title: script.captions?.ko?.split("\n")[0] ?? "",
                previous_sentence: lines[r.idx - 1]?.ko ?? "",
                sentence: r.ko,
                next_sentence: lines[r.idx + 1]?.ko ?? "",
              },
              criteria,
            );
            tokens += t;
            r.jev = a.choice;
            r.jevConf = a.confidence;
            const top = Object.entries(a.probabilities as Record<string, number>).sort((x, y) => y[1] - x[1]);
            r.jevTop2 = top[1] ? `${top[1][0]} ${top[1][1].toFixed(2)}` : "";
          } catch (err) {
            r.error = (err as Error).message;
          }
        }),
      );
      console.log(`물음: ${repo}/${date} 문장 ${mine.length}개`);
    }
  }
  report(rows, tokens, screenCache);
}

function report(rows: Row[], tokens: number, screens: Map<string, SiteScreen[]>) {
  const ok = rows.filter((r) => !r.error);
  const out: string[] = [];
  const line = (s = "") => out.push(s);
  const cut = (s: string, n = 40) => (s.length > n ? s.slice(0, n - 1) + "…" : s).replace(/\|/g, "/");

  line(`# Jev 화면 고르기 시험 — 문장 ${rows.length}개 (발행 안 함)`);
  line();
  line(`| 항목 | 값 |`);
  line(`|---|---|`);
  line(`| 물어본 문장 | ${ok.length}개 (실패 ${rows.length - ok.length}개) |`);
  line(`| 입력 토큰 | ${tokens.toLocaleString("en-US")} |`);
  line(`| 비용 | $${((tokens / 1e6) * PRICE_PER_MTOK).toFixed(5)} |`);
  for (const [repo, sc] of screens) line(`| ${repo} 화면 | ${sc.map((s) => s.path).join(", ")} |`);
  const err = rows.find((r) => r.error);
  if (err) line(`\n실패 예: ${err.error}`);

  // 1) 녹화된 화면이 있는 문장: Jev가 같은 화면을 골랐나.
  // 사이트 주소가 그사이 바뀐 문장(녹화된 주소가 지금 목록에 없음)은 비교하지 않는다.
  const now = new Map([...screens].map(([repo, sc]) => [repo, new Set(sc.map((x) => x.path.split("?")[0]))]));
  const stale = ok.filter((r) => r.recorded && !now.get(r.id.split("/")[0])?.has(r.recorded));
  const shown = ok.filter((r) => r.recorded && !stale.includes(r));
  const same = shown.filter((r) => r.jev === r.recorded).length;
  const jevNone = shown.filter((r) => r.jev === NONE).length;
  line();
  line(`## 화면이 녹화된 문장 ${shown.length}개 — Jev가 같은 화면 ${same}개, "없음" ${jevNone}개`);
  line();
  line(`사이트 주소가 그사이 바뀌어 비교하지 못한 문장 ${stale.length}개: ${[...new Set(stale.map((r) => r.recorded))].join(", ")}`);
  line();
  line(`| 편 | 문장 | 녹화 | Jev | 확신 | 둘째 |`);
  line(`|---|---|---|---|---|---|`);
  for (const r of shown.filter((r) => r.jev !== r.recorded))
    line(`| ${r.id} | ${cut(r.ko)} | ${r.recorded} | ${r.jev} | ${r.jevConf?.toFixed(2)} | ${r.jevTop2} |`);

  // 2) 대본이 화면 대신 그림·모티프를 고른 문장: Jev도 "없음"을 골랐나
  const drawn = ok.filter((r) => r.opus === "그림" || r.opus === "모티프");
  const drawnNone = drawn.filter((r) => r.jev === NONE).length;
  line();
  line(`## 대본이 그림·모티프를 붙인 문장 ${drawn.length}개 — Jev도 "없음" ${drawnNone}개`);
  line();
  line(`| 편 | 문장 | 대본 | Jev | 확신 |`);
  line(`|---|---|---|---|---|`);
  for (const r of drawn.filter((r) => r.jev !== NONE))
    line(`| ${r.id} | ${cut(r.ko)} | ${r.opus} | ${r.jev} | ${r.jevConf?.toFixed(2)} |`);

  // 3) 한 편에 같은 화면이 두 번 나오나 — 녹화 vs Jev
  const ids = [...new Set(ok.map((r) => r.id))];
  const dup = (paths: string[]) => paths.length - new Set(paths).size;
  let recDup = 0;
  let jevDup = 0;
  const dupRows: string[] = [];
  for (const id of ids) {
    const mine = ok.filter((r) => r.id === id);
    const rd = dup(mine.map((r) => r.recorded).filter((p): p is string => !!p));
    const jd = dup(mine.map((r) => r.jev).filter((p): p is string => !!p && p !== NONE));
    recDup += rd;
    jevDup += jd;
    if (rd || jd) dupRows.push(`| ${id} | ${rd} | ${jd} |`);
  }
  line();
  line(`## 한 편에 같은 화면이 다시 나온 횟수 — 녹화 ${recDup}번, Jev ${jevDup}번 (${ids.length}편)`);
  line();
  line(`같은 화면의 다른 곳을 가리키는 경우도 1번으로 센다 (어림).`);
  line();
  line(`| 편 | 녹화 | Jev |`);
  line(`|---|---|---|`);
  for (const d of dupRows) line(d);

  // 4) 확신 분포
  const conf = ok.map((r) => r.jevConf ?? 0).sort((a, b) => a - b);
  const q = (p: number) => conf[Math.floor(p * (conf.length - 1))]?.toFixed(2);
  line();
  line(`## 확신 — 하위 25% ${q(0.25)}, 중간 ${q(0.5)}, 상위 25% ${q(0.75)}`);

  const md = out.join("\n");
  console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
  fs.writeFileSync("jev-screen-trial.json", JSON.stringify(rows, null, 1));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
