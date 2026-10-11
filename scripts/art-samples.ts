/**
 * art-samples.ts — 쇼츠 그림 스타일 시안. 스타일 × 테마 × 장면으로 한 장씩 만든다.
 *
 * 1차 시안(잔디 칸 도트·실사·클레이, 10/11)에서 Jessi가 종이 커팅으로 방향을 정했다.
 * 그림은 쇼츠 테마 바탕 위에 얹으므로 투명 배경이고, 그래서 OpenAI만 쓴다.
 * 장면은 지난 쇼츠 대본에 대본 모델이 실제로 쓴 art 문장이다.
 * 여기서 고른 스타일이 art.ts의 STYLE이 된다.
 *
 * 출력: art-samples/<스타일>-<테마>-<장면>.png — 커밋하지 않는다 (art-try 워크플로가 아티팩트로 올린다)
 * 사용: npx tsx scripts/art-samples.ts
 */
import fs from "node:fs";
import path from "node:path";
import { generateImage } from "./art";

/** 쇼츠 화면 위에 얹으므로 바탕 없이 — 투명 배경은 OpenAI만 된다 */
const COMMON =
  "Isolated object on a fully transparent background: no backdrop, no floor, no frame, no vignette. " +
  "Absolutely no text, no letters, no numbers, no logos, no people, no hands. " +
  "One centered subject with generous empty space around it. Square composition. ";

/** … */
const STYLES: Record<string, string> = {
  // 여러 겹 종이를 오려 쌓아 깊이를 낸다
  layered:
    "Layered paper-cut art: the subject is built from several sheets of matte cardstock cut with clean, precise edges, " +
    "stacked in 3–5 layers; each layer casts a small soft shadow on the layer beneath, giving shallow depth. ",
  // 몇 장의 종이를 가위로 오려 평평하게 붙인 콜라주
  collage:
    "Flat paper cutout collage: the subject is made of a few hand-cut paper shapes with slightly irregular scissor edges " +
    "and visible paper fiber texture, glued flat, with only a faint shadow along the edges. ",
};

/** 쇼츠 테마 색으로 종이를 고른다 — 그림이 그 테마 바탕 위에 놓인다 (video/src/theme.ts) */
const THEMES: Record<string, string> = {
  // 어두운 바탕(#0A0E14) 위 — 밝은 종이가 떠야 읽힌다
  terminal:
    "Paper colors: off-white, light warm gray and slate gray papers, with exactly one mint green (#5EE1C3) paper piece on the focal part. ",
  // 밝은 바탕(#EFF1F4) 위
  paper:
    "Paper colors: white, light gray and charcoal papers, with exactly one deep green (#0F7B5F) paper piece on the focal part. ",
};

/** 대본 모델이 실제로 쓴 art 문장 그대로 — 밤 실행이 넘길 입력과 같아야 시안이 의미가 있다 */
const SCENES: Record<string, string> = {
  // apart 9/10 "실제 단지 자료는 사람이 검토한 뒤에만 문제로 올립니다."
  review: "a magnifying glass held over a single paper card pulled from a tall stack",
  // apart 9/11 "공개 순위표 전에, 점수를 서버에서 검사하게 만들 차례입니다."
  guard: "a small guard robot inspecting glowing score tokens on a conveyor belt",
  // vibelog 9/22 "그려 놓고 못 보여 준 그림은 없어야죠."
  painting: "a small framed painting hidden behind a folded paper flap, being lifted back into the light",
};

async function main(): Promise<void> {
  const dir = path.join(process.cwd(), "art-samples");
  fs.mkdirSync(dir, { recursive: true });
  const failed: string[] = [];
  let made = 0;
  for (const [style, s] of Object.entries(STYLES)) {
    for (const [theme, t] of Object.entries(THEMES)) {
      for (const [scene, sc] of Object.entries(SCENES)) {
        const id = `${style}-${theme}-${scene}`;
        try {
          const r = await generateImage(COMMON + s + t + "Subject: " + sc, ["openai"], { transparent: true });
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
