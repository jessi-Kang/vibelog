/**
 * generate.ts — 수집된 레포 활동을 Claude API에 넘겨 하루치 데브로그를 만든다.
 *
 * 출력: { title, titleEn, ko, en } — KR 원본 + EN 번역, 존댓말,
 * "뭘 했나 / 왜 / 삽질 포인트 / 다음 할 것" 구조.
 */
import Anthropic from "@anthropic-ai/sdk";
import { noteUsage } from "./usage";
import { createMessage } from "./models";
import { askReader, type Readability, type Unclear } from "./readability";

export type { Readability, Unclear };
import type { RepoActivity } from "./collect";

export interface GeneratedDevlog {
  title: string;
  titleEn: string;
  ko: string;
  en: string;
  /** 그날 이야기의 중심이 삽질이었나 — 목록의 "삽질" 배지 (docs/post-project-and-kind.html C안) */
  failStory: boolean;
}

// 글은 독자가 직접 읽는 원고라 가장 좋은 모델로 쓴다 (10/5 Jessi: "글 쓰기만
// Opus 5.5로 바꿔. 대본도"). 삽화는 검증기가 받쳐 주므로 Opus 5 그대로다.
const MODEL = "claude-opus-5-5";

const SYSTEM = `당신은 "vibelog"의 데브로그 작성자입니다. 바이브 코딩(AI와 같이 코딩하는 방식)으로
만드는 프로젝트의 하루치 활동(커밋, 머지된 PR, 세션 요약)을 받아, 만든 사람 본인의
목소리로 짧은 글을 씁니다.

## 이 글을 읽는 사람
개발을 모르는 사람이 이 글 한 편만 보고 들어옵니다. 이 프로젝트가 뭔지도, 어제 글도
모릅니다. 다 읽고 나서 "오늘 뭐가 달라졌는지"를 자기 말로 한 문장에 옮길 수 있어야
성공입니다. 읽다가 한 문장이라도 "이게 무슨 말이지?" 하고 멈추면 실패입니다.

## 말하는 사람
글은 프로젝트를 만드는 Jessi 한 사람이 "저"로 말합니다. 재료(커밋, 세션 요약)는 Jessi와
같이 일하는 AI가 쓴 것이 많아서, Jessi를 3인칭으로 부르고 "나"·"내가"는 그 AI를 가리킵니다.
재료의 "Jessi"가 글의 "저"입니다. AI가 한 일도 "저"가 한 일로 씁니다. 글에 "Jessi"라는
이름을 쓰지 않습니다 — 한 글 안에서 "저"와 "Jessi"가 따로 나오면 독자는 누가 말하는지
놓칩니다. 영어는 "I"로 씁니다.

## 재료를 읽는 법
커밋 메시지는 개발자가 나중의 자기에게 남긴 메모입니다. 내부 이름, 판단 기준,
몇 자·몇 개 같은 세부 값, 파일 위치가 가득합니다. 그 메모를 쉬운 말로 한 줄씩
옮기면 쉬운 말로 쓴 메모가 될 뿐, 글이 되지 않습니다. 메모에서 골라낼 것은 둘입니다.
- 쓰는 사람 눈에 무엇이 달라졌나 (화면, 글, 영상, 걸리는 시간, 드는 돈)
- 그게 왜 문제였나 / 왜 필요했나 — 쓰는 사람 입장에서
속에서 어떻게 돌아가는지(무엇을 어떤 기준으로 판단하는지, 몇 군데서 하는지, 기준값이
몇인지)는 쓰지 않습니다. 결과만 씁니다. 원인을 말해야 이야기가 되는 삽질 포인트에서만
원인을 한두 문장으로, 화면에서 보이는 말로 씁니다.
커밋 메시지의 내부 용어(판정, 문턱, 가드, 슬롯, 캐시, 체크포인트, tally 같은 말)는
가져오지 않습니다. 그 말이 가리키는 것을 독자가 보는 이름으로 부릅니다.

## 무엇을 쓸까 — 이야기 하나
1. 그날 바뀐 것 중 쓰는 사람에게 가장 큰 것 하나를 고릅니다. 글은 그 하나의 이야기입니다.
2. 나머지는 "뭘 했나" 끝에 한 문장으로 묶거나("이 밖에 영상 속 그림도 손봤습니다")
   뺍니다. 하나씩 설명하지 않습니다. 네 가지를 조금씩 말하면 아무것도 전해지지 않습니다.
3. 무대부터 깝니다. 그 일이 어디(어떤 화면, 어떤 기능)에서 일어나는지 한 문장으로
   먼저 말합니다. 독자가 그 화면을 떠올릴 수 있어야 다음 문장이 읽힙니다.
   ✗ "사라진 그림 한 장 때문에 판정 규칙을 하나로 모았습니다."
     (무슨 그림인지, 판정이 뭔지 모른다)
   ○ "이 블로그는 글 사이사이에 설명 그림을 넣습니다. 그런데 어제 글에서 그림 한 장이
     화면에 안 나왔습니다."
4. 지난 글 제목이 주어지면 이어지는 이야기인지 봅니다. 이어지면 "지난번에 …했는데"로
   한 번 짚어 줍니다. 독자가 지난 글을 읽었다고 가정하지는 않습니다.

## 섹션
"## 뭘 했나", "## 왜", "## 삽질 포인트", "## 다음 할 것" 네 섹션의 마크다운.
- 뭘 했나: 첫 문장은 달라진 것 하나를 25–45자 한 문장으로. 그 문장이 글 목록과 카드의
  요약으로 그대로 쓰이므로 짧게 끊습니다. 세부와 무대는 둘째 문장부터.
  ✗ "아파트 이름을 보고 실제로 있는 단지인지 지어낸 이름인지 맞히는 하루 10문제짜리
     퀴즈를, 기획 문서부터 실제로 돌아가는 웹사이트까지 하루에 만들었습니다." (86자)
  ○ "아파트 이름을 맞히는 하루 10문제 퀴즈를 만들었습니다. 기획 문서부터 돌아가는
     웹사이트까지 하루에 갔습니다."
- 왜: 쓰는 사람에게 무엇이 불편했는지, 무엇이 문제였는지. 동작 원리 설명이 아닙니다.
- 삽질 포인트: "이게 안 됐다 → 알고 보니 이래서였다 → 이렇게 풀었다" 순서로 짧게.
  재료에 삽질이 없으면 "특별한 삽질은 없었습니다." 한 줄.
- 다음 할 것: 한두 문장.

## 문장
- 한국어 존댓말. 담백하고 구체적으로. 과장·이모지·홍보 문구·느낌표 금지.
- 소리 내어 읽어 자연스러운 입말로 씁니다. 문장은 짧게, 한 문장에 정보 하나.
- 도구·기술 이름(프레임워크, 라이브러리, 서비스명)은 쓰지 않고 하는 일로 부릅니다
  ("화면을 만드는 도구", "글을 대신 써 주는 AI"). 꼭 필요한 고유명사는 편당 2개까지,
  반 문장 풀이를 붙입니다. 파일명·함수명·명령어는 쓰지 않습니다.
- 명사를 눌러 붙인 말을 새로 만들지 않습니다 ("밤 발행", "첫 가동분", "예비 회차"
  대신 "밤에 자동으로 글이 올라가는 것"). 프로그램을 "기계", "장치", "엔진" 같은
  사물로 부르지 않고, 개념 명사를 사람처럼 쓰지 않습니다 ("자동에 맡기다" 대신
  "저절로 돌아가게 했다").
- 비유는 구조가 한 번에 맞을 때 한 문장만. 비유를 걷어내도 뜻이 그대로 통해야 합니다.
- 숫자는 아라비아 숫자와 단위로("52초", "커밋 16개"). 숫자를 쓰면 그게 뭔지 같이
  말합니다. 역할을 설명할 수 없는 세부 값이면 숫자를 빼고 현상만 씁니다.
- 무언가를 끄거나 미루거나 뺐다고 쓰면 이유를 붙입니다. 이유가 재료에 없으면 그
  결정 언급을 뺍니다.
- 커밋 본문의 "왜"를 가장 먼저 봅니다. 재료에 없는 사실은 지어내지 않습니다.
- 분량은 전체 300–600자. 하루치 요약이지 회고록이 아닙니다.
- 영어 번역(en)은 같은 구조·같은 눈높이로: "## What I did", "## Why", "## Rabbit holes",
  "## Next up".

## failStory
그날 이야기의 **중심**이 삽질이었으면 true. 무언가가 고장 나 있었고 그 원인을 찾아
고친 것이 하루의 줄기일 때입니다 (제목이 "…안 뜬 이유를 찾았습니다", "…끊기던 것을
고쳤습니다" 같은 꼴). 만든 것·들인 것·바꾼 것이 줄기이고 삽질은 곁가지였으면 false.
삽질 섹션은 형식이라 늘 채워지므로, 섹션이 있다고 true가 아닙니다.

반드시 아래 JSON 하나만 출력합니다 (코드펜스 없이):
{"title": "한국어 제목 (…했습니다 체)", "titleEn": "English title", "ko": "한국어 마크다운", "en": "English markdown", "failStory": false}`;

/** 글 재료 중 생성에 쓰는 부분 — 지난 글을 다시 써 보는 미리보기도 같은 꼴로 만든다 */
export type DevlogMaterial = Pick<
  RepoActivity,
  "repo" | "description" | "commits" | "mergedPRs" | "devlogFiles" | "readme"
>;

/** 독자가 이미 본 이야기 — 같은 레포의 지난 글 제목 (최근 것부터) */
export interface PostContext {
  recent: { date: string; title: string }[];
}

function buildUserPrompt(
  a: DevlogMaterial,
  date: string,
  ctx?: PostContext,
): string {
  // 프로젝트가 뭔지가 먼저다 — 글의 첫 문단이 무대를 깔려면 모델이 먼저 알아야 한다.
  // README를 맨 뒤에 붙이던 때는 커밋 메모부터 읽고 그 말투를 그대로 옮겼다.
  const parts: string[] = [
    `레포: ${a.repo}`,
    `날짜: ${date}`,
    `프로젝트 한 줄 설명: ${a.description || "(없음)"}`,
  ];
  if (a.readme) {
    parts.push("## README (이 프로젝트가 뭔지 — 무대를 깔 때 참고)", a.readme);
  }
  if (ctx && ctx.recent.length > 0) {
    parts.push(
      "## 이 프로젝트의 지난 글 (최근 것부터 — 이어지는 이야기인지 볼 때만)",
      ...ctx.recent.map((r) => `- ${r.date} ${r.title}`),
    );
  }
  if (a.devlogFiles.length > 0) {
    parts.push(
      "## 세션 요약 (devlog/*.md — 가장 신뢰할 만한 재료)",
      ...a.devlogFiles.map((f) => `### ${f.name}\n${f.content}`),
    );
  }
  if (a.mergedPRs.length > 0) {
    parts.push(
      "## 머지된 PR",
      ...a.mergedPRs.map((p) => `- #${p.number} ${p.title}\n${p.body}`),
    );
  }
  if (a.commits.length > 0) {
    parts.push(
      "## 커밋 (개발자가 자기에게 남긴 메모 — 그대로 옮기지 말고 골라낼 것)",
      ...a.commits.map(
        (c) =>
          `- ${c.sha.slice(0, 7)} (${c.date})\n${c.message}\n  변경 파일: ${c.files.join(", ") || "(정보 없음)"}`,
      ),
    );
  }
  return parts.join("\n\n");
}

function parseJson(text: string): GeneratedDevlog {
  // 모델이 코드펜스로 감싸는 경우까지 방어
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/, "")
    .replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error(`데브로그 JSON 파싱 실패: ${text.slice(0, 200)}`);
  }
  const parsed = JSON.parse(cleaned.slice(start, end + 1));
  for (const key of ["title", "titleEn", "ko", "en"] as const) {
    if (typeof parsed[key] !== "string" || parsed[key].length === 0) {
      throw new Error(`데브로그 JSON에 ${key}가 없습니다`);
    }
  }
  // 빠졌거나 이상한 값이면 false — 배지는 확실할 때만 붙인다
  parsed.failStory = parsed.failStory === true;
  return parsed as GeneratedDevlog;
}

const REVIEW_SYSTEM = `당신은 개발을 전혀 모르는 독자입니다. 이 블로그에 처음 들어와 아래 글 한 편을
읽습니다. 이 프로젝트도, 지난 글도 모릅니다.

읽다가 멈추게 되는 문장을 찾습니다. 멈추는 이유는 다섯 중 하나입니다.
1. 뜻을 모르는 말 — 전문 용어, 내부에서만 쓰는 이름, 처음 보는 줄임말이나 붙여 만든 말
2. 무엇을 가리키는지 모르는 말 — "그 판정", "그 대목", "세 군데"처럼 앞에서 소개된 적 없는 것
3. 왜 알아야 하는지 모르는 속사정 — 어떤 기준으로 판단하는지, 기준값이 몇인지 같은 내부 설명
4. 앞뒤가 이어지지 않아 무슨 말을 하려는지 모르는 문장
5. 누가 말하는지 헷갈리는 문장 — 글쓴이("저")와 다른 이름이 같은 사람인지 다른 사람인지 모를 때

문체 취향, 문장 길이, 맞춤법은 지적하지 않습니다. 실제로 이해가 막히는 문장만 고릅니다.
막히는 곳이 없으면 빈 배열을 냅니다. 많아도 6개까지, 가장 막히는 것부터.

반드시 JSON 배열 하나만 출력합니다 (코드펜스 없이):
[{"sentence": "글에 있는 문장 그대로", "why": "어디서 왜 막혔는지 한 문장"}]`;

function textOf(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/** 처음 읽는 독자 역할로 한국어 원고를 읽고, 막히는 문장을 돌려준다 */
export function reviewReadability(d: GeneratedDevlog): Promise<Unclear[]> {
  return askReader(REVIEW_SYSTEM, `# ${d.title}\n\n${d.ko}`, "review");
}

function rewriteAsk(unclear: Unclear[]): string {
  return [
    "개발을 모르는 독자가 이 글을 처음 읽다가 아래 문장에서 멈췄습니다.",
    "",
    ...unclear.map((u, i) => `${i + 1}. "${u.sentence}"\n   → ${u.why}`),
    "",
    "이 문장들을 고쳐 글 전체를 다시 내 주세요.",
    "- 독자가 모르는 말은 화면에서 보이는 말로 바꾸거나, 처음 나올 때 무엇인지 먼저 소개합니다.",
    "- 이야기에 꼭 필요하지 않은 속사정(기준값, 내부 동작)이면 고치지 말고 뺍니다.",
    "- 재료에 없는 사실을 새로 넣지 않습니다. 첫 문장 길이와 섹션 구조 규칙은 그대로입니다.",
    "- 영어(en)도 같이 맞춥니다.",
    "같은 JSON 형식 하나만 출력합니다.",
  ].join("\n");
}

/**
 * 하루치 글을 쓴다. 쓰고 나서 처음 읽는 독자 역할의 모델이 한 번 읽고, 막히는
 * 문장이 있으면 그 목록을 돌려 **한 번** 다시 쓰게 한다.
 *
 * 지시문에 "독자는 개발을 모른다"를 적어 둔 채로도 글은 점점 커밋 메모의 말투를
 * 닮아 갔다 ("판정 규칙을 하나로 모았습니다", "어느 손잡이를 돌려야 하는지") —
 * 쓰는 모델은 재료를 다 읽은 뒤라 자기 글이 왜 어려운지 못 본다. 재료를 안 본
 * 눈이 따로 읽어야 보인다 (삽화의 검증기와 같은 구조). 검사가 실패하거나 다시
 * 쓴 답이 깨지면 첫 원고를 낸다 — 글이 안 나가는 것보다 낫다.
 */
export async function generateDevlog(
  activity: DevlogMaterial,
  date: string,
  ctx?: PostContext,
): Promise<GeneratedDevlog & { readability: Readability }> {
  const client = new Anthropic();
  // 시스템 프롬프트는 밤마다 같다 — 한 밤에 레포 수만큼 부르니 두 번째부터
  // 캐시에서 읽는다 (Opus 5는 512토큰부터 캐시).
  const system = [
    { type: "text" as const, text: SYSTEM, cache_control: { type: "ephemeral" as const } },
  ];
  const userPrompt = buildUserPrompt(activity, date, ctx);
  const first = await createMessage(client, {
    model: MODEL,
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content: userPrompt }],
  });
  noteUsage("generate", first.usage);
  const firstText = textOf(first.content);
  const draft = parseJson(firstText);

  let unclear: Unclear[];
  try {
    unclear = await reviewReadability(draft);
  } catch (err) {
    return {
      ...draft,
      readability: { before: null, after: null, rewritten: false, unclear: [], error: (err as Error).message },
    };
  }
  if (unclear.length === 0) {
    return { ...draft, readability: { before: 0, after: null, rewritten: false, unclear } };
  }
  console.log(
    `[review] 막힌 문장 ${unclear.length}개:\n` +
      unclear.map((u) => `  - "${u.sentence}" → ${u.why}`).join("\n"),
  );

  let fixed: GeneratedDevlog;
  try {
    const second = await createMessage(client, {
      model: MODEL,
      max_tokens: 16000,
      system,
      messages: [
        { role: "user", content: userPrompt },
        { role: "assistant", content: firstText },
        { role: "user", content: rewriteAsk(unclear) },
      ],
    });
    noteUsage("generate", second.usage);
    fixed = parseJson(textOf(second.content));
  } catch (err) {
    return {
      ...draft,
      readability: {
        before: unclear.length, after: null, rewritten: false, unclear,
        error: `다시 쓰기 실패: ${(err as Error).message}`,
      },
    };
  }
  const left = await reviewReadability(fixed).catch(() => null);
  return {
    ...fixed,
    readability: { before: unclear.length, after: left ? left.length : null, rewritten: true, unclear },
  };
}

/**
 * 프로젝트 카드용 한 줄 텍스트 번역 (레포 description 등).
 * 매 실행 재번역하지 않도록 호출부(run.ts)가 원문 기준으로 캐시한다.
 */
export async function translateLine(ko: string): Promise<string> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001", // 한 줄 번역 — 큰 모델이 필요 없다
    max_tokens: 300,
    system:
      "Translate the given Korean text to natural, concise English. " +
      "It is a one-line project description. Output only the translation.",
    messages: [{ role: "user", content: ko }],
  });
  return response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

/**
 * 커밋 한 줄 메시지들의 일괄 번역 — 글의 "원료 · git log"를 EN 모드에서도
 * 읽을 수 있게. 접두어(feat:/fix: 등)와 기술 용어는 그대로 둔다.
 */
export async function translateCommitLines(lines: string[]): Promise<string[]> {
  if (lines.length === 0) return [];
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    system:
      "Translate each Korean git commit message to concise natural English. " +
      "Keep conventional-commit prefixes (feat:, fix:, chore:, …), code terms " +
      "and proper nouns as-is. Output ONLY a JSON array of strings, same " +
      "order and length as the input array.",
    messages: [{ role: "user", content: JSON.stringify(lines) }],
  });
  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  const parsed = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(parsed) || parsed.length !== lines.length) {
    throw new Error("커밋 메시지 번역 결과가 입력과 길이가 다릅니다");
  }
  return parsed.map(String);
}
