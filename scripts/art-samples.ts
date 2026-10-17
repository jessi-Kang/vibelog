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
 * 커밋을 말하는 장면에 쓸 고정 그림 (10/17). Tabler의 git-commit 아이콘은 세로선과 동그라미뿐이라
 * 크게 띄우면 오류 표시처럼 보였다. 글자·로고를 못 넣는 그림체라 git 로고 대신 "한 일을 적어 남긴다"를
 * 물건으로 그린다 — 커밋을 모르는 사람도 뜻을 짐작할 수 있어야 한다. 구슬(커밋 그래프를 본 사람만
 * 알아봤다)·카드 더미(블록처럼 보였다)·보관 상자(투표함으로도 읽혔다)·도장(기록보다 승인)을 거쳐
 * 연필이 놓인 메모로 정했다. 시안은 docs/shorts-commit-art.html
 */
const COMMIT_ART =
  "a small paper note with a few written lines and a pencil resting on it, one round check mark seal in the corner";

/** 커밋 그림 — 테마 5개. 고른 그림은 video/assets/commit/<테마>.png에 둔다 (렌더가 읽는다) */
async function commitSamples(dir: string): Promise<string[]> {
  const failed: string[] = [];
  for (const theme of Object.keys(THEME_PAPER)) {
    const id = `commit-${theme}`;
    try {
      const r = await generateImage(styleFor(theme) + COMMIT_ART, ["openai"], { transparent: true });
      fs.writeFileSync(path.join(dir, `${id}.${r.ext}`), r.data);
      console.log(`- ${id} (${r.model})`);
    } catch (err) {
      failed.push(id);
      console.warn(`- ${id} 실패:`, err instanceof Error ? err.message : err);
    }
  }
  return failed;
}

async function main(): Promise<void> {
  const dir = path.join(process.cwd(), "art-samples");
  fs.mkdirSync(dir, { recursive: true });
  const failed: string[] = [];
  let made = 0;
  if (process.env.ART_SET === "commit") {
    const bad = await commitSamples(dir);
    console.log(`실패 ${bad.length}장${bad.length ? ` — ${bad.join(", ")}` : ""}`);
    if (bad.length) process.exit(1);
    return;
  }
  // 밤 실행과 같은 스타일 문장(styleFor)으로 테마 5종을 다 그린다
  for (const theme of Object.keys(THEME_PAPER)) {
    for (const [scene, sc] of Object.entries(SCENES)) {
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
