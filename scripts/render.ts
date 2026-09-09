/**
 * render.ts — Remotion으로 무음 영상을 프레임 단위 결정론적으로 렌더하고
 * mux.ts로 오디오를 합쳐 최종 mp4를 만든다.
 *
 * 실시간 화면 녹화로 최종 영상을 만들지 않는 이유(스펙 문서): 헤드리스 크롬이
 * 버벅이면 영상이 늘어져 자막 싱크가 밀린다. Remotion은 가상 시간을 1/30초씩
 * 전진시키며 캡처하므로 싱크가 구조적으로 밀릴 수 없다.
 *
 * 사용: npx tsx scripts/render.ts <repo> <date> [ko|en|both]
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { mux } from "./mux";
import { musicPath, resolveMusic } from "./audio";
import {
  narrationPath,
  shortsDir,
  shortsJsonPath,
  timingJsonPath,
  type ShortsScript,
  type ShortsTiming,
} from "./shorts-types";

const VIDEO_DIR = path.join(process.cwd(), "video");
// video/src/theme.ts의 totalSeconds와 같은 식 — 영상 길이의 단일 진실
const NARRATION_DELAY = 0.5;
const END_TAIL = 3.0;

export async function renderShort(
  repo: string,
  date: string,
  lang: "ko" | "en",
): Promise<string> {
  const script: ShortsScript = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), shortsJsonPath(repo, date)), "utf8"),
  );
  const timing: ShortsTiming = JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), timingJsonPath(repo, date, lang)),
      "utf8",
    ),
  );
  const durationSec = NARRATION_DELAY + timing.duration + END_TAIL;

  // 데모 녹화를 Remotion의 public/으로 (staticFile 접근용)
  const webm = path.join(process.cwd(), shortsDir(repo), `${date}.webm`);
  const publicDir = path.join(VIDEO_DIR, "public");
  fs.mkdirSync(publicDir, { recursive: true });
  let videoFile: string | null = null;
  let videoStartSec = 0;
  if (fs.existsSync(webm)) {
    videoFile = "demo.webm";
    fs.copyFileSync(webm, path.join(publicDir, videoFile));
    try {
      videoStartSec = JSON.parse(
        fs.readFileSync(`${webm}.meta.json`, "utf8"),
      ).readyAt;
    } catch {
      // 메타가 없으면 처음부터 재생
    }
  } else {
    console.warn("데모 녹화(webm)가 없어 플레이스홀더로 렌더합니다");
  }

  // +알파 그래픽(art.ts 산출물)도 public/으로 — 장면별 {scene: 파일명}
  const artFiles: Record<string, string> = {};
  const artSrc = path.join(process.cwd(), shortsDir(repo), `${date}.art`);
  if (fs.existsSync(artSrc)) {
    for (const f of fs.readdirSync(artSrc).filter((f) => f.endsWith(".png"))) {
      const name = `art.${f}`;
      fs.copyFileSync(path.join(artSrc, f), path.join(publicDir, name));
      artFiles[f.replace(/\.png$/, "")] = name;
    }
  }

  const propsFile = path.join(publicDir, `props.${lang}.json`);
  fs.writeFileSync(
    propsFile,
    JSON.stringify({ script, timing, lang, videoFile, videoStartSec, artFiles }),
  );

  const silent = path.join(
    process.cwd(),
    shortsDir(repo),
    `${date}.${lang}.silent.mp4`,
  );
  const args = [
    "remotion", "render", "ShipIt", silent,
    `--props=${propsFile}`,
    "--muted",
  ];
  if (process.env.REMOTION_IGNORE_CERT === "1") {
    args.push("--ignore-certificate-errors");
  }
  execFileSync("npx", args, { cwd: VIDEO_DIR, stdio: "inherit" });

  const out = path.join(process.cwd(), shortsDir(repo), `${date}.${lang}.mp4`);
  mux(
    silent,
    path.join(process.cwd(), narrationPath(repo, date, lang)),
    // 템플릿 트랙이 없으면 audio.ts와 같은 규칙으로 다른 고정 트랙을 재사용
    resolveMusic(script) ?? musicPath(script.template),
    out,
    durationSec,
  );
  fs.rmSync(silent, { force: true });
  return out;
}

if (process.argv[1]?.endsWith("render.ts")) {
  const [repo, date, langArg] = process.argv.slice(2);
  if (!repo || !date) {
    console.error("사용: npx tsx scripts/render.ts <repo> <date> [ko|en|both]");
    process.exit(1);
  }
  const langs: ("ko" | "en")[] =
    langArg === "ko" ? ["ko"] : langArg === "en" ? ["en"] : ["ko", "en"];
  (async () => {
    for (const lang of langs) {
      console.log(`렌더: ${repo}/${date} (${lang})`);
      console.log(`완료: ${await renderShort(repo, date, lang)}`);
    }
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
