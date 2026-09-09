/**
 * art.ts — 대본의 art 필드(장면 은유 묘사)를 Gemini 이미지 API로 일러스트로 만든다.
 *
 * 텍스트+실제 화면 녹화 위에 얹는 "+알파" 그래픽이다. 데모 화면은 여전히
 * 실제 배포 사이트 녹화만 쓴다.
 *
 * 출력: content/shorts/<repo>/<date>.art/<scene>.png
 * 필요 환경변수: GEMINI_API_KEY (없으면 통째로 건너뜀 — 쇼츠는 그래픽 없이 렌더)
 *
 * 사용: npx tsx scripts/art.ts <repo> <date>
 */
import fs from "node:fs";
import path from "node:path";
import { shortsDir, shortsJsonPath, type ShortsScript } from "./shorts-types";

const MODEL = "gemini-2.5-flash-image";

/** 스타일 고정 — 쇼츠 팔레트(다크 + 민트 단일 강조), 글자 금지 */
const STYLE =
  "Flat minimal vector-style illustration. Very dark navy background (#0a0e14). " +
  "One single mint green accent color (#5EE1C3) plus soft desaturated grays. " +
  "Absolutely no text, no letters, no numbers, no logos. " +
  "One centered subject, generous negative space, clean geometric shapes, subtle glow. " +
  "Square composition. Subject: ";

export function artDir(repo: string, date: string): string {
  return path.join(process.cwd(), shortsDir(repo), `${date}.art`);
}

async function generateOne(prompt: string, outFile: string): Promise<void> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY as string,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: STYLE + prompt }] }],
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[];
  };
  const b64 = json.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData?.data,
  )?.inlineData?.data;
  if (!b64) throw new Error("Gemini 응답에 이미지가 없습니다");
  fs.writeFileSync(outFile, Buffer.from(b64, "base64"));
}

/** 대본의 art 프롬프트들을 이미지로. 실패는 장면 단위로 건너뛴다(치명적 아님) */
export async function generateArt(repo: string, date: string): Promise<void> {
  if (!process.env.GEMINI_API_KEY) {
    console.log("[art] GEMINI_API_KEY 없음 — 그래픽 없이 진행");
    return;
  }
  const script: ShortsScript = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), shortsJsonPath(repo, date)), "utf8"),
  );
  // 타이틀(훅)에는 그래픽을 넣지 않는다 (Jessi 지시) — next 장면 전용
  const targets = script.lines.filter((l) => l.art && l.scene === "next");
  if (targets.length === 0) {
    console.log("[art] 대본에 art 묘사가 없음 — 건너뜀");
    return;
  }
  const dir = artDir(repo, date);
  fs.mkdirSync(dir, { recursive: true });
  for (const l of targets) {
    const out = path.join(dir, `${l.scene}.png`);
    try {
      await generateOne(l.art as string, out);
      console.log(`[art] ${l.scene}.png 생성`);
    } catch (err) {
      console.warn(`[art] ${l.scene} 생성 실패 — 그 장면은 그래픽 없이:`, err);
    }
  }
}

if (process.argv[1]?.endsWith("art.ts")) {
  const [repo, date] = process.argv.slice(2);
  if (!repo || !date) {
    console.error("사용: npx tsx scripts/art.ts <repo> <date>");
    process.exit(1);
  }
  generateArt(repo, date).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
