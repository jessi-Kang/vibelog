/**
 * art-samples.ts — 쇼츠 그림 시안. 그림체 × 테마 × 장면으로 한 장씩 만든다.
 *
 * 유력 후보는 오려 붙인 종이 콜라주다 (10/11 Jessi, 2차 시안 B안 — 밤 실행은 art.ts의 styleFor).
 * 지금 시안은 비교할 다른 그림체를 그린다.
 * 그림은 쇼츠 테마 바탕 위에 얹으므로 투명 배경이고, 그래서 OpenAI만 쓴다.
 *
 * 출력: art-samples/<그림체>-<색>-<테마>-<장면>.png — 커밋하지 않는다 (art-try 워크플로가 아티팩트로 올린다)
 * 사용: npx tsx scripts/art-samples.ts
 */
import fs from "node:fs";
import path from "node:path";
import { generateImage, THEME_PAPER } from "./art";

/**
 * …
 * 회사 이름은 지시문에 넣지 않는다 — 넣으면 그 회사 마스코트를 그대로 그리기 쉽고, 남의 브랜드를
 * 흉내 낸 그림이 된다. 그림체의 특징만 말로 푼다.
 * 그 그림체는 원래 밝은 색을 여러 개 쓰므로, 테마 강조색 하나로 묶은 것(one)과 색을 풀어 준 것(bright)을 같이 본다.
 */
const FLAT_BASE =
  "Friendly flat vector illustration: chunky rounded geometric shapes, no outlines, " +
  "shading only as one flat darker shade of each color, soft rounded corners everywhere, playful slightly stubby proportions, " +
  "clean and simple like a modern learning app illustration. " +
  "Isolated object on a fully transparent background: no backdrop, no floor, no frame. " +
  "Absolutely no text, no letters, no numbers, no logos, no people, no hands, no animals, no mascots. " +
  "One centered subject with generous empty space around it. Square composition. ";

function flatStyle(theme: string, palette: "one" | "bright"): string {
  const t = THEME_PAPER[theme];
  const colors =
    palette === "one"
      ? `Colors: ${t.light ? "white, light gray and medium gray" : "off-white, light gray and slate gray"} shapes, with exactly one ${t.accent} colored part on the focal object; no other saturated colors. `
      : `Colors: bright, cheerful saturated palette (3–4 colors) that still looks good on a ${t.light ? "light gray" : "very dark"} background, with ${t.accent} as the main color of the focal object. `;
  return FLAT_BASE + colors + "Subject: ";
}

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
  for (const palette of ["one", "bright"] as const) {
    for (const theme of ["terminal", "paper"]) {
      for (const [scene, sc] of Object.entries(SCENES)) {
        const id = `flat-${palette}-${theme}-${scene}`;
        try {
          const r = await generateImage(flatStyle(theme, palette) + sc, ["openai"], { transparent: true });
          fs.writeFileSync(path.join(dir, `${id}.${r.ext}`), r.data);
          console.log(`- ${id} (${r.model})`);
          made += 1;
        } catch (err) {
          failed.push(id);
          console.warn(`- ${id} 실패:`, err instanceof Error ? err.message : err);
        }
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
