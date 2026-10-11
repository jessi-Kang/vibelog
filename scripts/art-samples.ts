/**
 * art-samples.ts — 쇼츠 그림 스타일 시안. 스타일 × 장면 × 회사로 한 장씩 만든다.
 *
 * 예전 시안 3종(라인·플랫·듀오톤)이 반려된 뒤, 바이브로그에서만 나올 그림을 찾으려고
 * 세 방향을 다시 그려 본다 (10/11). 장면은 지난 쇼츠 대본에 대본 모델이 실제로 쓴 art 문장이다.
 * 여기서 고른 스타일이 art.ts의 STYLE이 된다.
 *
 * 출력: art-samples/<스타일>-<장면>-<회사>.<jpg|png> — 커밋하지 않는다 (art-try 워크플로가 아티팩트로 올린다)
 * 사용: npx tsx scripts/art-samples.ts
 */
import fs from "node:fs";
import path from "node:path";
import { generateImage } from "./art";

const COMMON =
  "Very dark navy background (#0a0e14). One single mint green accent (#5EE1C3) used only on the focal part; " +
  "everything else in muted desaturated grays. Absolutely no text, no letters, no numbers, no logos, no people, no hands. " +
  "One centered subject, generous empty space. Square composition. ";

const STYLES: Record<string, string> = {
  // 홈 잔디(커밋 칸)와 같은 문법 — 작은 네모 칸만으로 그린다
  grid:
    "Mosaic made only of small rounded square cells on a strict grid, like a GitHub contribution heatmap: " +
    "every cell the same size, a thin dark gap between cells, about 40 cells across the image. " +
    "Cells in 3–4 shades of gray-blue; the subject is a clear, readable silhouette made of cells. ",
  // 진짜 물건을 찍은 사진 — 녹화 화면 사이에 끼어도 결이 튀지 않게
  photo:
    "Moody product photograph of real physical objects on a dark matte desk, 50mm lens, shallow depth of field, " +
    "soft mint green rim light from one side, otherwise neutral lighting. Minimal, calm still life. ",
  // 손으로 빚은 작은 모형
  clay:
    "Handmade matte clay miniature, soft rounded forms with subtle fingerprint texture, soft studio light. " +
    "Muted gray-blue clay; the mint accent is mint colored clay on the focal object. ",
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
    for (const [scene, sc] of Object.entries(SCENES)) {
      for (const provider of ["gemini", "openai"] as const) {
        const id = `${style}-${scene}-${provider}`;
        try {
          // 회사를 하나만 넘긴다 — 시안은 두 회사를 나란히 보려는 것이라 넘어가기를 하지 않는다
          const r = await generateImage(COMMON + s + "Subject: " + sc, [provider]);
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
