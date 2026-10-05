/**
 * readability.ts — 처음 보는 사람 역할의 모델에게 원고를 보여 주고, 막히는
 * 문장을 돌려받는다. 글(generate.ts)과 쇼츠 대본(script.ts)이 같이 쓴다.
 *
 * 쓰는 모델은 재료를 다 읽은 뒤라 자기 원고가 왜 어려운지 못 본다. 재료를 안
 * 본 눈이 따로 읽어야 보인다 (삽화의 검증기와 같은 구조). 읽기만 하므로 큰
 * 모델이 필요 없다 — 한 번에 1센트 안쪽.
 */
import Anthropic from "@anthropic-ai/sdk";
import { noteUsage } from "./usage";

/** 처음 보는 사람이 멈춘 문장 하나 */
export interface Unclear {
  sentence: string;
  why: string;
}

/** 검사 결과 — 실행 기록에 한 줄로 남긴다 */
export interface Readability {
  /** 첫 원고에서 막힌 문장 수 (검사가 실패하면 null) */
  before: number | null;
  /** 다시 쓴 원고에서 남은 수 (다시 쓰지 않았거나 검사가 실패하면 null) */
  after: number | null;
  rewritten: boolean;
  /** 막힌 문장들 — 로그와 미리보기에 그대로 보여 준다 */
  unclear: Unclear[];
  error?: string;
}

// 앞 것이 안 되면(모델 이름이 바뀌는 등) 다음 것으로 한다.
const READER_MODELS = ["claude-sonnet-5-5", "claude-haiku-4-5-20251001"];
const MAX_UNCLEAR = 6;

export function parseUnclear(text: string): Unclear[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error(`검사 결과를 못 읽음: ${text.slice(0, 200)}`);
  const parsed: unknown = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error("검사 결과가 배열이 아닙니다");
  return parsed
    .filter(
      (u): u is Unclear =>
        !!u && typeof u === "object" &&
        typeof (u as Unclear).sentence === "string" &&
        typeof (u as Unclear).why === "string",
    )
    .slice(0, MAX_UNCLEAR);
}

/**
 * system이 정한 독자 역할로 content를 읽게 한다. 토큰은 stage에 더한다
 * ("review" = 글, "listen" = 대본). 모든 모델이 실패하면 마지막 오류를 던진다.
 */
export async function askReader(
  system: string,
  content: string,
  stage: string,
): Promise<Unclear[]> {
  const client = new Anthropic();
  let lastErr: unknown;
  for (const model of READER_MODELS) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: 2000,
        system,
        messages: [{ role: "user", content }],
      });
      noteUsage(stage, response.usage);
      return parseUnclear(
        response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join(""),
      );
    } catch (err) {
      lastErr = err;
      console.warn(`[${stage}] ${model} 실패 — 다음 모델로:`, (err as Error).message);
    }
  }
  throw lastErr;
}

/** "막힌 문장 3개 → 다시 씀 → 남은 것 0개" — 실행 기록·미리보기가 같이 쓴다 */
export function fmtReadability(r: Readability): { ko: string; en: string } {
  if (r.error && !r.rewritten) {
    return { ko: `검사를 못 해 첫 원고 그대로 씀`, en: `check failed — kept the first draft` };
  }
  if (!r.rewritten) {
    return { ko: `막힌 문장 없음`, en: `nothing unclear` };
  }
  return {
    ko: `막힌 문장 ${r.before}개 → 다시 씀 → ${r.after == null ? "다시 검사 못 함" : `남은 것 ${r.after}개`}`,
    en: `${r.before} unclear → rewritten → ${r.after == null ? "recheck failed" : `${r.after} left`}`,
  };
}
