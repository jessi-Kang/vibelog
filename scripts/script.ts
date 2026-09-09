/**
 * script.ts — 데브로그 한 편 → 쇼츠 대본 JSON.
 *
 * 입력: content/devlog/<repo>/<date>.md
 * 출력: content/shorts/<repo>/<date>.json (ShortsScript)
 *
 * 사용: npx tsx scripts/script.ts <repo> <date>
 */
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import matter from "gray-matter";
import {
  shortsJsonPath,
  type ShortsLine,
  type ShortsScript,
  type ShortsTemplate,
} from "./shorts-types";

const MODEL = "claude-opus-5";

const SYSTEM = `당신은 "vibelog" 쇼츠(30~45초 세로 영상)의 대본 작가입니다.
데브로그 한 편을 받아 내레이션 대본을 씁니다. 개발자 본인이 담백하게 말하는 존댓말입니다.

구조 (scene 순서): hook(1~2문장, 3~4초짜리 강한 첫 마디) → build(뭘 만들었나)
→ demo(화면을 보여주며 하는 말) → fail(삽질 이야기) → next(다음 할 것) → end(마무리 한 마디).
전체 8~10문장, 말했을 때 30~40초 분량 (상한 45초 — 넘길 바엔 문장을 뺀다).
문장은 짧게 — 화면 자막 두 줄(공백 포함 ~24자)을 넘기지 않는다.

규칙:
- 데브로그에 없는 사실을 지어내지 않는다. 과장·이모지 금지.
- keywords: 각 ko 문장에서 강조할 단어 1~3개. 문장에 실제로 등장하는 단어(공백 단위 토큰)와 정확히 일치해야 한다. keywordsEn도 en 문장에 대해 동일.
- en은 같은 내용의 자연스러운 영어. 존댓말 뉘앙스는 평서체로.
- template: 배포·릴리즈가 핵심이면 "ship-it", 삽질 이야기가 제일 강하면 "fail", 둘 다 아니면 "ship-it".
- fail 장면이 있으면 failCard도 채운다: before(문제 상황 한 줄), after(해결 한 줄), title(카드 제목, 짧게).
- captions: 유튜브/인스타 설명문 (ko/en 각 1~2문장 + 줄바꿈 없이).
- hashtags: 5~8개, # 포함, 한국어·영어 섞어서.

반드시 아래 JSON 하나만 출력 (코드펜스 없이):
{"template":"ship-it","lines":[{"scene":"hook","ko":"...","en":"...","keywords":["..."],"keywordsEn":["..."]}],
 "failCard":{"title":"...","titleEn":"...","before":"...","after":"..."},
 "captions":{"ko":"...","en":"..."},"hashtags":["#..."]}`;

interface ProjectMeta {
  slug: string;
  homepage?: string;
}

function parseJson(text: string): Record<string, unknown> {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/, "")
    .replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error(`대본 JSON 파싱 실패: ${text.slice(0, 200)}`);
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

function validateLines(raw: unknown): ShortsLine[] {
  if (!Array.isArray(raw) || raw.length < 4) {
    throw new Error("lines가 너무 적습니다");
  }
  const scenes = new Set(["hook", "build", "demo", "fail", "next", "end"]);
  return raw.map((l, i) => {
    if (
      typeof l.ko !== "string" ||
      typeof l.en !== "string" ||
      !scenes.has(l.scene)
    ) {
      throw new Error(`lines[${i}] 형식 오류`);
    }
    // 키워드는 문장에 실제로 있는 토큰만 남긴다 — 자막 강조 매칭이 어긋나지 않게
    const koTokens = new Set(l.ko.split(/\s+/));
    const enTokens = new Set(l.en.split(/\s+/));
    return {
      scene: l.scene,
      ko: l.ko,
      en: l.en,
      keywords: (Array.isArray(l.keywords) ? l.keywords : [])
        .filter((k: unknown): k is string => typeof k === "string")
        .filter((k: string) => koTokens.has(k))
        .slice(0, 3),
      keywordsEn: (Array.isArray(l.keywordsEn) ? l.keywordsEn : [])
        .filter((k: unknown): k is string => typeof k === "string")
        .filter((k: string) => enTokens.has(k))
        .slice(0, 3),
    };
  });
}

/** 이 레포의 몇 번째 데브로그인지 (DAY NN) */
function dayNumber(repo: string, date: string): number {
  const dir = path.join(process.cwd(), "content", "devlog", repo);
  if (!fs.existsSync(dir)) return 1;
  const dates = fs
    .readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.mdx?$/.test(f))
    .map((f) => f.slice(0, 10))
    .sort();
  const idx = dates.indexOf(date);
  return (idx === -1 ? dates.length : idx) + 1;
}

function getProjectMeta(repo: string): ProjectMeta {
  try {
    const projects: ProjectMeta[] = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "content", "projects.json"), "utf8"),
    );
    return projects.find((p) => p.slug === repo) ?? { slug: repo };
  } catch {
    return { slug: repo };
  }
}

export async function generateScript(
  repo: string,
  date: string,
): Promise<ShortsScript> {
  const devlogFile = path.join(
    process.cwd(),
    "content",
    "devlog",
    repo,
    `${date}.md`,
  );
  if (!fs.existsSync(devlogFile)) {
    throw new Error(`데브로그가 없습니다: ${devlogFile}`);
  }
  const { data, content } = matter(fs.readFileSync(devlogFile, "utf8"));
  const meta = getProjectMeta(repo);
  const demoUrl = meta.homepage ?? "";

  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          `레포: ${repo}`,
          `날짜: ${date}`,
          `배포 URL: ${demoUrl || "(없음 — demo 장면에서는 화면 이야기를 짧게)"}`,
          `데브로그 제목: ${data.title ?? ""}`,
          "데브로그 본문:",
          content,
        ].join("\n\n"),
      },
    ],
  });
  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  const parsed = parseJson(text);

  const template = (["ship-it", "fail", "before-after"] as const).includes(
    parsed.template as ShortsTemplate,
  )
    ? (parsed.template as ShortsTemplate)
    : "ship-it";

  const failCard =
    parsed.failCard &&
    typeof (parsed.failCard as Record<string, unknown>).title === "string"
      ? (parsed.failCard as ShortsScript["failCard"])
      : undefined;

  const captions = (parsed.captions ?? {}) as Record<string, unknown>;

  const script: ShortsScript = {
    template,
    repo,
    date,
    day: dayNumber(repo, date),
    lines: validateLines(parsed.lines),
    demo: { url: demoUrl, steps: [] },
    ...(failCard ? { failCard } : {}),
    handle: demoUrl.replace(/^https?:\/\//, "").replace(/\/$/, "") || repo,
    captions: {
      ko: typeof captions.ko === "string" ? captions.ko : "",
      en: typeof captions.en === "string" ? captions.en : "",
    },
    hashtags: (Array.isArray(parsed.hashtags) ? parsed.hashtags : [])
      .filter((h: unknown): h is string => typeof h === "string")
      .slice(0, 8),
  };

  const out = path.join(process.cwd(), shortsJsonPath(repo, date));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(script, null, 2) + "\n");
  return script;
}

if (process.argv[1]?.endsWith("script.ts")) {
  const [repo, date] = process.argv.slice(2);
  if (!repo || !date) {
    console.error("사용: npx tsx scripts/script.ts <repo> <date>");
    process.exit(1);
  }
  generateScript(repo, date)
    .then((s) =>
      console.log(
        `${shortsJsonPath(repo, date)} 생성 — template ${s.template}, ${s.lines.length}문장`,
      ),
    )
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
