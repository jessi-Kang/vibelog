/**
 * 화면 검증 자동 검사 — 렌더해서 재고, 콘솔을 듣는다.
 *
 * 눈으로 봐야 하는 것(어색한 줄바꿈, 이질적인 아이콘, 겹침)은 사람이 본다.
 * 여기서는 매번 손으로 스크립트를 쓰다 빠뜨렸던 기계적인 것만 모아 잰다.
 *
 *   npm run build && npx next start -p 3210
 *   node .claude/skills/qa/scripts/qa-render.mjs http://localhost:3210
 *
 * 반드시 레포 루트에서 돌린다 (playwright를 여기서 찾는다).
 * 스크린샷은 --out 폴더(기본 .qa)에 <route>-<width>.png로 떨어진다.
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const WIDTHS = [320, 390, 834, 1280];
/**
 * 탭 영역 기준을 둘로 나눈다.
 * - **아이콘만 있는 컨트롤**은 44×44. 글자가 없으니 손가락이 겨냥할 게
 *   그 상자뿐이다. 이 레포에서 실제로 지적받은 것도 전부 이쪽이었다
 *   (푸터 아이콘·링크드인·공유·뒤로).
 * - **글자가 있는 링크·버튼**은 24×24 권고(WARN)만. 본문 속 링크까지 44를
 *   들이대면 "전체 →" 같은 것이 전부 걸려서 목록이 무용해진다
 *   (WCAG 2.5.8도 글 속 링크는 예외로 둔다).
 */
const TAP_ICON = 44;
const TAP_TEXT = 24;
const BROWSER = "/opt/pw-browsers/chromium";

const args = process.argv.slice(2);
const base = args.find((a) => a.startsWith("http")) ?? "http://localhost:3000";
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const outDir = flag("out", ".qa");
// 기본은 사이트 밖 요청을 끊는다 — 막힌 망에서 30초씩 기다리던 것이 사라지고
// 결과가 매번 같다. 실시간 카운트(GitHub API)까지 보려면 --external
const external = args.includes("--external");
const routes = flag("routes", "")
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean);

const findings = [];
const add = (level, route, width, what, detail) =>
  findings.push({ level, route, width, what, detail });

/** 배경을 조상까지 올라가 찾아 대비를 낸다 (투명이면 계속 위로) */
const MEASURE = `((TAP_ICON, TAP_TEXT) => {
  const lum = (c) => {
    const [r, g, b] = c.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const parse = (s) => {
    const m = s && s.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(/[\\s,\\/]+/).map(Number);
    if (p.length > 3 && p[3] === 0) return null; // 투명
    return [p[0], p[1], p[2]];
  };
  const bgOf = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const c = parse(getComputedStyle(e).backgroundColor);
      if (c) return c;
    }
    return parse(getComputedStyle(document.body).backgroundColor) || [0, 0, 0];
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
  };
  const seen = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.opacity !== "0";
  };
  const hidden = (el) => el.closest('[aria-hidden="true"]') !== null;
  const name = (el) =>
    (el.getAttribute("aria-label") || el.getAttribute("title") || el.textContent || "").trim();

  const vw = document.documentElement.clientWidth;
  const out = {
    bodyBg: getComputedStyle(document.body).backgroundColor,
    overflow: document.documentElement.scrollWidth - vw,
    wide: [],
    smallTaps: [],
    tightTaps: [],
    unnamed: [],
    lowContrast: [],
  };

  for (const el of document.querySelectorAll("body *")) {
    if (!seen(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) {
      if (el.children.length === 0 || r.width > vw + 1)
        out.wide.push({ tag: el.tagName.toLowerCase(), cls: el.className.toString().slice(0, 70), left: Math.round(r.left), right: Math.round(r.right) });
    }
  }

  // .hit::after { inset: -6px } 처럼 가상 요소로 넓힌 히트 영역을 더한다
  const grown = (el) => {
    const r = el.getBoundingClientRect();
    let pad = 0;
    for (const p of ["::after", "::before"]) {
      const s = getComputedStyle(el, p);
      if (s.content === "none" || s.position !== "absolute") continue;
      const v = [s.top, s.right, s.bottom, s.left].map((x) => -parseFloat(x));
      if (v.every((n) => Number.isFinite(n))) pad = Math.max(pad, Math.min(...v));
    }
    return { w: Math.round(r.width + 2 * Math.max(0, pad)), h: Math.round(r.height + 2 * Math.max(0, pad)) };
  };
  // 글 속에 섞인 링크는 크기 규정에서 빠진다 (WCAG 2.5.8 inline 예외)
  const inlineInText = (el) => {
    if (getComputedStyle(el).display !== "inline") return false;
    const own = (el.textContent || "").trim().length;
    const parent = (el.parentElement?.textContent || "").trim().length;
    return own > 0 && parent > own + 8;
  };

  for (const el of document.querySelectorAll('a, button, input, select, textarea, [role="button"], [role="switch"], [role="tab"]')) {
    if (!seen(el) || hidden(el) || el.tabIndex < 0) continue;
    const box = el.getBoundingClientRect();
    // 포커스 때만 보이는 것(건너뛰기 링크 등)은 크기를 재지 않는다
    if (box.width <= 4 || box.height <= 4) continue;
    if (!name(el)) out.unnamed.push({ tag: el.tagName.toLowerCase(), cls: el.className.toString().slice(0, 70) });
    const { w, h } = grown(el);
    const iconOnly = (el.textContent || "").trim() === "";
    if (iconOnly) {
      if (w < TAP_ICON || h < TAP_ICON)
        out.smallTaps.push({ tag: el.tagName.toLowerCase(), name: name(el).slice(0, 40), w, h, need: TAP_ICON });
    } else if (!inlineInText(el) && (w < TAP_TEXT || h < TAP_TEXT)) {
      out.tightTaps.push({ tag: el.tagName.toLowerCase(), name: name(el).slice(0, 40), w, h, need: TAP_TEXT });
    }
  }

  for (const el of document.querySelectorAll("body *")) {
    if (!seen(el) || hidden(el)) continue;
    const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join("");
    if (!text || text.length > 200) continue;
    const s = getComputedStyle(el);
    const fg = parse(s.color);
    if (!fg) continue;
    const px = parseFloat(s.fontSize);
    const large = px >= 24 || (px >= 18.66 && Number(s.fontWeight) >= 700);
    const need = large ? 3 : 4.5;
    const got = ratio(fg, bgOf(el));
    if (got < need)
      out.lowContrast.push({ text: text.slice(0, 40), px, ratio: Math.round(got * 100) / 100, need });
  }
  return out;
})`;

async function check(page, route, width, opts = {}) {
  if (!external)
    await page.route("**/*", (r) =>
      r.request().url().startsWith(base) ? r.continue() : r.abort(),
    );
  const logs = [];
  const bad = [];
  page.on("console", (m) => {
    if (m.type() === "error") logs.push(m.text().slice(0, 200));
  });
  page.on("pageerror", (e) =>
    logs.push(`pageerror: ${String(e).slice(0, 200)}`),
  );
  page.on("response", (r) => {
    if (r.status() >= 400) bad.push(`${r.status()} ${r.url().slice(0, 110)}`);
  });

  const url = `${base}${route}`;
  page.setDefaultNavigationTimeout(20000);
  const res = await page.goto(url, { waitUntil: "load" }).catch((e) => {
    add("FAIL", route, width, "페이지 로드 실패", String(e).slice(0, 120));
    return null;
  });
  if (!res) return;
  if (!res.ok()) add("FAIL", route, width, `HTTP ${res.status()}`, url);
  await page.waitForTimeout(900); // 클라이언트 갱신이 한 번 돌 틈

  const m = await page.evaluate(`(${MEASURE})(${TAP_ICON}, ${TAP_TEXT})`);

  // CSS가 안 붙은 화면을 재고 "통과"라고 한 적이 있다 — 배경색으로 먼저 가린다
  if (!m.bodyBg || m.bodyBg === "rgba(0, 0, 0, 0)")
    add(
      "FAIL",
      route,
      width,
      "CSS가 안 붙었다 (body 배경 없음)",
      "서버를 다시 띄우고 재측정",
    );

  if (m.overflow > 0)
    add(
      "FAIL",
      route,
      width,
      `가로 넘침 ${m.overflow}px`,
      JSON.stringify(m.wide.slice(0, 3)),
    );
  for (const t of m.smallTaps)
    add(
      "FAIL",
      route,
      width,
      `아이콘 탭 영역 ${t.w}×${t.h} (< ${t.need})`,
      `${t.tag} "${t.name}"`,
    );
  // 글자 링크는 낱개로 늘어놓으면 목록이 묻힌다 — 한 줄로 묶고 예시만
  if (m.tightTaps.length > 0) {
    const ex = m.tightTaps.slice(0, 3).map((t) => `"${t.name}" ${t.w}×${t.h}`);
    add(
      "WARN",
      route,
      width,
      `탭 영역 ${TAP_TEXT}px 미만인 글자 링크 ${m.tightTaps.length}개`,
      ex.join(", "),
    );
  }
  for (const u of m.unnamed)
    add(
      "FAIL",
      route,
      width,
      "이름 없는 컨트롤 (aria-label 필요)",
      `${u.tag}.${u.cls}`,
    );
  for (const c of m.lowContrast)
    add(
      "FAIL",
      route,
      width,
      `대비 ${c.ratio}:1 (${c.need} 필요)`,
      `${c.px}px "${c.text}"`,
    );

  for (const l of [...new Set(logs)]) {
    const network = /Failed to load resource|net::ERR_/.test(l);
    if (network && !external) continue; // 바깥 요청은 우리가 끊었다
    // 리소스 로드 실패는 망 사정일 수 있다 — 스크립트 에러만 막는다
    add(network ? "WARN" : "FAIL", route, width, "콘솔 에러", l);
  }
  for (const b of [...new Set(bad)])
    add(
      b.includes("api.github.com") ? "WARN" : "FAIL",
      route,
      width,
      "실패한 요청",
      b,
    );

  const file = path.join(
    outDir,
    `${(route === "/" ? "home" : route.replace(/\//g, "_")).replace(/^_/, "")}-${width}${opts.tag ?? ""}.png`,
  );
  await page.screenshot({ path: file, fullPage: opts.full ?? false });
}

const b = await chromium.launch({ executablePath: BROWSER });
await mkdir(outDir, { recursive: true });

// 라우트를 안 주면 사이트에서 찾아낸다 (글 주소는 해시라 짐작할 수 없다)
let list = routes;
if (list.length === 0) {
  const p = await b.newPage();
  p.setDefaultNavigationTimeout(20000);
  await p.goto(`${base}/log`, { waitUntil: "load" });
  const post = await p.evaluate(
    () =>
      document.querySelector('a[href^="/p/"]')?.getAttribute("href") ?? null,
  );
  await p.goto(`${base}/`, { waitUntil: "load" });
  const proj = await p.evaluate(
    () =>
      document.querySelector('a[href^="/projects/"]')?.getAttribute("href") ??
      null,
  );
  await p.close();
  list = ["/", "/log", "/shorts", "/about", proj, post].filter(Boolean);
}

for (const route of list) {
  for (const width of WIDTHS) {
    const page = await b.newPage({
      viewport: { width, height: width < 500 ? 780 : 900 },
    });
    await check(page, route, width);
    await page.close();
  }
}

// 애니메이션을 끈 채로도 화면이 서는지 (reduced-motion)
{
  const page = await b.newPage({
    viewport: { width: 390, height: 780 },
    reducedMotion: "reduce",
  });
  await check(page, "/", 390, { tag: "-reduced" });
  await page.close();
}
await b.close();

const fails = findings.filter((f) => f.level === "FAIL");
const warns = findings.filter((f) => f.level === "WARN");

/** 같은 지적이 라우트·폭마다 반복된다 — 한 줄로 묶어 어디서 났는지만 붙인다 */
function group(list) {
  const map = new Map();
  for (const f of list) {
    const key = `${f.what}|${f.detail ?? ""}`;
    const hit = map.get(key) ?? { ...f, where: new Set() };
    hit.where.add(`${f.route}@${f.width}`);
    map.set(key, hit);
  }
  return [...map.values()].map((f) => {
    const where = [...f.where];
    const at =
      where.length > 3
        ? `${where.slice(0, 3).join(" ")} 외 ${where.length - 3}곳`
        : where.join(" ");
    return `  ${f.what}${f.detail ? ` — ${f.detail}` : ""}\n      ${at}`;
  });
}

console.log(
  `\n검사한 화면: ${list.join(", ")} × ${WIDTHS.join("/")} (+ reduced-motion)`,
);
console.log(`스크린샷: ${outDir}/  — 반드시 눈으로도 본다`);
if (!external)
  console.log("바깥 요청은 끊었다 (실시간 카운트까지 보려면 --external)");
if (fails.length)
  console.log(`\n[지적] ${fails.length}건\n${group(fails).join("\n")}`);
if (warns.length)
  console.log(`\n[참고] ${warns.length}건\n${group(warns).join("\n")}`);
if (!fails.length && !warns.length) console.log("\n기계 검사 지적 0건");

await writeFile(
  path.join(outDir, "findings.json"),
  JSON.stringify(findings, null, 2),
);
process.exit(fails.length ? 1 : 0);
