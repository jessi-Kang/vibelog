/**
 * art-samples.ts — 쇼츠 그림 시안. 테마 5종 × 장면 2개로 한 장씩 만든다.
 *
 * 스타일은 오려 붙인 종이 콜라주로 정했다 (10/11 Jessi, 2차 시안 B안). 이제 시안은 테마마다
 * 강조색·밝기가 맞게 나오는지 본다. 밤 실행과 같은 art.ts의 styleFor를 쓴다.
 * 그림은 쇼츠 테마 바탕 위에 얹으므로 투명 배경이고, 그래서 OpenAI만 쓴다.
 *
 * 출력: art-samples/collage-<테마>-<장면>.png — 커밋하지 않는다 (art-try 워크플로가 아티팩트로 올린다)
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

async function main(): Promise<void> {
  const dir = path.join(process.cwd(), "art-samples");
  fs.mkdirSync(dir, { recursive: true });
  const failed: string[] = [];
  let made = 0;
  // 밤 실행과 같은 스타일 문장(styleFor)으로 테마 5종을 다 그린다
  for (const theme of Object.keys(THEME_PAPER)) {
    for (const [scene, sc] of Object.entries(SCENES)) {
      const id = `collage-${theme}-${scene}`;
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
