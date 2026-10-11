/**
 * art.ts — 대본의 art 필드(장면 은유 묘사)를 이미지 생성 API로 일러스트로 만든다.
 *
 * 텍스트+실제 화면 녹화 위에 얹는 "+알파" 그래픽이다. 데모 화면은 여전히
 * 실제 배포 사이트 녹화만 쓴다.
 *
 * Gemini와 OpenAI를 둘 다 쓴다 (10/11 Jessi). 먼저 부르는 쪽은 ART_PROVIDER
 * (openai | gemini, 기본 openai)로 고르고, 그쪽이 실패하면 다른 쪽으로 넘어간다.
 * 쇼츠 그림은 테마 바탕 위에 얹으므로 투명 배경이어야 하는데, 투명 배경은 OpenAI만
 * 된다 (Gemini 최신 모델은 JPEG만 낸다). 그래서 투명 배경을 달라고 하면 OpenAI만 부르고,
 * 실패하면 그 장면은 그림 없이 간다 — 남색 바탕이 박힌 그림이 밝은 테마에 얹히는 것보다 낫다.
 * 각 회사 안에서는 최신 모델부터 부르고, 모델을 못 찾으면(404) 다음 모델로 간다.
 * 모델 이름은 2026-10-11 공식 문서 기준이다 — 바뀌면 아래 목록만 고친다.
 *
 * 출력: content/shorts/<repo>/<date>.art/<scene>.jpg (Gemini) 또는 .png (OpenAI)
 * 필요 환경변수: GEMINI_API_KEY, OPENAI_API_KEY (비밀값, 둘 다 없으면 통째로 건너뜀)
 *
 * 사용: npx tsx scripts/art.ts <repo> <date>
 *       npx tsx scripts/art.ts --try "<묘사>" [gemini|openai]   # 한 장만 만들어 보기
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { shortsDir, shortsJsonPath, type ShortsScript } from "./shorts-types";
import { blobGet, blobPut } from "./blob-cache";
import { noteUsage } from "./usage";

/** Gemini — Interactions API. Nano Banana 2.1 → Nano Banana 2 */
const GEMINI_MODELS = ["gemini-nano-banana-2.1", "gemini-3.1-flash-image"];
/** OpenAI — Image API. Flare(빠른 생성용) → Sunburst(편집 정밀도용, 같은 세대) */
const OPENAI_MODELS = ["gpt-image-2.5-flare", "gpt-image-2.5-sunburst"];

type Provider = "gemini" | "openai";

/**
 * 그림 스타일 — 둥근 평면 그림, 강조색 한 가지, 투명 배경 (10/11 Jessi, 3차 시안 "한 색").
 * 종이 콜라주(2차 시안 B안)와 겨뤄 이쪽을 골랐다 — 형태가 단순해 쇼츠에서 작게 지나가도 읽힌다.
 * 회사 이름(듀오링고)은 지시문에 넣지 않는다 — 넣으면 그 마스코트를 그대로 그리기 쉽다.
 * 쇼츠 테마 바탕 위에 얹으므로 색은 그 레포의 테마를 따른다: 강조색 한 군데 + 무채색.
 */
const STYLE_BASE =
  "Friendly flat vector illustration: chunky rounded geometric shapes, no outlines, " +
  "shading only as one flat darker shade of each color, soft rounded corners everywhere, playful slightly stubby proportions, " +
  "clean and simple like a modern learning app illustration. " +
  "Isolated object on a fully transparent background: no backdrop, no floor, no frame, no vignette. " +
  "Absolutely no text, no letters, no numbers, no logos, no people, no hands, no animals, no mascots. " +
  "One centered subject with generous empty space around it. Square composition. ";

/**
 * 테마별 강조색·밝기 — video/src/theme.ts와 같은 값. theme.ts는 불러올 때 글꼴을 받아 와서
 * 노드 스크립트에서 가져오지 않고 여기 적는다. 테마를 더하거나 색을 바꾸면 같이 고친다.
 */
export const THEME_PAPER: Record<string, { accent: string; light: boolean }> = {
  terminal: { accent: "#5EE1C3", light: false },
  blueprint: { accent: "#7FB0FF", light: false },
  signal: { accent: "#FF6B35", light: false },
  paper: { accent: "#0F7B5F", light: true },
  highlighter: { accent: "#FFD84D", light: false },
};

/**
 * 보관해 둔 그림체 — 오려 붙인 종이 콜라주 (10/11 2차 시안 B안). 지금은 쓰지 않는다.
 * Jessi가 둥근 평면을 골랐지만 이것도 좋다고 해서 지시문을 남겨 둔다. 켜려면 ART_STYLE=papercut.
 * 시안 그림은 docs/art-styles.html.
 */
const PAPERCUT_BASE =
  "Flat paper cutout collage: the subject is made of a few hand-cut paper shapes with slightly irregular scissor edges " +
  "and visible paper fiber texture, glued flat, with only a faint shadow along the edges. " +
  "Isolated object on a fully transparent background: no backdrop, no floor, no frame, no vignette. " +
  "Absolutely no text, no letters, no numbers, no logos, no people, no hands. " +
  "One centered subject with generous empty space around it. Square composition. ";

export type ArtStyle = "flat" | "papercut";

export function styleFor(
  theme?: string | null,
  style: ArtStyle = process.env.ART_STYLE === "papercut" ? "papercut" : "flat",
  { wide = false }: { wide?: boolean } = {},
): string {
  const t = THEME_PAPER[theme ?? ""] ?? THEME_PAPER.terminal;
  // 밝은 테마는 양 끝을 다 뺀다 — 흰색·아주 옅은 회색은 밝은 바탕(#EFF1F4)에 묻혀 흐려 보였고,
  // 먹색은 혼자 무겁게 떴다 (10/11 Jessi 두 번). 짙은 슬레이트까지 내렸다가 두 번 더 "어둡다"를
  // 들었다 — 큰 면은 옅은 회색에서 중간 회색까지, 가장 짙은 색도 테마의 보조 글자색(#8A919B)까지.
  // 짙은 그림자 면을 따로 넣지 않는다 (Jessi). 색 후보는 그림을 만들기 전에 바탕 위에서 먼저 견준다
  const neutrals = t.light
    ? "light gray (#D3D7DD), soft gray (#BAC0C8) and medium gray (#A3AAB4), with #8A919B only for small details; " +
      "white only for tiny highlights, never large white areas, nothing darker than #8A919B"
    : "off-white, light gray and slate gray";
  // 블로그 글에 넣는 그림은 가로로 긴 판형이다 — 쇼츠처럼 가운데 물건 하나를 세로로 세우면
  // 글 칼럼에서 위아래로 길쭉해졌다 (10/11 Jessi: "…"). 글의 삽화(가로 390 × 세로 가운데값
  // 225, 약 16:9)와 같은 판에 같은 비율로 놓이므로 16:9로 그리고, 물건 두세 개를 옆으로 늘어놓는다
  const base = (style === "papercut" ? PAPERCUT_BASE : STYLE_BASE).replace(
    "One centered subject with generous empty space around it. Square composition. ",
    wide
      ? "A small scene of two or three related objects arranged side by side along a horizontal line, low and wide, " +
          "with generous empty space above and below. Very wide landscape composition (16:9), nothing tall or stacked high. "
      : "One centered subject with generous empty space around it. Square composition. ",
  );
  const what = style === "papercut" ? "papers" : "shapes";
  // 5개 테마 시안(10/11)에서 강조색이 아닌 색과 빛 번짐·반짝임 선이 끼어들었다
  return (
    `${base}Colors: ${neutrals} ${what}, with exactly one ${t.accent} colored part on the focal object. ` +
    "No other saturated colors anywhere. No glow, no light beams, no sparkle or motion lines. Subject: "
  );
}

export function artDir(repo: string, date: string): string {
  return path.join(process.cwd(), shortsDir(repo), `${date}.art`);
}

class ModelNotFound extends Error {}

type Image = { data: Buffer; ext: "png" | "jpg" };

async function geminiOnce(model: string, prompt: string, wide = false): Promise<Image> {
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
      response_format: { type: "image", mime_type: "image/jpeg", aspect_ratio: wide ? "16:9" : "1:1", image_size: "1K" },
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

async function openaiOnce(model: string, prompt: string, transparent = false, wide = false): Promise<Image> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      // OpenAI의 가장 넓은 판형이 3:2라 위아래를 비우게 그리고, 화면은 16:9 판에 맞춰 넣는다
      size: wide ? "1536x1024" : "1024x1024",
      output_format: "png",
      n: 1,
      ...(transparent ? { background: "transparent" } : {}),
    }),
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
async function fromProvider(
  provider: Provider,
  prompt: string,
  transparent: boolean,
  wide = false,
): Promise<Image & { model: string }> {
  const models = provider === "gemini" ? GEMINI_MODELS : OPENAI_MODELS;
  let last: unknown;
  for (const model of models) {
    try {
      const img = provider === "gemini" ? await geminiOnce(model, prompt, wide) : await openaiOnce(model, prompt, transparent, wide);
      return { ...img, model };
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
  const first: Provider = process.env.ART_PROVIDER === "gemini" ? "gemini" : "openai";
  const order: Provider[] = first === "gemini" ? ["gemini", "openai"] : ["openai", "gemini"];
  return order.filter((p) => (p === "gemini" ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY));
}

export async function generateImage(
  prompt: string,
  order: Provider[] = providerOrder(),
  { transparent = false, wide = false }: { transparent?: boolean; wide?: boolean } = {},
): Promise<Image & { provider: Provider; model: string }> {
  // 투명 배경은 OpenAI만 된다
  const usable = transparent ? order.filter((p) => p === "openai") : order;
  if (usable.length === 0) throw new Error(transparent ? "투명 배경은 OPENAI_API_KEY가 있어야 합니다" : "GEMINI_API_KEY·OPENAI_API_KEY가 둘 다 없습니다");
  let last: unknown;
  for (const provider of usable) {
    try {
      const r = await fromProvider(provider, prompt, transparent, wide);
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
  // 하나를 크게 보여 줄 문장마다 (10/11 — 예전엔 "다음 할 것"에만). 제 카드가 있는 장면과,
  // 화면·다이어그램을 고른 문장은 그쪽이 이기므로 만들지 않는다 (돈만 든다)
  const targets = script.lines
    .map((l, index) => ({ l, index }))
    .filter(
      ({ l }) =>
        l.art && !["hook", "end", "fail"].includes(l.scene) && !l.diagram && !l.screen && !l.find,
    );
  if (targets.length === 0) {
    console.log("[art] 대본에 art 묘사가 없음 — 건너뜀");
    return;
  }
  const dir = artDir(repo, date);
  fs.mkdirSync(dir, { recursive: true });
  const theme = script.theme ?? "terminal";
  const style: ArtStyle = process.env.ART_STYLE === "papercut" ? "papercut" : "flat";
  const index = await loadArtIndex();
  let added = false;
  for (const { l, index: lineIndex } of targets) {
    const name = `line-${lineIndex}`;
    const art = l.art as string;
    // 비슷한 그림을 이미 만들었으면 그것을 다시 쓴다 — 같은 테마·그림체에서 묘사의 낱말이 많이 겹치면
    const hit = findSimilarArt(index, theme, style, art);
    if (hit) {
      const data = await blobGet(`${ART_DIR}/${hit.entry.id}.${hit.entry.ext}`);
      if (data) {
        fs.writeFileSync(path.join(dir, `${name}.${hit.entry.ext}`), data);
        console.log(`[art] ${name}.${hit.entry.ext} 비슷한 그림을 다시 씀 (낱말 겹침 ${hit.score.toFixed(2)})`);
        continue;
      }
    }
    try {
      const r = await generateImage(styleFor(theme) + art, undefined, { transparent: true });
      fs.writeFileSync(path.join(dir, `${name}.${r.ext}`), r.data);
      console.log(`[art] ${name}.${r.ext} 생성 (${r.provider} ${r.model})`);
      const id = createHash("sha256").update(`${theme}|${style}|${art}`).digest("hex").slice(0, 16);
      await blobPut(`${ART_DIR}/${id}.${r.ext}`, r.data);
      index.push({ id, ext: r.ext, theme, style, art });
      added = true;
    } catch (err) {
      // 그 문장은 함께 고른 아이콘·모티프로 간다
      console.warn(`[art] ${name} 생성 실패 — 그 문장은 아이콘·모티프로:`, err instanceof Error ? err.message : err);
    }
  }
  if (added) await blobPut(ART_INDEX, JSON.stringify(index));
}

/**
 * 만든 그림 목록 — Blob에 그림과 함께 둔다. 쇼츠 그림은 한 장에 돈이 들고, 대본은 비슷한 장면을
 * 자주 쓴다(돋보기, 문 앞의 경비, 쌓인 서류…). 비슷하면 다시 쓰자고 했다 (10/11 Jessi).
 */
const ART_DIR = "shorts/art";
const ART_INDEX = `${ART_DIR}/index.json`;
type ArtEntry = { id: string; ext: string; theme: string; style: ArtStyle; art: string };

async function loadArtIndex(): Promise<ArtEntry[]> {
  const raw = await blobGet(ART_INDEX);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw.toString("utf8"));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** 뜻이 없는 낱말은 빼고 센다 — "a", "the", "on"이 겹친다고 비슷한 그림이 아니다 */
const STOP = new Set(
  "a an the of on in at to by for from with and or its their his her into onto over under beside next small single one two three side".split(" "),
);
export function artWords(art: string): Set<string> {
  return new Set(
    art
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .map((w) => w.replace(/(ies)$/, "y").replace(/([^s])s$/, "$1"))
      .filter((w) => w.length > 1 && !STOP.has(w)),
  );
}

/** 낱말 겹침(자카드) 이 값 이상이면 같은 그림으로 친다 */
const SIMILAR_AT = 0.6;

export function findSimilarArt(
  index: ArtEntry[],
  theme: string,
  style: ArtStyle,
  art: string,
): { entry: ArtEntry; score: number } | null {
  const a = artWords(art);
  let best: { entry: ArtEntry; score: number } | null = null;
  for (const e of index) {
    if (e.theme !== theme || e.style !== style) continue;
    const b = artWords(e.art);
    let both = 0;
    for (const w of a) if (b.has(w)) both++;
    const score = both / (a.size + b.size - both || 1);
    if (score >= SIMILAR_AT && (!best || score > best.score)) best = { entry: e, score };
  }
  return best;
}

if (process.argv[1]?.endsWith("art.ts") && process.argv[2] === "--try") {
  // 한 장만 만들어 본다 — 키·모델 이름이 맞는지 확인할 때
  const prompt = process.argv[3] ?? "a small lighthouse on a calm sea at night";
  const only = process.argv[4] as Provider | undefined;
  generateImage(styleFor() + prompt, only ? [only] : undefined)
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
