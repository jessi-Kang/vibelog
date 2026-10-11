/**
 * art-samples.ts — 쇼츠 그림 스타일 시안. 스타일 × 장면 × 회사로 한 장씩 만든다.
 *
 * 예전 시안 3종(라인·플랫·듀오톤)이 반려된 뒤, 바이브로그에서만 나올 그림을 찾으려고
 * 세 방향을 다시 그려 본다 (10/11). 장면은 실제 지난 글 두 편의 은유다.
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

const SCENES: Record<string, string> = {
  // vibelog 10/7 "글이 나가기 전에 위험한 내용을 거르게 했습니다"
  safety:
    "Subject: a fine mesh sieve holding back a few sharp jagged shards, while small clean blank paper notes fall through it.",
  // lie-detective 10/10 "용의자의 답변 규칙을 서버로 옮겼습니다"
  server:
    "Subject: a small closed steel safe receiving a sealed blank envelope, next to an open empty cardboard box.",
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
          const r = await generateImage(COMMON + s + sc, [provider]);
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
