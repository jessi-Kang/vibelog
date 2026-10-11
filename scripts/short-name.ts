/**
 * short-name.ts — 쇼츠 머리글에 쓸 짧은 이름.
 *
 * 머리글을 42px로 키우자(10/11 시안 B안) 긴 이름이 템플릿 배지 옆 자리에 안 들어가 "Apartment Authen…"처럼
 * 잘렸다. Jessi가 "…"고 해서, 자리를 넘는 이름만 작은 모델(Haiku)에
 * 한 번 줄여 달라고 하고 projects.json에 적어 둔다. 이름이 그대로면 다시 묻지 않는다 (shortFor).
 * 렌더는 이름이 그 편의 배지 옆 자리를 넘을 때만 짧은 이름을 쓴다 (video/src/ShipIt.tsx).
 */
import Anthropic from "@anthropic-ai/sdk";
import { createInOrder, HAIKU_MODELS } from "./models";
import { headerUnits, SHORT_NAME_BUDGET } from "./shorts-types";

export interface ShortNames {
  nameShort?: string;
  nameEnShort?: string;
  /** 어떤 이름을 줄인 것인지 — 이름이 바뀌면 다시 만든다 */
  shortFor: string;
}

export const shortKey = (name: string, nameEn?: string) => `${name}|${nameEn ?? ""}`;

const SYSTEM = `서비스 이름을 받습니다. 세로 영상 맨 위 좁은 머리글에 들어갈 **짧은 이름**을 하나 만듭니다.
- 영어 이름이면 공백 포함 ${SHORT_NAME_BUDGET}자 이하. 낱말을 흔히 쓰는 약어로 줄입니다 (Apartment → Apt, Detective → Det).
  머리글자만 모은 약어(AA)는 무엇인지 알 수 없어 쓰지 않습니다.
- 한국어 이름이면 띄어쓰기 포함 다섯 글자 이하. 이름의 핵심 낱말을 남깁니다. 새 낱말을 지어내지 않습니다.
- 보는 사람이 원래 이름을 떠올릴 수 있어야 합니다.
짧은 이름만 한 줄로 출력합니다.`;

async function shorten(name: string): Promise<string | undefined> {
  const res = await createInOrder(new Anthropic(), HAIKU_MODELS, {
    max_tokens: 60,
    system: SYSTEM,
    messages: [{ role: "user", content: name }],
  });
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim()
    .split("\n")[0]
    .replace(/^["'“”]|["'“”]$/g, "")
    .trim();
  // 자리에 안 들어가거나 원래 이름과 같으면 버린다 — 렌더가 "…"로 자른다
  if (!text || text === name || headerUnits(text) > SHORT_NAME_BUDGET) return undefined;
  return text;
}

/**
 * 자리를 넘는 이름만 줄인다. 이전 결과(prev)가 같은 이름의 것이면 그대로 쓴다.
 * 실패해도 글·카드에는 영향이 없다 — 머리글이 "…"로 잘릴 뿐이라 빈 값을 돌려준다.
 */
export async function shortNames(
  name: string,
  nameEn: string | undefined,
  prev: Partial<ShortNames> | undefined,
): Promise<ShortNames> {
  const key = shortKey(name, nameEn);
  if (prev?.shortFor === key) return { nameShort: prev.nameShort, nameEnShort: prev.nameEnShort, shortFor: key };
  const out: ShortNames = { shortFor: key };
  try {
    if (headerUnits(name) > SHORT_NAME_BUDGET) out.nameShort = await shorten(name);
    if (nameEn && headerUnits(nameEn) > SHORT_NAME_BUDGET) out.nameEnShort = await shorten(nameEn);
  } catch (err) {
    console.warn(`- ${name} 짧은 이름 만들기 실패 (머리글은 "…"로 자른다):`, err);
    return { shortFor: "" };
  }
  return out;
}
