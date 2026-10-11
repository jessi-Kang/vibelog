/**
 * art.ts — 대본의 art 필드(장면 은유 묘사)를 이미지 생성 API로 일러스트로 만든다.
 *
 * 텍스트+실제 화면 녹화 위에 얹는 "+알파" 그래픽이다. 데모 화면은 여전히
 * 실제 배포 사이트 녹화만 쓴다.
 *
 * Gemini와 OpenAI를 둘 다 쓴다 (10/11 Jessi). 먼저 부르는 쪽은 ART_PROVIDER
 * (gemini | openai, 기본 gemini)로 고르고, 그쪽이 실패하면 다른 쪽으로 넘어간다.
 * 각 회사 안에서는 최신 모델부터 부르고, 모델을 못 찾으면(404) 다음 모델로 간다.
 * 모델 이름은 2026-10-11 공식 문서 기준이다 — 바뀌면 아래 목록만 고친다.
 *
 * 출력: content/shorts/<repo>/<date>.art/<scene>.jpg (Gemini) 또는 .png (OpenAI)
 * 필요 환경변수: GEMINI_API_KEY, OPENAI_API_KEY (비밀값, 둘 다 없으면 통째로 건너뜀)
 *
 * 사용: npx tsx scripts/art.ts <repo> <date>
 *       npx tsx scripts/art.ts --try "<묘사>" [gemini|openai]   # 한 장만 만들어 보기
 */
import fs from "node:fs";
import path from "node:path";
import { shortsDir, shortsJsonPath, type ShortsScript } from "./shorts-types";
import { noteUsage } from "./usage";

/** Gemini — Interactions API. Nano Banana 2.1 → Nano Banana 2 */
const GEMINI_MODELS = ["gemini-nano-banana-2.1", "gemini-3.1-flash-image"];
/** OpenAI — Image API. Flare(빠른 생성용) → Sunburst(편집 정밀도용, 같은 세대) */
const OPENAI_MODELS = ["gpt-image-2.5-flare", "gpt-image-2.5-sunburst"];

type Provider = "gemini" | "openai";

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

class ModelNotFound extends Error {}

type Image = { data: Buffer; ext: "png" | "jpg" };

async function geminiOnce(model: string, prompt: string): Promise<Image> {
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY as string,
    },
    body: JSON.stringify({
      model,
      input: prompt,
      // Nano Banana 2.1은 JPEG만 낸다 — PNG를 달라고 하면 400 (10/11 art-try에서 확인)
      response_format: { type: "image", mime_type: "image/jpeg", aspect_ratio: "1:1", image_size: "1K" },
    }),
  });
  if (res.status === 404) throw new ModelNotFound(`Gemini ${model} 없음`);
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as {
    steps?: { type?: string; content?: { type?: string; data?: string }[] }[];
    usage?: { total_input_tokens?: number; total_output_tokens?: number };
  };
  if (json.usage) {
    noteUsage("art", {
      input_tokens: json.usage.total_input_tokens ?? 0,
      output_tokens: json.usage.total_output_tokens ?? 0,
    });
  }
  // 마지막 이미지 블록을 쓴다 (공식 SDK의 output_image와 같은 기준)
  const images = (json.steps ?? [])
    .flatMap((st) => st.content ?? [])
    .filter((c) => c.type === "image" && c.data);
  const b64 = images.at(-1)?.data;
  if (!b64) throw new Error("Gemini 응답에 이미지가 없습니다");
  return { data: Buffer.from(b64, "base64"), ext: "jpg" };
}

async function openaiOnce(model: string, prompt: string): Promise<Image> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model, prompt, size: "1024x1024", output_format: "png", n: 1 }),
  });
  if (res.status === 404) throw new ModelNotFound(`OpenAI ${model} 없음`);
  const text = await res.text();
  // 없는 모델은 400 model_not_found로 오기도 한다
  if (!res.ok && /model_not_found|does not exist/.test(text)) throw new ModelNotFound(`OpenAI ${model} 없음`);
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${text.slice(0, 300)}`);
  const json = JSON.parse(text) as {
    data?: { b64_json?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  if (json.usage) {
    noteUsage("art", { input_tokens: json.usage.input_tokens ?? 0, output_tokens: json.usage.output_tokens ?? 0 });
  }
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI 응답에 이미지가 없습니다");
  return { data: Buffer.from(b64, "base64"), ext: "png" };
}

/** 한 회사 안에서 최신 모델부터 — 모델을 못 찾을 때만 다음 모델로 */
async function fromProvider(provider: Provider, prompt: string): Promise<Image & { model: string }> {
  const [models, once] = provider === "gemini" ? [GEMINI_MODELS, geminiOnce] : [OPENAI_MODELS, openaiOnce];
  let last: unknown;
  for (const model of models) {
    try {
      return { ...(await once(model, prompt)), model };
    } catch (err) {
      last = err;
      if (!(err instanceof ModelNotFound)) throw err;
      console.warn(`[art] ${err.message} — 다음 모델로`);
    }
  }
  throw last;
}

/** 키가 있는 회사들을 정한 순서로. 한쪽이 어떤 이유로든 실패하면 다른 쪽으로 넘어간다 */
export function providerOrder(): Provider[] {
  const first: Provider = process.env.ART_PROVIDER === "openai" ? "openai" : "gemini";
  const order: Provider[] = first === "gemini" ? ["gemini", "openai"] : ["openai", "gemini"];
  return order.filter((p) => (p === "gemini" ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY));
}

export async function generateImage(
  prompt: string,
  order: Provider[] = providerOrder(),
): Promise<Image & { provider: Provider; model: string }> {
  if (order.length === 0) throw new Error("GEMINI_API_KEY·OPENAI_API_KEY가 둘 다 없습니다");
  let last: unknown;
  for (const provider of order) {
    try {
      const r = await fromProvider(provider, prompt);
      return { ...r, provider };
    } catch (err) {
      last = err;
      console.warn(`[art] ${provider} 실패 — 다른 쪽으로:`, err instanceof Error ? err.message : err);
    }
  }
  throw last;
}

/** 대본의 art 프롬프트들을 이미지로. 실패는 장면 단위로 건너뛴다(치명적 아님) */
export async function generateArt(repo: string, date: string): Promise<void> {
  if (providerOrder().length === 0) {
    console.log("[art] 이미지 API 키 없음 — 그래픽 없이 진행");
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
    try {
      const r = await generateImage(STYLE + (l.art as string));
      fs.writeFileSync(path.join(dir, `${l.scene}.${r.ext}`), r.data);
      console.log(`[art] ${l.scene}.${r.ext} 생성 (${r.provider} ${r.model})`);
    } catch (err) {
      console.warn(`[art] ${l.scene} 생성 실패 — 그 장면은 그래픽 없이:`, err);
    }
  }
}

if (process.argv[1]?.endsWith("art.ts") && process.argv[2] === "--try") {
  // 한 장만 만들어 본다 — 키·모델 이름이 맞는지 확인할 때
  const prompt = process.argv[3] ?? "a small lighthouse on a calm sea at night";
  const only = process.argv[4] as Provider | undefined;
  generateImage(STYLE + prompt, only ? [only] : undefined)
    .then((r) => {
      const out = path.join(process.cwd(), `art-try-${r.provider}.${r.ext}`);
      fs.writeFileSync(out, r.data);
      console.log(`${r.provider} ${r.model} → ${out}`);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
} else if (process.argv[1]?.endsWith("art.ts")) {
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
