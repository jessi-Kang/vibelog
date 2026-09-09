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
- 한국어 존댓말. 담백하고 구체적으로. 과장·이모지·홍보 문구 금지.
- 구조: "## 뭘 했나", "## 왜", "## 삽질 포인트", "## 다음 할 것" 네 섹션의 마크다운.
- 커밋 메시지 본문의 "왜"를 최우선 재료로 쓴다. 재료에 없는 사실을 지어내지 않는다.
- 삽질 포인트가 재료에 없으면 그 섹션은 "특별한 삽질은 없었습니다." 한 줄로.
- 분량은 전체 300~600자 내외. 하루치 요약이지 회고록이 아니다.
- 영어 번역(en)은 같은 구조로: "## What I did", "## Why", "## Rabbit holes", "## Next up".

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
