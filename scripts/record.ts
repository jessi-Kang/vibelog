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
import { shortsDir, shortsJsonPath, type ShortsScript } from "./shorts-types";

const VIEWPORT = { width: 390, height: 844 };
const SCALE = 3;

async function shot(page: Page, dir: string, n: number): Promise<number> {
  await page.screenshot({ path: path.join(dir, `${String(n).padStart(2, "0")}.png`) });
  return n + 1;
}

async function slowScroll(page: Page, px: number): Promise<void> {
  const step = 8;
  for (let y = 0; y < px; y += step) {
    await page.mouse.wheel(0, step);
    await page.waitForTimeout(16);
  }
}

async function defaultTour(page: Page, shotsDir: string): Promise<void> {
  let n = 0;
  await page.waitForTimeout(1200);
  n = await shot(page, shotsDir, n);
  await slowScroll(page, 900);
  await page.waitForTimeout(600);
  n = await shot(page, shotsDir, n);

  // 상위 내부 링크 1~2개 방문
  const links = await page
    .locator("a[href^='/']")
    .evaluateAll((as) =>
      [...new Set(as.map((a) => a.getAttribute("href")))].filter(
        (h): h is string => !!h && h !== "/",
      ),
    );
  for (const href of links.slice(0, 2)) {
    await page.goto(new URL(href, page.url()).toString(), {
      waitUntil: "domcontentloaded",
    });
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
): Promise<string> {
  const script: ShortsScript = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), shortsJsonPath(repo, date)), "utf8"),
  );
  if (!script.demo.url) {
    throw new Error(`demo.url이 없습니다 — 레포 homepage를 채워주세요 (${repo})`);
  }

  const outDir = path.join(process.cwd(), shortsDir(repo));
  const shotsDir = path.join(outDir, `${date}.shots`);
  fs.mkdirSync(shotsDir, { recursive: true });
  const webm = path.join(outDir, `${date}.webm`);

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
  // 워밍업: 서버 콜드스타트·캐시를 미리 데워 녹화 초반의 흰 화면을 줄인다
  const warm = await browser.newContext({
    viewport: VIEWPORT,
    ignoreHTTPSErrors: process.env.RECORD_IGNORE_HTTPS === "1",
  });
  const warmPage = await warm.newPage();
  await warmPage.goto(script.demo.url, { waitUntil: "domcontentloaded" }).catch(() => {});
  await warm.close();

  const page = await context.newPage();

  // networkidle은 서드파티 요청(폰트 등)이 하나만 막혀도 수십 초를 기다린다.
  // load + 짧은 안정화 대기가 소재 녹화에는 충분하다.
  const started = Date.now();
  await page.goto(script.demo.url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  // 녹화 시작~페이지 준비까지의 구간은 로딩 화면이다. Remotion이 이 지점부터
  // 재생하도록 메타로 남긴다 (프레임 단위 합성이라 여기서 정확히 잘린다).
  const readyAt = (Date.now() - started) / 1000;
  fs.writeFileSync(
    path.join(outDir, `${date}.webm.meta.json`),
    JSON.stringify({ readyAt: Number(readyAt.toFixed(2)) }) + "\n",
  );
  const ready = Date.now();
  if (script.demo.steps.length > 0) {
    await runSteps(page, script.demo.steps, script.demo.url, shotsDir);
  } else {
    await defaultTour(page, shotsDir);
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
  const [repo, date, dur] = process.argv.slice(2);
  if (!repo || !date) {
    console.error("사용: npx tsx scripts/record.ts <repo> <date> [durationSec]");
    process.exit(1);
  }
  record(repo, date, dur ? Number(dur) : undefined).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
