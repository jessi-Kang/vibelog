/**
 * models.ts — 글·대본·삽화 모델 호출. 새 모델을 못 찾으면(404) 한 단계 아래 모델로
 * 한 번 다시 부른다.
 *
 * 10/5에 글·대본을 Opus 5.5로 올렸다. 모델 이름이 틀렸거나 키에 아직 열리지
 * 않았으면 밤 실행이 통째로 실패해 그날 글이 없어진다. 모델을 못 찾은 경우만
 * 넘어가고(다른 오류는 그대로 던진다), 넘어간 사실은 로그와 usage 줄에 남는다.
 */
import Anthropic from "@anthropic-ai/sdk";

export const FALLBACK_MODEL = "claude-opus-5";

export async function createMessage(
  client: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  try {
    return await client.messages.create(params);
  } catch (err) {
    if (err instanceof Anthropic.NotFoundError && params.model !== FALLBACK_MODEL) {
      console.warn(`[model] ${params.model}를 못 찾음 — ${FALLBACK_MODEL}로 다시 부릅니다`);
      return client.messages.create({ ...params, model: FALLBACK_MODEL });
    }
    throw err;
  }
}

/**
 * 스트리밍판 — 답 상한이 커서 SDK가 스트리밍을 요구하는 호출(삽화)용.
 * 답은 finalMessage()로 한 덩어리로 받는다.
 */
export async function streamMessage(
  client: Anthropic,
  params: Anthropic.MessageStreamParams,
): Promise<Anthropic.Message> {
  try {
    return await client.messages.stream(params).finalMessage();
  } catch (err) {
    if (err instanceof Anthropic.NotFoundError && params.model !== FALLBACK_MODEL) {
      console.warn(`[model] ${params.model}를 못 찾음 — ${FALLBACK_MODEL}로 다시 부릅니다`);
      return client.messages.stream({ ...params, model: FALLBACK_MODEL }).finalMessage();
    }
    throw err;
  }
}
