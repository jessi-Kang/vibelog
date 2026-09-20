/**
 * figures.ts — 데브로그 한 편에 들어갈 삽화를 그린다.
 *
 * 글이 다 써진 뒤에 돈다. 글의 네 섹션을 문단 단위로 넘기고, "이 문단 뒤에
 * 그림이 있으면 이해가 쉬워지는가"를 모델이 판단해 0장 이상을 그린다.
 * 장수 상한은 없다 — 내용이 정한다 (쇼츠의 "구성은 내용이 정한다"와 같다).
 *
 * 그려진 SVG 문자열은 여기서 **바로 검증**된다 (scripts/figure-types.ts의
 * toFigure). 걸린 삽화는 그것만 뺀다 — 글은 그대로 나간다. 한 번은 걸린
 * 이유를 돌려주고 다시 그리게 한다 (쇼츠의 빈 화면 재작성과 같은 한 번).
 * 그래도 안 되면 버린다. 삽화가 없는 글이 틀린 삽화가 든 글보다 낫다.
 *
 * 화면은 검증을 통과한 트리(FigNode)만 그린다. 문자열은 저장하지 않는다.
 */
import Anthropic from "@anthropic-ai/sdk";
import { noteUsage } from "./usage";
import {
  FIG_COLOR_TOKENS,
  FIG_H_MAX,
  FIG_MIN_FONT,
  FIG_SECTIONS,
  FIG_W,
  koreanNumerals,
  splitParas,
  toFigure,
  type FigSection,
  type PostFigure,
} from "./figure-types";

const MODEL = "claude-opus-5";
/**
 * 답의 상한. 16000에서 vibelog/2026-09-12(문단이 많은 글)의 답이 중간에 잘려
 * `]`가 없는 채로 와서 "JSON을 찾지 못했다"로 **그 글의 삽화가 통째로 0장**이
 * 됐다 (백필 #115). 한·영 두 벌의 SVG를 한 답에 내니 장수가 늘면 금방 찬다.
 * 상한을 올리고, 그래도 잘리면 "잘렸다"를 이유로 돌려 한 번 다시 그리게 한다.
 * 이 크기는 SDK가 스트리밍을 요구한다 — ask()가 stream().finalMessage()를 쓴다.
 */
const MAX_TOKENS = 32000;
/**
 * 생각의 깊이. 실측에서 출력의 3/4이 보이지 않는 thinking이었다 (보이는 SVG
 * 2,900토큰 vs 출력 11,000–32,000). 처음은 medium으로 그리고, 검증에 걸린 것만
 * high로 다시 그린다 — "싼 값에 먼저, 실패만 비싸게". 검증기가 실패 신호라서
 * 이 방식이 된다. 품질이 떨어지면(탈락률·그림 수 변화) FIRST를 "high"로 되돌린다.
 */
const EFFORT_FIRST = "medium" as const;
const EFFORT_RETRY = "high" as const;

export interface FigureSections {
  ko: Partial<Record<FigSection, string>>;
  en: Partial<Record<FigSection, string>>;
}

export interface FigureResult {
  figures: PostFigure[];
  /** 검증에 걸려 뺀 삽화 — 실행 기록에 warn으로 남긴다 */
  dropped: string[];
  /** 이 글에 쓴 토큰 합 (재작성 포함). output에는 thinking이 들어 있다 */
  usage: { input: number; output: number };
}

const SECTION_NAME: Record<FigSection, string> = {
  did: "뭘 했나",
  why: "왜",
  fail: "삽질 포인트",
  next: "다음 할 것",
};

const SYSTEM = `당신은 "vibelog" 데브로그의 삽화가입니다. 다 써진 글을 받아, 책 삽화처럼
문단 사이에 들어갈 그림을 SVG로 그립니다. 독자는 개발을 모르는 사람입니다.

## 언제 그리는가

그림이 **글자보다 빨리 이해시키는 대목**에만 그립니다. 원인과 결과, 전과 후,
경계를 넘은 것, 두 갈래, 흐름의 순서, 크기의 비교 — 이런 "구조"가 있는 문단이
후보입니다. 장수 상한은 없지만, 이미 문장만으로 충분한 문단에는 그리지 않습니다.
꾸미려고 그리지 않습니다. 그릴 것이 없으면 빈 배열을 냅니다.

## 그리는 법

- viewBox는 반드시 "0 0 ${FIG_W} 높이" (높이 120–${FIG_H_MAX}). 그림은 이 크기
  그대로 화면에 놓입니다 — 늘어나지 않으니 좁은 폭에 맞춰 단순하게.
- 쓸 수 있는 태그: svg title g path rect circle ellipse line polyline polygon
  text tspan. 이 밖은 전부 거절됩니다 (style·class·script·image·use·href 금지).
- 색은 토큰만: ${FIG_COLOR_TOKENS.map((t) => `var(--color-${t})`).join(", ")}
  또는 none. 바탕은 어둡습니다 (bg #0a0e14). 선·보조 글자는 muted/line-strong,
  본문 글자는 ink-soft, 강조 하나는 accent, 경고·경계는 warn. 강조는 한 그림에
  하나만.
- 글꼴은 var(--font-sans)(낱말) 또는 var(--font-mono)(숫자·시각). font-size는
  **${FIG_MIN_FONT} 이상** — 좁은 화면에서 줄어들기 때문입니다. 라벨은 짧게, 한 줄에.
- 모든 글자와 도형이 viewBox 안에 들어와야 합니다. 라벨끼리 겹치지 않게 좌표를
  넉넉히 잡습니다. text-anchor로 끝을 맞춥니다.
- 첫 자식은 <title> — 그림이 무엇을 보여 주는지 한 문장 (스크린 리더용).
- **라벨의 숫자는 그 섹션 본문에 있는 숫자만** 씁니다. 섹션마다 "쓸 수 있는 숫자"
  목록을 같이 줍니다 — 그 밖의 숫자는 검증기가 거절합니다 (재작성 비용이 듭니다).
  목록이 "없음"이면 그 섹션 그림에는 숫자를 쓰지 않습니다. 본문에 없는 숫자·사실을
  그림에 넣지 않습니다. 시각은 본문 표기 그대로 (본문이 "6시 6분"이면 6:06은 되지만
  6:00은 안 됩니다).
- 영문 그림(svgEn)은 같은 도형·같은 좌표에 라벨만 영어로. 영어는 글자가 길어지니
  x 좌표를 그에 맞게 조금 옮겨도 됩니다.
- 라벨 텍스트에는 <, >, & 를 쓰지 않습니다 (화살표는 → 를 씁니다).
- **수는 아라비아 숫자로** — "4회차", "20건", "6시". "네 회차", "스무 건"처럼
  한글로 풀지 않습니다. alt·caption도 같습니다. 그리고 본문에 없는 수는 한글로도
  적지 않습니다 — 본문이 "여러 회차"라고만 했으면 그림도 수를 세지 않습니다.

## 출력

JSON 배열 하나만, 코드펜스 없이:
[{"section": "why", "after": 1, "alt": "한 문장", "altEn": "one sentence",
  "caption": "그림 아래 한 줄", "captionEn": "one line",
  "svg": "<svg viewBox=\\"0 0 ${FIG_W} 200\\" role=\\"img\\"><title>…</title>…</svg>",
  "svgEn": "<svg …>…</svg>"}]

section은 did/why/fail/next, after는 그 섹션의 문단 번호(0부터) — 그 문단 **뒤**에
놓입니다. 문단 번호는 아래 본문에 적힌 것을 그대로 씁니다.`;

function paraBlock(
  label: string,
  sections: Partial<Record<FigSection, string>>,
): string {
  const out: string[] = [];
  for (const k of FIG_SECTIONS) {
    const md = sections[k];
    if (!md) continue;
    out.push(`### ${k} — ${SECTION_NAME[k]} (${label})`);
    // 검증기(inventedNumbers)와 같은 눈으로 본문의 숫자를 미리 뽑아 준다 —
    // 백필·정규 회차에서 걸린 삽화의 탈락 사유가 전부 "본문에 없는 숫자"였다.
    // 목록을 주면 첫 답에서 맞히고, 재작성(입력 3–5배)이 줄어든다.
    out.push(`쓸 수 있는 숫자: ${allowedNumbers(md)}`);
    splitParas(md).forEach((p, i) => out.push(`[${i}] ${p}`));
  }
  return out.join("\n");
}

/** 본문에 있는 숫자 목록 — 검증기가 허용하는 것과 같은 규칙(콤마 제거, 소수 포함) */
function allowedNumbers(md: string): string {
  const nums = [...new Set(md.replace(/,/g, "").match(/\d+(?:\.\d+)?/g) ?? [])];
  return nums.length ? nums.join(", ") : "없음";
}

export function buildUserPrompt(title: string, s: FigureSections): string {
  return [
    `# ${title}`,
    "",
    "## 한국어 본문 (문단 번호 = after 값)",
    paraBlock("ko", s.ko),
    "",
    "## 영어 본문 (같은 문단 번호)",
    paraBlock("en", s.en),
  ].join("\n");
}

function extractJsonArray(text: string): unknown[] {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/, "")
    .replace(/\s*```$/, "");
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1)
    throw new Error(`삽화 JSON을 찾지 못했습니다: ${text.slice(0, 120)}`);
  const parsed: unknown = JSON.parse(cleaned.slice(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error("삽화 JSON이 배열이 아닙니다");
  return parsed;
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/**
 * 모델 답(문자열) → 검증 통과한 삽화와, 걸린 것의 이유.
 * 순수 함수 — check-figures.ts가 고정 답으로 이 길을 매번 다시 태운다.
 */
export function parseFigureReply(
  text: string,
  s: FigureSections,
): { figures: PostFigure[]; dropped: { index: number; reason: string; raw?: string }[] } {
  const figures: PostFigure[] = [];
  const dropped: { index: number; reason: string; raw?: string }[] = [];
  let items: unknown[];
  try {
    items = extractJsonArray(text);
  } catch (e) {
    return { figures, dropped: [{ index: -1, reason: (e as Error).message }] };
  }
  items.forEach((raw, index) => {
    // 걸린 항목은 그 항목만 되돌려 보낸다 — 첫 답 전체를 다시 보내면 입력이
    // 3–5배가 된다 (실측: 재작성 입력 8,700–17,000 vs 첫 호출 3,000).
    const drop = (reason: string) =>
      dropped.push({ index, reason, raw: JSON.stringify(raw).slice(0, 6000) });
    if (!raw || typeof raw !== "object") return drop("항목이 객체가 아닙니다");
    const it = raw as Record<string, unknown>;
    const section = str(it.section) as FigSection;
    if (!FIG_SECTIONS.includes(section)) return drop(`모르는 섹션: ${str(it.section)}`);
    const ko = s.ko[section] ?? "";
    const en = s.en[section] ?? "";
    const after = Number(it.after);
    const nKo = splitParas(ko).length;
    if (!Number.isInteger(after) || after < 0 || after >= nKo)
      return drop(`after ${String(it.after)}가 ${section}의 문단 수(${nKo}) 밖입니다`);
    const alt = str(it.alt);
    const altEn = str(it.altEn);
    const caption = str(it.caption);
    const captionEn = str(it.captionEn);
    if (!alt || !caption) return drop("alt·caption이 비었습니다");
    const koNums = koreanNumerals([alt, caption]);
    if (koNums.length)
      return drop(`alt·caption의 수는 아라비아 숫자로 ("4회차"): ${koNums[0].slice(0, 30)}`);
    try {
      const node = toFigure(str(it.svg), ko);
      const nodeEn = toFigure(str(it.svgEn) || str(it.svg), en || ko);
      figures.push({
        section,
        after,
        alt,
        altEn: altEn || alt,
        caption,
        captionEn: captionEn || caption,
        node,
        nodeEn,
      });
    } catch (e) {
      drop((e as Error).message);
    }
  });
  return { figures, dropped };
}

export async function generateFigures(
  title: string,
  sections: FigureSections,
): Promise<FigureResult> {
  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: buildUserPrompt(title, sections) },
  ];
  // 스트리밍으로 받는다. 상한을 32000으로 올리자 SDK가 "10분을 넘길 수 있는
  // 요청은 스트리밍이 필수"라며 요청을 보내기도 전에 거절했다 (백필 #116, 4편
  // 전부 호출 0번에 실패). 답은 finalMessage()로 한 덩어리로 받으니 아래는 같다.
  const ask = async (
    effort: "medium" | "high",
  ): Promise<{ text: string; cut: boolean }> => {
    const res = await client.messages
      .stream({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        output_config: { effort },
        // 규칙(~800토큰)은 글마다 같다 — 같은 밤의 두 번째 글·재작성은 캐시에서 읽는다
        system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
        messages,
      })
      .finalMessage();
    // 실측 토큰을 실행 기록에 남긴다 — 비용은 여기서만 정확히 셀 수 있다.
    // output에는 보이지 않는 thinking 토큰이 포함된다 (Opus 5는 기본으로 생각한다).
    usage.input += res.usage.input_tokens;
    usage.output += res.usage.output_tokens;
    noteUsage("figures", res.usage);
    return {
      text: res.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join(""),
      cut: res.stop_reason === "max_tokens",
    };
  };
  const CUT = `답이 ${MAX_TOKENS} 토큰 상한에서 잘렸습니다`;
  const usage = { input: 0, output: 0 };

  const first = await ask(EFFORT_FIRST);
  // 잘린 답은 JSON이 닫히지 않아 통째로 못 읽는다 — 파싱 대신 "잘렸다"를 이유로 둔다
  let { figures, dropped } = first.cut
    ? { figures: [] as PostFigure[], dropped: [{ index: -1, reason: CUT }] }
    : parseFigureReply(first.text, sections);

  // 한 번 다시 — 이유를 그대로 돌려준다.
  //   걸린 삽화가 있으면: 걸린 것만 고쳐 내게 한다 (통과한 것은 그대로 둔다).
  //   답이 잘렸으면: 장수를 줄이거나 단순하게 해서 전체를 다시 내게 한다.
  if (dropped.length && (dropped[0].index !== -1 || first.cut)) {
    console.log(
      first.cut
        ? `[figures] ${CUT} — 줄여서 다시 그리게 합니다`
        : `[figures] 검증에 걸린 삽화 ${dropped.length}장 — 다시 그리게 합니다`,
    );
    // 첫 답을 assistant 턴으로 되돌려 보내지 않는다. 걸린 항목의 JSON과 이유만
    // 본문 뒤에 붙인 **새 user 턴 하나**로 묻는다 — 잘린 답(32,000토큰)을 다시
    // 보내는 일도 없어진다.
    messages.length = 0;
    messages.push({
      role: "user",
      content:
        buildUserPrompt(title, sections) +
        "\n\n## 다시 그릴 것\n" +
        (first.cut
          ? `${CUT}. 그림 장수를 줄이거나 도형을 단순하게 해서, 꼭 필요한 그림만 ` +
            "같은 형식의 JSON 배열로 내세요."
          : "아래 항목이 검증에 걸렸습니다. 고쳐서 **이 항목들만** 같은 형식의 JSON " +
            "배열로 내세요 (통과한 다른 항목은 이미 받았으니 다시 내지 않습니다). " +
            "고칠 수 없으면 빈 배열을 내세요.\n\n" +
            dropped
              .map((d) => `- [${d.index}] 이유: ${d.reason}\n  항목: ${d.raw ?? "(없음)"}`)
              .join("\n")),
    });
    const second = await ask(EFFORT_RETRY);
    const retry = second.cut
      ? { figures: [] as PostFigure[], dropped: [{ index: -1, reason: `${CUT} (두 번째도)` }] }
      : parseFigureReply(second.text, sections);
    figures = [...figures, ...retry.figures];
    dropped = retry.dropped;
  }

  // 같은 자리에 둘이 붙으면 그림이 연달아 두 장이다 — 앞의 것만 남긴다
  const seen = new Set<string>();
  const unique = figures.filter((f) => {
    const k = `${f.section}:${f.after}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return {
    figures: unique,
    dropped: dropped.map((d) => (d.index === -1 ? d.reason : `#${d.index} ${d.reason}`)),
    usage,
  };
}
