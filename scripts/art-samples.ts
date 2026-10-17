/**
 * art-samples.ts — 쇼츠 그림 시안. 그림체 × 테마 × 장면으로 한 장씩 만든다.
 *
 * 그림체는 둥근 평면 · 강조색 한 가지로 정했다 (10/11, 3차 시안). 지금 시안은 밤 실행과 같은
 * art.ts의 styleFor로 테마 5개를 다 그려, 테마마다 색·밝기가 맞는지 본다.
 * 그림은 쇼츠 테마 바탕 위에 얹으므로 투명 배경이고, 그래서 OpenAI만 쓴다.
 *
 * 출력: art-samples/flat-<테마>-<장면>.png — 커밋하지 않는다 (art-try 워크플로가 아티팩트로 올린다)
 * 사용: npx tsx scripts/art-samples.ts
 */
import fs from "node:fs";
import path from "node:path";
import { generateImage, styleFor, THEME_PAPER } from "./art";

/** 대본 모델이 실제로 쓴 art 문장 그대로 — 밤 실행이 넘길 입력과 같아야 시안이 의미가 있다 */
const SCENES: Record<string, string> = {
  // apart 9/10 "실제 단지 자료는 사람이 검토한 뒤에만 문제로 올립니다."
  review: "a magnifying glass held over a single paper card pulled from a tall stack",
  // apart 9/11 "공개 순위표 전에, 점수를 서버에서 검사하게 만들 차례입니다."
  guard: "a small guard robot inspecting glowing score tokens on a conveyor belt",
};

/**
 * 커밋을 말하는 장면에 쓸 고정 그림 후보 (10/17). Tabler의 git-commit 아이콘은 세로선과 동그라미뿐이라
 * 크게 띄우면 오류 표시처럼 보였다. 글자·로고를 못 넣는 그림체라 git 로고 대신 "한 일을 적어 남긴다"를
 * 물건으로 그린다. 커밋을 모르는 사람도 뜻을 짐작할 수 있어야 한다 — 첫 후보의 구슬은 커밋 그래프를
 * 본 사람만 알아봤다. 그림은 한 장마다 돈이 들어서 어두운 테마 하나·밝은 테마 하나로만 먼저 본다
 */
const COMMIT_SCENES: Record<string, string> = {
  note: "a small paper note with a few written lines and a pencil resting on it, one round check mark seal in the corner",
  pile: "a neat stack of paper note cards with one new card being placed on top of the stack",
  box: "a small archive box with one sheet of paper sliding down into it",
  stamp: "a small rubber stamp pressing a round seal onto a single sheet of paper",
};
const COMMIT_THEMES = ["terminal", "paper"];

/**
 * 밝은 테마(paper) 그림의 색 후보 (10/17). 지금 규칙(옅은 회색–중간 회색)으로 그리면 회색 바탕 위에
 * 회색 물건이 놓여 칙칙했다. 전에는 흰색이 바탕에 묻히고 짙은 색이 무거웠다 — 그래서 흰 면에는
 * 그림자 면을 꼭 붙여 모양을 세우고, 짙은 색은 여전히 쓰지 않는다. 그림 두 가지 × 색 세 가지
 */
const LIGHT_SCENES: Record<string, string> = {
  note: COMMIT_SCENES.note,
  review: SCENES.review,
};
const LIGHT_PALETTES: Record<string, string> = {
  // 지금 규칙 그대로 — 견줄 기준
  now: "",
  // 흰 면 + 옅은 회색 그림자 면
  white:
    "pure white (#FFFFFF) main surfaces, each with one soft cool gray shadow side (#DDE1E7), " +
    "small details in #B4BAC3; no medium or dark gray areas",
  // 흰 면 + 강조색을 아주 옅게 푼 그림자 면 — 한 색 계열 안에서 밝게
  tint:
    "pure white (#FFFFFF) main surfaces, shadow sides in a very pale tint of the accent color (#D6EDE6), " +
    "small details in a soft tint (#A8D5C7); no gray areas at all",
};

async function lightSamples(dir: string): Promise<string[]> {
  const failed: string[] = [];
  for (const [scene, sc] of Object.entries(LIGHT_SCENES)) {
    for (const [pal, neutrals] of Object.entries(LIGHT_PALETTES)) {
      const id = `light-${pal}-${scene}`;
      try {
        const style = styleFor("paper", "flat", neutrals ? { neutrals } : {});
        const r = await generateImage(style + sc, ["openai"], { transparent: true });
        fs.writeFileSync(path.join(dir, `${id}.${r.ext}`), r.data);
        console.log(`- ${id} (${r.model})`);
      } catch (err) {
        failed.push(id);
        console.warn(`- ${id} 실패:`, err instanceof Error ? err.message : err);
      }
    }
  }
  return failed;
}

async function main(): Promise<void> {
  const dir = path.join(process.cwd(), "art-samples");
  fs.mkdirSync(dir, { recursive: true });
  const failed: string[] = [];
  let made = 0;
  if (process.env.ART_SET === "light") {
    const bad = await lightSamples(dir);
    console.log(`실패 ${bad.length}장${bad.length ? ` — ${bad.join(", ")}` : ""}`);
    if (bad.length) process.exit(1);
    return;
  }
  const commit = process.env.ART_SET === "commit";
  const scenes = commit ? COMMIT_SCENES : SCENES;
  // 밤 실행과 같은 스타일 문장(styleFor)으로 테마 5종을 다 그린다
  for (const theme of commit ? COMMIT_THEMES : Object.keys(THEME_PAPER)) {
    for (const [scene, sc] of Object.entries(scenes)) {
      const id = `flat-${theme}-${scene}`;
      try {
        const r = await generateImage(styleFor(theme) + sc, ["openai"], { transparent: true });
        fs.writeFileSync(path.join(dir, `${id}.${r.ext}`), r.data);
        console.log(`- ${id} (${r.model})`);
        made += 1;
      } catch (err) {
        failed.push(id);
        console.warn(`- ${id} 실패:`, err instanceof Error ? err.message : err);
      }
    }
  }
  console.log(`만든 것 ${made}장, 실패 ${failed.length}장${failed.length ? ` — ${failed.join(", ")}` : ""}`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
