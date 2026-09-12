/**
 * record.ts — 배포 사이트를 폰 뷰포트로 열어 데모 영상(webm)과 스크린샷을 찍는다.
 *
 * 여기서 찍는 webm은 "소재"다. 최종 영상은 Remotion이 프레임 단위로
 * 결정론적으로 합성한다 (docs/03-shorts-spec.md "렌더 방식") — 이 녹화 자체가
 * 최종 영상이 되는 일은 없으므로 실시간 녹화의 싱크 문제가 결과물에 전염되지 않는다.
 *
 * demo.steps 미니 DSL: "goto <path>" | "scroll <px>" | "click <selector>" | "wait <ms>"
 * steps가 비어 있으면 기본 투어: 홈 → 천천히 스크롤 → 상위 내부 링크 1~2개 클릭.
 *
 * 사용: npx tsx scripts/record.ts <repo> <date> [durationSec]
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";
import {
  segmentsJsonPath,
  stopKey,
  shortsDir,
  shortsJsonPath,
  type DemoSegment,
  type ShortsScript,
} from "./shorts-types";

const VIEWPORT = { width: 390, height: 844 };
const SCALE = 3;

async function shot(page: Page, dir: string, n: number): Promise<number> {
  await page.screenshot({
    path: path.join(dir, `${String(n).padStart(2, "0")}.png`),
  });
  return n + 1;
}

/**
 * 언어 전환 완료 대기 — SSR은 항상 ko로 그려지고 마운트 후 저장값으로
 * 전환된다(components/lang.tsx). en 녹화에서 이 전환을 기다리지 않으면
 * 한국어 화면이 소재에 섞인다 (Jessi 지적). lang.tsx가 <html lang>을
 * 갱신하므로 그걸 신호로 쓴다.
 *
 * 신호는 vibelog 사이트 것이다 — 다른 프로젝트 사이트(apart 등)는 이 신호가
 * 없으므로, 첫 타임아웃 후에는 그 사이트가 신호를 안 낸다고 보고 이후
 * 대기를 건너뛴다. 안 그러면 페이지 이동마다 8초씩 헛기다린다.
 */
let langSignalAbsent = false;
async function waitForLang(page: Page, lang: "ko" | "en"): Promise<void> {
  if (langSignalAbsent) return;
  await page
    .waitForFunction((l) => document.documentElement.lang === l, lang, {
      timeout: 8000,
    })
    .catch(() => {
      langSignalAbsent = true;
      console.warn(
        `<html lang="${lang}"> 신호 없음 — 이 사이트엔 언어 신호가 없다고 보고 이후 대기 생략`,
      );
    });
}

async function slowScroll(page: Page, px: number): Promise<void> {
  const step = 8;
  for (let y = 0; y < px; y += step) {
    await page.mouse.wheel(0, step);
    await page.waitForTimeout(16);
  }
}

/**
 * 대본이 말한 것을 **사이트에서 찾는다.**
 *
 * 전에는 대본이 경로(screen)를 맞히고 녹화기는 거기로만 갔다. 대본은 사이트를
 * 본 적이 없으니 엉뚱한 화면을 고르거나(공유 글 이야기에 게임 모드 화면),
 * 글자 없는 그림은 아예 가리킬 수 없었다 (apart의 도장은 홈 배경의 SVG다).
 * 그래서 뒤집는다 — 대본은 문장이 말하는 것을 적고, **찾는 일은 녹화기가**
 * 한다 (Jessi: "대본에 맞춘 화면을 찾아내서 영상에 써야지").
 *
 * 찾는 순서는 웹 표준과 크기뿐이다 — 사이트별 사전을 만들지 않는다
 * (Jessi: "이렇게 매번 커스텀할 게 아니야").
 *   1) 눈에 보이는 **글자**가 그 말을 담고 있는 요소
 *   2) **접근 이름**(aria-label·alt·title)이 그 말을 담고 있는 요소 —
 *      그림에 이름을 붙이는 웹의 표준 방식이다
 *   3) 그래도 없으면 그 화면에서 **가장 큰 그림**(svg·img·canvas) —
 *      글자로 설명되지 않는 것을 말하는 문장은 대개 그림을 말한다
 */
export async function locateOnPage(
  page: Page,
  find: string,
  /**
   * 글자로도 이름으로도 못 찾았을 때 "가장 큰 그림"으로 떨어질지.
   *
   * **화면들을 훑는 동안은 반드시 false다.** 켜 두면 글자를 못 찾아도 큰 그림이
   * 있는 첫 화면에서 "찾았다"가 되어 탐색이 거기서 멈춘다 — 실제로 그 때문에
   * `/o`의 제목("이름만 보고")을 찾으러 갔는데 홈의 엉뚱한 요소에 테두리가
   * 그려졌다 (Jessi: "이건 뭘 보여주고 싶었던 거지?"). 그림 폴백은 모든 화면에서
   * 글자·이름을 찾는 데 실패한 **뒤에만** 쓴다.
   */
  allowGraphic = false,
): Promise<{ kind: "text" | "name" | "graphic" } | null> {
  const text = page
    .getByText(find, { exact: false })
    .filter({ visible: true })
    .first();
  if (
    await text
      .count()
      .then((n) => n > 0)
      .catch(() => false)
  ) {
    if (await text.isVisible().catch(() => false)) return { kind: "text" };
  }
  const esc = find.replace(/"/g, '\\"');
  const named = page
    .locator(`[aria-label*="${esc}"], [alt*="${esc}"], [title*="${esc}"]`)
    .filter({ visible: true })
    .first();
  if (
    await named
      .count()
      .then((n) => n > 0)
      .catch(() => false)
  ) {
    if (await named.isVisible().catch(() => false)) return { kind: "name" };
  }
  if (!allowGraphic) return null;
  const big = await page
    .evaluate(() => {
      let best: { area: number } | null = null;
      for (const el of document.querySelectorAll("svg, img, canvas, picture")) {
        const r = el.getBoundingClientRect();
        const area = r.width * r.height;
        if (r.width < 120 || r.height < 120) continue;
        if (!best || area > best.area) best = { area };
      }
      return best !== null;
    })
    .catch(() => false);
  return big ? { kind: "graphic" } : null;
}

/** 그 화면에서 대본이 말한 것을 화면 가운데로 올리고 표시를 얹는다 */
export async function focusOn(
  page: Page,
  find: string,
  kind: string,
): Promise<number | undefined> {
  const esc = find.replace(/"/g, '\\"');
  const target =
    kind === "text"
      ? page.getByText(find, { exact: false }).filter({ visible: true }).first()
      : kind === "name"
        ? page
            .locator(
              `[aria-label*="${esc}"], [alt*="${esc}"], [title*="${esc}"]`,
            )
            .filter({ visible: true })
            .first()
        : page.locator("svg, img, canvas, picture").first();
  if (kind === "graphic") {
    // 가장 큰 그림을 브라우저 쪽에서 직접 고른다 (locator로는 크기를 못 고른다)
    await page.evaluate(() => {
      let best: Element | null = null;
      let area = 0;
      for (const el of document.querySelectorAll("svg, img, canvas, picture")) {
        const r = el.getBoundingClientRect();
        if (r.width < 120 || r.height < 120) continue;
        if (r.width * r.height > area) {
          area = r.width * r.height;
          best = el;
        }
      }
      best?.scrollIntoView({ block: "center", behavior: "instant" });
      if (best) {
        const box = best.getBoundingClientRect();
        const ring = document.createElement("div");
        ring.dataset.vlRing = "1";
        Object.assign(ring.style, {
          position: "fixed",
          left: `${Math.max(4, box.left - 8)}px`,
          top: `${Math.max(4, box.top - 6)}px`,
          width: `${Math.min(window.innerWidth - 8, box.width + 16)}px`,
          height: `${box.height + 12}px`,
          border: "3px solid #5EE1C3",
          borderRadius: "8px",
          boxShadow: "0 0 0 9999px rgba(6,10,16,.34)",
          pointerEvents: "none",
          zIndex: "2147483647",
        });
        document.body.appendChild(ring);
      }
    });
    return page
      .evaluate(() => {
        const r = document
          .querySelector("[data-vl-ring]")
          ?.getBoundingClientRect();
        return r ? (r.top + r.bottom) / 2 / window.innerHeight : undefined;
      })
      .catch(() => undefined);
  }
  await target.scrollIntoViewIfNeeded({ timeout: 4000 });
  await target.evaluate((el) => {
    // 화면 가운데에 둔다. 렌더가 이 지점을 크롭의 가운데로 잡으므로(focusY),
    // 여기서 위아래로 밀 필요가 없다 — 밀면 크롭 경계에 걸려 잘린다
    el.scrollIntoView({ block: "center", behavior: "instant" });
    const box = el.getBoundingClientRect();
    const ring = document.createElement("div");
    ring.dataset.vlRing = "1";
    Object.assign(ring.style, {
      position: "fixed",
      left: `${Math.max(4, box.left - 8)}px`,
      top: `${Math.max(4, box.top - 6)}px`,
      width: `${Math.min(window.innerWidth - 8, box.width + 16)}px`,
      height: `${box.height + 12}px`,
      border: "3px solid #5EE1C3",
      borderRadius: "8px",
      boxShadow: "0 0 0 9999px rgba(6,10,16,.34)",
      pointerEvents: "none",
      zIndex: "2147483647",
    });
    document.body.appendChild(ring);
  });
  return page
    .evaluate(() => {
      const r = document
        .querySelector("[data-vl-ring]")
        ?.getBoundingClientRect();
      return r ? (r.top + r.bottom) / 2 / window.innerHeight : undefined;
    })
    .catch(() => undefined);
}

/** 사이트의 화면 후보 — 내부 링크를 훑는다 (대본이 말한 것을 여기서 찾는다) */
async function siteLinks(page: Page): Promise<string[]> {
  return (
    await page
      .locator("a[href^='/']")
      .evaluateAll((as) =>
        [
          ...new Set(
            as
              .map((a) => a.getAttribute("href"))
              .filter((h): h is string => !!h)
              .map((h) => h.replace(/[?#].*$/, "").replace(/\/$/, "") || "/"),
          ),
        ].filter((h) => !h.includes(".")),
      )
      .catch(() => [] as string[])
  ).slice(0, 6);
}

/** 투어가 방문할 내부 링크 (defaultTour와 같은 규칙) */
async function tourLinks(page: Page): Promise<string[]> {
  return (
    await page
      .locator("a[href^='/']")
      .evaluateAll((as) =>
        [...new Set(as.map((a) => a.getAttribute("href")))].filter(
          (h): h is string => !!h && h !== "/",
        ),
      )
  ).slice(0, 2);
}

async function defaultTour(
  page: Page,
  shotsDir: string,
  lang: "ko" | "en",
): Promise<void> {
  let n = 0;
  await page.waitForTimeout(1200);
  n = await shot(page, shotsDir, n);
  await slowScroll(page, 900);
  await page.waitForTimeout(600);
  n = await shot(page, shotsDir, n);

  // 상위 내부 링크 1~2개 방문 — 링크를 "클릭"해서 클라이언트 네비게이션으로
  // 이동한다. page.goto(풀 리로드)는 페이지마다 SSR 한국어가 다시 그려져
  // en 녹화 중간에 한국어가 번쩍인다 (Jessi 지적). 클릭이면 React 상태가
  // 유지되어 언어가 흔들리지 않는다.
  const links = await page
    .locator("a[href^='/']")
    .evaluateAll((as) =>
      [...new Set(as.map((a) => a.getAttribute("href")))].filter(
        (h): h is string => !!h && h !== "/",
      ),
    );
  for (const href of links.slice(0, 2)) {
    try {
      await page.locator(`a[href="${href}"]`).first().click({ timeout: 3000 });
    } catch {
      // 클릭 실패(화면 밖·가림)만 풀 리로드로 폴백 — 이때는 전환을 기다린다
      await page.goto(new URL(href, page.url()).toString(), {
        waitUntil: "domcontentloaded",
      });
      await waitForLang(page, lang);
    }
    await page.waitForTimeout(1000);
    n = await shot(page, shotsDir, n);
    await slowScroll(page, 700);
    await page.waitForTimeout(500);
  }
}

async function runSteps(
  page: Page,
  steps: string[],
  baseUrl: string,
  shotsDir: string,
  lang: "ko" | "en",
): Promise<void> {
  let n = 0;
  for (const step of steps) {
    const [cmd, ...rest] = step.split(" ");
    const arg = rest.join(" ");
    try {
      if (cmd === "goto") {
        await page.goto(new URL(arg, baseUrl).toString(), {
          waitUntil: "domcontentloaded",
        });
        // 풀 리로드는 SSR ko부터 다시 그린다 — 전환이 끝난 뒤 진행
        await waitForLang(page, lang);
        n = await shot(page, shotsDir, n);
      } else if (cmd === "scroll") {
        await slowScroll(page, Number(arg) || 600);
      } else if (cmd === "click") {
        await page.locator(arg).first().click();
        await page.waitForTimeout(1200);
        n = await shot(page, shotsDir, n);
      } else if (cmd === "wait") {
        await page.waitForTimeout(Number(arg) || 500);
      }
    } catch (err) {
      // 한 스텝 실패가 녹화 전체를 죽이지 않게
      console.warn(`스텝 실패("${step}"):`, err);
    }
  }
}

export async function record(
  repo: string,
  date: string,
  durationSec = 20,
  lang: "ko" | "en" = "ko",
): Promise<string> {
  const script: ShortsScript = JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), shortsJsonPath(repo, date)),
      "utf8",
    ),
  );
  if (!script.demo.url) {
    throw new Error(
      `demo.url이 없습니다 — 레포 homepage를 채워주세요 (${repo})`,
    );
  }
  // 녹화 대상 사이트가 바뀔 수 있다(한 실행이 여러 레포를 돈다) — 판정 리셋
  langSignalAbsent = false;

  const outDir = path.join(process.cwd(), shortsDir(repo));
  const shotsDir = path.join(outDir, `${date}.shots`);
  fs.mkdirSync(shotsDir, { recursive: true });
  // en 데모는 사이트를 영어 모드로 켜고 따로 찍는다 — 영어 영상에 한국어
  // 화면이 나오지 않게 (Jessi 지시). ko는 기존 파일명 유지.
  const webm = path.join(
    outDir,
    lang === "ko" ? `${date}.webm` : `${date}.en.webm`,
  );

  // 설치된 브라우저 빌드가 playwright 기대 버전과 다른 환경(샌드박스 등)용 오버라이드
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    isMobile: true,
    hasTouch: true,
    ignoreHTTPSErrors: process.env.RECORD_IGNORE_HTTPS === "1", // TLS 인터셉트 환경(샌드박스)용

    // 주의: recordVideo 크기가 뷰포트보다 크면 Playwright는 확대하지 않고
    // 좌상단 배치 + 회색 패딩을 넣는다. 반드시 뷰포트와 동일하게.
    recordVideo: { dir: shotsDir, size: VIEWPORT },
  });
  if (process.env.RECORD_IGNORE_HTTPS === "1") {
    // 브라우저의 외부 호스트 접근이 막힌 환경에서는 폰트 CDN 요청이 타임아웃까지
    // 매달려 페이지 로드를 지연시킨다. 소재 녹화에는 폴백 폰트로 충분.
    await context.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  }
  if (lang === "en") {
    // 사이트의 전역 언어 설정(components/lang.tsx)과 같은 키
    await context.addInitScript(() => {
      try {
        localStorage.setItem("vibelog-lang", "en");
      } catch {}
    });
  }
  // 워밍업: 서버 콜드스타트·캐시를 미리 데워 녹화 초반의 흰 화면을 줄인다
  const warm = await browser.newContext({
    viewport: VIEWPORT,
    ignoreHTTPSErrors: process.env.RECORD_IGNORE_HTTPS === "1",
  });
  const warmPage = await warm.newPage();
  await warmPage
    .goto(script.demo.url, { waitUntil: "domcontentloaded" })
    .catch(() => {});
  await warm.close();

  const page = await context.newPage();

  // networkidle은 서드파티 요청(폰트 등)이 하나만 막혀도 수십 초를 기다린다.
  // load + 짧은 안정화 대기가 소재 녹화에는 충분하다.
  const started = Date.now();
  await page.goto(script.demo.url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);

  // 프리워밍: 투어가 방문할 페이지를 미리 한 바퀴 돌아 이미지·라우트 캐시를
  // 데운다 — 쇼츠 페이지 썸네일(원격 Blob 이미지)이 투어 중 카메라 앞에서
  // 뒤늦게 하나씩 뜨는 번쩍임 방지 (Jessi 지적). readyAt 이전 구간이라
  // 최종 영상에서는 통째로 잘려 나간다.
  // 대본이 문장마다 지정한 화면 목록 (내레이션 등장 순서, 중복 제거) —
  // 있으면 투어가 이 순서대로 돌고 구간 시각을 남긴다 (내용↔화면 매칭)
  // 대본이 문장마다 지정한 **정류장**(화면 + 가리킬 글자), 내레이션 순서대로.
  // 화면만 모으면 "같은 페이지의 다른 곳"을 구분할 수 없어, 격자 이야기에
  // 엉뚱한 스크롤 위치가 붙었다 (Jessi 지적)
  // 정류장 = 대본이 말한 것(find) + 화면 힌트(screen, 없을 수 있다).
  // find가 주다 — 어느 화면에 있는지는 아래 투어가 찾아낸다.
  const stops: { path?: string; find?: string }[] = [];
  for (const l of script.lines) {
    const find = (lang === "en" ? l.findEn || l.find : l.find) || undefined;
    if (!l.screen && !find) continue;
    const key = `${l.screen ?? ""}\u0000${find ?? ""}`;
    if (!stops.some((st) => `${st.path ?? ""}\u0000${st.find ?? ""}` === key)) {
      stops.push({
        ...(l.screen ? { path: l.screen } : {}),
        ...(find ? { find } : {}),
      });
    }
  }
  // **정류장이 한 화면뿐이면 다른 화면을 하나 더 녹화한다.** 렌더가 duo(두 폰)
  // 샷을 쓸 때 재료가 하나뿐이면 똑같은 화면이 두 번 겹쳐 나온다 (Jessi 지적).
  const hintPaths = new Set(stops.map((st) => st.path).filter(Boolean));
  if (hintPaths.size <= 1) {
    const only = [...hintPaths][0];
    if (only && only !== "/") {
      stops.push({ path: "/" });
    } else {
      const extra = (await tourLinks(page)).find((h) => h !== "/");
      if (extra) stops.push({ path: extra });
    }
  }
  const screenList = [
    ...new Set(stops.map((st) => st.path).filter((p): p is string => !!p)),
  ];
  const prewarmTargets = script.demo.steps.length
    ? script.demo.steps
        .filter((s) => s.startsWith("goto "))
        .map((s) => s.slice(5))
    : screenList.length
      ? screenList
      : await tourLinks(page);
  for (const href of prewarmTargets.slice(0, 3)) {
    try {
      await page.goto(new URL(href, script.demo.url).toString(), {
        waitUntil: "domcontentloaded",
      });
      // 이미지가 다 내려올 때까지 (썸네일 캐시가 목적이므로)
      await page.waitForFunction(
        () => [...document.images].every((i) => i.complete),
        undefined,
        { timeout: 6000 },
      );
    } catch {
      // 프리워밍 실패는 치명적이지 않다 — 그 페이지만 덜 데워질 뿐
    }
  }
  await page.goto(script.demo.url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  // en이면 언어 전환(SSR ko → 저장값 en)이 끝날 때까지 기다린 뒤에야
  // "준비됨"이다 — 안 기다리면 한국어 화면이 readyAt 뒤에 남는다 (Jessi 지적)
  await waitForLang(page, lang);
  await page.waitForTimeout(300);
  // 녹화 시작~페이지 준비까지의 구간은 로딩 화면이다. Remotion이 이 지점부터
  // 재생하도록 메타로 남긴다 (프레임 단위 합성이라 여기서 정확히 잘린다).
  const readyAt = (Date.now() - started) / 1000;
  fs.writeFileSync(
    `${webm}.meta.json`,
    JSON.stringify({ readyAt: Number(readyAt.toFixed(2)) }) + "\n",
  );
  const ready = Date.now();
  if (script.demo.steps.length > 0) {
    // vibelog.json의 명시 스텝이 언제나 우선
    await runSteps(page, script.demo.steps, script.demo.url, shotsDir, lang);
  } else if (stops.length > 0) {
    // 대본 지정 정류장 투어 — 구간 시각을 남겨 렌더가 문장과 매칭한다
    const perMs = Math.max(
      6000,
      Math.floor((durationSec * 1000) / stops.length),
    );
    const segs: DemoSegment[] = [];
    const candidates = [
      "/",
      ...(await siteLinks(page)).filter((h) => h !== "/"),
    ];
    let n = 0;
    let at = ""; // 지금 열려 있는 경로
    const go = async (p: string): Promise<boolean> => {
      if (p === at) return true;
      try {
        await page.goto(new URL(p, script.demo.url).toString(), {
          waitUntil: "domcontentloaded",
        });
        await waitForLang(page, lang);
        await page.waitForTimeout(400);
        at = p;
        return true;
      } catch {
        return false;
      }
    };

    for (const stop of stops) {
      // 앞 정류장의 표시를 지운다 (같은 페이지에 머무는 경우도 있다)
      await page
        .evaluate(() =>
          document
            .querySelectorAll("[data-vl-ring]")
            .forEach((el) => el.remove()),
        )
        .catch(() => {});

      // **대본이 말한 것을 사이트에서 찾는다.** screen은 힌트로 먼저 보고,
      // 없으면 화면들을 돌며 찾는다. 찾은 화면이 이 정류장의 화면이 된다.
      let path = stop.path ?? "/";
      let kind: string | null = null;
      if (stop.find) {
        const order = [
          ...(stop.path ? [stop.path] : []),
          ...candidates.filter((c) => c !== stop.path),
        ];
        // 1차: 화면들을 돌며 **글자·이름으로만** 찾는다
        for (const cand of order) {
          if (!(await go(cand))) continue;
          const hit = await locateOnPage(page, stop.find);
          if (hit) {
            path = cand;
            kind = hit.kind;
            break;
          }
        }
        // 2차: 어디에도 글자가 없다 — 그때만 힌트 화면(또는 홈)의 가장 큰
        // 그림으로 떨어진다. 글자 없는 도장·그래프를 말하는 문장이 이 경우다.
        if (!kind) {
          const fallback = stop.path ?? "/";
          if (await go(fallback)) {
            const hit = await locateOnPage(page, stop.find, true);
            if (hit) {
              path = fallback;
              kind = hit.kind;
            }
          }
        }
      } else {
        await go(path);
      }

      let focusY: number | undefined;
      if (kind && stop.find) {
        focusY = await focusOn(page, stop.find, kind).catch(() => {
          kind = null;
          return undefined;
        });
        await page.waitForTimeout(300);
      } else {
        await page.evaluate(() => window.scrollTo({ top: 0 }));
        await page.waitForTimeout(200);
      }
      console.log(
        `[record] 정류장 ${path}${stop.find ? ` [${stop.find}] ${kind ?? "못 찾음"}` : ""}`,
      );

      // 구간 시작은 스크린샷을 찍은 "뒤"다 (캡처 동안 화면이 정지한다)
      n = await shot(page, shotsDir, n);
      const start = (Date.now() - started) / 1000 - readyAt;
      const until = Date.now() + perMs;
      if (kind) {
        // 가리킨 것을 붙잡고 **완전히 멈춘다.** 계속 스크롤하면 문장이 말하는
        // 동안 화면이 그 요소를 지나쳐 흘러간다 (Jessi: "휙 넘겨버려").
        // 프레임이 죽어 보이지 않게 6px씩 흔들어 봤는데 그게 "주춤주춤
        // 스크롤하는 애매한 부분"으로 읽혔다 (Jessi) — 움직임은 렌더가 주는
        // 느린 줌으로 충분하다. 여기서는 아무것도 하지 않는다.
        while (Date.now() < until) await page.waitForTimeout(500);
      } else {
        while (Date.now() < until) {
          await slowScroll(page, 240);
          await page.waitForTimeout(400);
        }
      }
      segs.push({
        path,
        ...(stop.find ? { find: stop.find } : {}),
        ...(focusY != null ? { focusY: Number(focusY.toFixed(3)) } : {}),
        start: Number(start.toFixed(2)),
        end: Number(((Date.now() - started) / 1000 - readyAt).toFixed(2)),
      });
    }
    fs.writeFileSync(
      path.join(process.cwd(), segmentsJsonPath(repo, date, lang)),
      JSON.stringify({ screens: segs }, null, 2) + "\n",
    );
    console.log(
      `[record] 화면 투어: ${segs
        .map(
          (s) =>
            `${s.path}${s.find ? `[${s.find}]` : ""}(${s.start}~${s.end}s)`,
        )
        .join(" → ")}`,
    );
  } else {
    await defaultTour(page, shotsDir, lang);
  }
  // 데모 구간 길이는 준비 시점(readyAt) 이후 기준으로 채운다
  const remain = durationSec * 1000 - (Date.now() - ready);
  if (remain > 0) await page.waitForTimeout(remain);

  const video = page.video();
  await context.close(); // 여기서 webm이 파일로 저장된다
  await browser.close();
  if (!video) throw new Error("녹화 파일이 만들어지지 않았습니다");
  const saved = await video.path();
  fs.renameSync(saved, webm);
  console.log(`녹화 완료: ${webm} (${durationSec}s), 스크린샷 ${shotsDir}/`);
  return webm;
}

if (process.argv[1]?.endsWith("record.ts")) {
  const [repo, date, dur, langArg] = process.argv.slice(2);
  if (!repo || !date) {
    console.error(
      "사용: npx tsx scripts/record.ts <repo> <date> [durationSec] [ko|en]",
    );
    process.exit(1);
  }
  record(
    repo,
    date,
    dur ? Number(dur) : undefined,
    langArg === "en" ? "en" : "ko",
  ).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
