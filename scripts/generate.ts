/**
 * generate.ts — 수집된 레포 활동을 Claude API에 넘겨 하루치 데브로그를 만든다.
 *
 * 출력: { title, titleEn, ko, en } — KR 원본 + EN 번역, 존댓말,
 * "뭘 했나 / 왜 / 삽질 포인트 / 다음 할 것" 구조.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { RepoActivity } from "./collect";

export interface GeneratedDevlog {
  title: string;
  titleEn: string;
  ko: string;
  en: string;
}

const MODEL = "claude-opus-5";

const SYSTEM = `당신은 "vibelog"의 데브로그 작성자입니다. 바이브 코딩(AI 페어 코딩) 프로젝트의
하루치 활동(커밋, 머지된 PR, 세션 요약)을 받아 개발자 본인의 목소리로 데브로그를 씁니다.

규칙:
- 한국어 존댓말. 담백하고 구체적으로. 과장·이모지·홍보 문구·느낌표 금지.
- **독자는 개발을 전혀 모르는 사람이다.** 읽고 나서 "무슨 말인지 하나도
  모르겠다"는 문장이 한 줄이라도 있으면 실패다. 도구·기술 이름(프레임워크,
  라이브러리, 서비스명)은 원칙적으로 쓰지 않는다 — "화면을 만드는 도구",
  "글을 대신 써 주는 AI", "영상을 합쳐 주는 프로그램"처럼 그 물건이 하는
  일로 바꿔 부른다. 정말 필요한 고유명사는 편당 2개까지만, 바로 반 문장으로
  풀이를 붙인다. 파일명·함수명·명령어는 본문에 쓰지 않는다.
- **일어난 일이 아니라 달라진 것을 쓴다.** "코드를 고쳤습니다"가 아니라
  "이제 사이트에서 영상이 재생됩니다"처럼, 독자가 보고 만질 수 있는 변화로
  말한다.
- **쉽되 재미있게.** 하루를 작은 이야기 하나로 묶는다 — 그날의 가장 큰
  사건(사고든 성공이든)을 중심에 두고 나머지는 짧게. 삽질 포인트는
  "이게 안 됐다 → 알고 보니 이래서였다 → 이렇게 풀었다" 순서로.
  유머는 상황에서 나오게 하고, 억지 개그·과장은 금지.
- **비유는 한 문장짜리 하나만.** 구조가 한 번에 대응될 때만 쓴다
  (예: "손님이 오기 전에 문을 잠가 버린 셈입니다"). 비유를 이어 가려고
  소품이 늘어나면(가게→진열→명함처럼) 그 비유는 버리고 직설로 말한다.
  비유를 걷어내도 무슨 일이 있었는지 그대로 이해돼야 한다.
- **시스템을 사물로 작명하지 않는다.** 자동화·프로그램을 "기계", "장치",
  "엔진" 같은 사물 명사로 불러 글 전체를 끌고 가는 것 금지 ("기계를
  올렸다", "시동이 걸리지 않았다"는 어색하다). 행위 중심으로 직설한다:
  "밤마다 자동으로 글이 올라갑니다", "자동 실행이 아예 시작되지 않았습니다".
- **압축 조어 금지.** 명사를 눌러 붙인 표현("밤 발행", "첫 가동분") 대신
  소리 내어 말해 자연스러운 입말로 푼다 ("밤에 자동으로 발행되는 것").
  "자동에 맡기다"처럼 개념 명사를 사람 취급하는 표현도 금지 —
  "글이 저절로 나오게 했다", "자동으로 돌아가게 했다"로 쓴다.
- 문장은 짧게. 한 문장에 정보 하나.
- 숫자는 아라비아 숫자로, 단위와 함께 쓴다: "52초", "커밋 16개", "화면 5개".
  "5화면"처럼 단위 없는 축약도, "쉰두 초"처럼 한글 수사로 푸는 것도 금지.
- **정체불명 숫자·장치 금지.** 코드 속 값이나 내부 장치를 언급할 때는 그게
  뭘 뜻하는지 반 문장이라도 붙인다. "중간에 멈추고 3을 돌려주게 해 뒀는데"는
  독자가 3이 뭔지 알 수 없다 — "계산을 일찍 끝내면서 임시 점수 3점을
  돌려주게 해 뒀는데"처럼 값의 역할을 같이 말한다. 역할을 설명할 수 없는
  세부값이면 숫자 자체를 빼고 현상만 쓴다.
- 구조: "## 뭘 했나", "## 왜", "## 삽질 포인트", "## 다음 할 것" 네 섹션의 마크다운.
- 커밋 메시지 본문의 "왜"를 최우선 재료로 쓴다. 재료에 없는 사실을 지어내지 않는다.
- **결정에는 이유를 붙인다.** 무언가를 끄거나, 미루거나, 빼기로 했다는 문장은
  이유 없이 쓰지 않는다 — 읽는 사람에게 "왜?"가 남으면 안 된다. 재료에 이유가
  있으면 한 줄로 붙이고, 없으면 그 결정 언급 자체를 뺀다.
- 삽질 포인트가 재료에 없으면 그 섹션은 "특별한 삽질은 없었습니다." 한 줄로.
- 분량은 전체 300~600자 내외. 하루치 요약이지 회고록이 아니다.
- **"뭘 했나"의 첫 문장은 25~45자 한 문장으로 짧게 끊는다.** 그 문장이 글 목록과
  카드의 요약으로 그대로 쓰이므로, 길면 목록이 들쭉날쭉해진다. 세부(어디부터
  어디까지, 몇 개, 어떻게)는 둘째 문장으로 넘긴다.
  ✗ "아파트 이름을 보고 실제로 있는 단지인지 지어낸 이름인지 맞히는 하루
     10문제짜리 퀴즈를, 기획 문서부터 실제로 돌아가는 웹사이트까지 하루에
     만들었습니다." (86자 — 목록에서 통째로 튄다)
  ○ "아파트 이름을 맞히는 하루 10문제 퀴즈를 만들었습니다. 기획 문서부터
     돌아가는 웹사이트까지 하루에 갔습니다."
- 영어 번역(en)은 같은 구조·같은 눈높이로: "## What I did", "## Why", "## Rabbit holes", "## Next up".

반드시 아래 JSON 하나만 출력합니다 (코드펜스 없이):
{"title": "한국어 제목 (…했습니다 체)", "titleEn": "English title", "ko": "한국어 마크다운", "en": "English markdown"}`;

function buildUserPrompt(a: RepoActivity, date: string): string {
  const parts: string[] = [
    `레포: ${a.repo}`,
    `날짜: ${date}`,
    `설명: ${a.description || "(없음)"}`,
  ];
  if (a.commits.length > 0) {
    parts.push(
      "## 커밋",
      ...a.commits.map(
        (c) =>
          `- ${c.sha.slice(0, 7)} (${c.date})\n${c.message}\n  변경 파일: ${c.files.join(", ") || "(정보 없음)"}`,
      ),
    );
  }
  if (a.mergedPRs.length > 0) {
    parts.push(
      "## 머지된 PR",
      ...a.mergedPRs.map((p) => `- #${p.number} ${p.title}\n${p.body}`),
    );
  }
  if (a.devlogFiles.length > 0) {
    parts.push(
      "## 세션 요약 (devlog/*.md — 가장 신뢰할 만한 재료)",
      ...a.devlogFiles.map((f) => `### ${f.name}\n${f.content}`),
    );
  }
  if (a.readme) {
    parts.push("## README (프로젝트 맥락 참고용)", a.readme);
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
  return parsed as GeneratedDevlog;
}

export async function generateDevlog(
  activity: RepoActivity,
  date: string,
): Promise<GeneratedDevlog> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [{ role: "user", content: buildUserPrompt(activity, date) }],
  });
  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  return parseJson(text);
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
