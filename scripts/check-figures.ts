/**
 * 글 삽화 검사기 — `npx tsx scripts/check-figures.ts`
 *
 * 두 가지를 본다.
 *   ① content/ 에 저장된 삽화가 지금 규칙을 지키는지 (손으로 고쳤거나 옛
 *      형식이 남아 있어도 화면에 나가기 전에 잡는다)
 *   ② 허용 목록이 여전히 무는지 — 고정된 공격 입력을 매번 다시 먹인다.
 *      규칙을 느슨하게 고치면 여기서 바로 드러난다.
 *
 * 브라우저가 필요한 검사(넘침·겹침·대비·좁은 화면 글자 크기)는 여기 없다.
 * 그건 렌더해서 재야 하므로 QA 스킬의 qa-render가 본다 (.claude/skills/qa).
 *
 * 파일을 읽으므로 **figure-types.ts가 아니라 여기에** 둔다 — figure-types는
 * 브라우저로 번들되는 코드가 가져가므로 node 전용 모듈이 들어가면 안 된다.
 */
import fs from "node:fs";
import path from "node:path";
import {
  FigError,
  checkRoot,
  figureText,
  inventedNumbers,
  splitParas,
  toFigure,
  type FigNode,
  type PostFigure,
  FIG_SECTIONS,
} from "./figure-types";

const ROOT = process.cwd();
const DEVLOG = path.join(ROOT, "content", "devlog");
const FIXTURE = path.join(ROOT, "scripts", "fixtures", "figure-sample.svg");

/** 저장된 트리를 다시 문자열로 — 검사를 원문과 같은 길로 태우기 위해 */
function toSvg(n: FigNode): string {
  const attrs = Object.entries(n.attrs ?? {})
    .map(([k, v]) => ` ${k}="${String(v).replace(/[<>&"]/g, "")}"`)
    .join("");
  const kids = (n.children ?? []).map(toSvg).join("");
  const text = n.text ?? "";
  if (!text && !kids) return `<${n.tag}${attrs} />`;
  return `<${n.tag}${attrs}>${text}${kids}</${n.tag}>`;
}

let fail = 0;
const say = (ok: boolean, msg: string) => {
  if (!ok) fail++;
  console.log(`  ${ok ? "✓" : "✗"} ${msg}`);
};

/* ① 저장된 삽화 */
console.log("저장된 삽화");
let checked = 0;
if (fs.existsSync(DEVLOG)) {
  for (const repo of fs.readdirSync(DEVLOG)) {
    const dir = path.join(DEVLOG, repo);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".figures.json"))) {
      const date = f.replace(".figures.json", "");
      const md = path.join(dir, `${date}.md`);
      let figs: PostFigure[];
      try {
        figs = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      } catch (e) {
        say(false, `${repo}/${date} — JSON을 못 읽었다: ${(e as Error).message}`);
        continue;
      }
      if (!fs.existsSync(md)) {
        say(false, `${repo}/${date} — 글이 없는데 삽화만 있다`);
        continue;
      }
      const raw = fs.readFileSync(md, "utf8");
      const [ko, en] = raw.split(/<!--\s*en\s*-->/);
      const sectionText = (body: string, key: string): string => {
        const parts = body.split(/^##\s+/m).slice(1);
        const order = ["did", "why", "fail", "next"];
        const i = order.indexOf(key);
        return parts[i] ?? "";
      };
      for (const [i, fig] of figs.entries()) {
        const at = `${repo}/${date} #${i}`;
        if (!FIG_SECTIONS.includes(fig.section)) {
          say(false, `${at} — 모르는 섹션: ${fig.section}`);
          continue;
        }
        const koSec = sectionText(ko, fig.section);
        const enSec = en ? sectionText(en, fig.section) : "";
        const paras = splitParas(koSec.split("\n").slice(1).join("\n"));
        if (!(fig.after >= 0 && fig.after < paras.length))
          say(false, `${at} — after ${fig.after}가 문단 수(${paras.length}) 밖이다`);
        for (const [lang, node, sec] of [
          ["ko", fig.node, koSec],
          ["en", fig.nodeEn, enSec],
        ] as const) {
          try {
            checkRoot(node);
            // 저장된 트리를 다시 문자열로 만들어 원문과 같은 길로 태운다
            toFigure(toSvg(node), sec || koSec);
            if (!figureText(node).length) throw new FigError("라벨이 없다");
            say(true, `${at} (${lang}) — 라벨 ${figureText(node).length - 1}개`);
          } catch (e) {
            say(false, `${at} (${lang}) — ${(e as Error).message}`);
          }
        }
        if (!fig.caption || !fig.alt)
          say(false, `${at} — caption·alt가 비었다`);
        checked++;
      }
    }
  }
}
if (!checked) console.log("  (저장된 삽화 없음)");

/* ② 허용 목록이 여전히 무는지 */
console.log("\n허용 목록");
const good = fs.readFileSync(FIXTURE, "utf8");
const 본문 =
  "같은 밤에 두 번 나가는 것을 막는 장치는 있었습니다. 이 시스템은 새벽 6시를 " +
  "하루의 경계로 씁니다. 6시 6분에 시작된 실행은 새 날의 첫 발행으로 계산됐습니다. " +
  "12시간 안에 이미 한 편이 나갔으면 같은 밤으로 보고 멈춥니다.";

try {
  toFigure(good, 본문);
  say(true, "정상 삽화는 통과한다");
} catch (e) {
  say(false, `정상 삽화가 거절됐다: ${(e as Error).message}`);
}

const attacks: [string, string][] = [
  ["script 태그", good.replace("<title>", "<script>x()</script><title>")],
  ["on* 속성", good.replace("<svg ", '<svg onload="x()" ')],
  ["foreignObject", good.replace("<line", "<foreignObject><b>x</b></foreignObject><line")],
  ["바깥 이미지", good.replace("<line", '<image href="//x/a.png" /><line')],
  ["use + href", good.replace("<line", '<use href="#x" /><line')],
  ["style 속성", good.replace("<rect ", '<rect style="x" ')],
  ["class 속성", good.replace("<rect ", '<rect class="c" ')],
  ["생색(hex)", good.replace('fill="var(--color-accent)"', 'fill="#ff0000"')],
  ["없는 토큰", good.replace("var(--color-accent)", "var(--color-hack)")],
  ["작은 글자", good.replace('font-size="15"', 'font-size="9"')],
  ["본문에 없는 숫자", good.replace(">6:06<", ">9:99<")],
  ["주석", good.replace("<title>", "<!-- x --><title>")],
  ["CDATA", good.replace("<title>", "<![CDATA[x]]><title>")],
  ["숫자 엔티티", good.replace("<title>", "<title>&#60;")],
  ["닫히지 않은 태그", good.replace("</svg>", "")],
  ["짝 안 맞는 태그", good.replace("</text>", "</rect>")],
  ["viewBox 폭 변조", good.replace('viewBox="0 0 390', 'viewBox="0 0 680')],
  ["svg 뒤에 덧붙이기", `${good}<p>hi</p>`],
];
for (const [name, src] of attacks) {
  let 막았나 = false;
  try {
    toFigure(src, 본문);
  } catch {
    막았나 = true;
  }
  say(막았나, `${name} — ${막았나 ? "막았다" : "통과해 버렸다"}`);
}

/* 지어낸 숫자 검사가 실제로 무는지 (규칙이 느슨해지면 여기서 드러난다) */
const n = toFigure(good, 본문);
say(
  inventedNumbers(n, "숫자가 하나도 없는 본문").length > 0,
  "본문에 숫자가 없으면 그림의 숫자를 지적한다",
);
say(inventedNumbers(n, 본문).length === 0, "본문에 있는 숫자는 지적하지 않는다");

console.log(fail ? `\n지적 ${fail}건` : "\n삽화 규칙 이상 없음");
process.exit(fail ? 1 : 0);
