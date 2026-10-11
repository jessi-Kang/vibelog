/**
 * intro.ts — 프로젝트 소개 글. 레포의 **코드**를 읽고 "무엇을 만드는 프로젝트인가"를 쓴다.
 *
 * 새 프로젝트의 첫 글이 "그날 한 일"로 시작하면, 처음 들어온 사람은 그 프로젝트가
 * 무엇인지 모른 채 읽게 된다 (Anchor 첫 글은 끝까지 Anchor가 무엇인지 말하지 않았다).
 * 레포 설명 한 줄로는 부족해서(Jessi, 10/11) 코드를 읽는다.
 *
 * 같은 호출에서 세 가지를 같이 얻는다 — 모델 호출이 늘지 않는다.
 * - 소개 글: 그 프로젝트의 첫 글 (frontmatter intro: true)
 * - 서비스 이름: 레포 이름과 다른 실제 이름 ("lie-detective" → "거짓말 탐정")
 * - 프로젝트 설명 한두 문장: 이후 모든 글 제목 아래에 붙고, 누르면 소개 글로 간다
 *
 * 판단할 코드가 없으면 미룬다. README·설정 파일뿐이면 모델을 부르지 않고, 코드가 있어도
 * 모델이 "무엇을 만드는지 모르겠다"고 하면 그 레포가 새로 푸시될 때까지 다시 묻지 않는다.
 * 프로젝트를 시작하는 시점에는 보여 줄 화면이 없을 수 있어서, 그림도 화면 캡처가 아니라
 * 코드에서 읽은 구조를 그린다 (docs/project-intro-figures.html B안).
 *
 * 밤 실행(run.ts)이 소개 글이 없는 프로젝트마다 부른다. 단독 실행은 지금 있는 프로젝트에
 * 소개 글을 바로 붙일 때 쓴다 (Run workflow의 `intro` 입력):
 *   npx tsx scripts/intro.ts all          # 소개 글이 없는 프로젝트 전부
 *   npx tsx scripts/intro.ts apart,Anchor # 이 둘만
 *   npx tsx scripts/intro.ts icons        # 소개 글은 있는데 아이콘이 없는 프로젝트에 아이콘만
 *   npx tsx scripts/intro.ts redo         # 이미 있는 소개 글을 지금 지시문으로 같은 날짜에 다시 쓴다
 */
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import matter from "gray-matter";
import { Octokit } from "@octokit/rest";
import { streamMessage } from "./models";
import { noteUsage, takeUsage, fmtTally } from "./usage";
import { askReader, mergeUnclear, styleUnclear, type Unclear } from "./readability";
import { CORE_TERMS_RULE, CORE_TERMS_REVIEW, styleRulesForPrompt } from "./korean-style";
import { checkSafety, maskSecrets, SafetyBlockError } from "./safety";
import { generateFigures } from "./figures";
import { getOwner } from "./collect";
import { parseSections } from "../lib/content";
import { pickIcon } from "./icons";
import type { ProjectIcon } from "../lib/project-icon";

const MODEL = "claude-opus-5-5";
const MAX_TOKENS = 32000;
const DEVLOG_DIR = path.join(process.cwd(), "content", "devlog");
const PROJECTS_FILE = path.join(process.cwd(), "content", "projects.json");

/* ---------- 코드 읽기 ---------- */

/**
 * 읽지 않는 경로 — 남이 만든 코드, 빌드 결과, 그림·글꼴 같은 바이너리. 점으로 시작하는
 * 폴더(.claude, .github …)는 도구 설정이고 docs/는 시안·문서라 무엇을 만드는지와 다르다 —
 * vibelog로 시험했을 때 .claude 안의 시안 index.html이 맨 먼저 읽혔다.
 */
const SKIP_DIR = /(^|\/)(node_modules|dist|build|out|coverage|vendor|docs|\.[^/]+)\//;
const SKIP_FILE =
  /(^|\/)(\.env[^/]*|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?)$|\.(png|jpe?g|gif|webp|avif|ico|svg|woff2?|ttf|otf|mp3|mp4|webm|mov|pdf|zip|map)$|\.min\.(js|css)$/i;
const CODE_EXT = /\.(tsx?|jsx?|mjs|cjs|py|html?|css|scss|vue|svelte|astro|go|rs|swift|kt|java|rb|php|sql|prisma|dart|cs|c|cpp|h)$/i;
/** 설정 파일은 코드 확장자여도 "무엇을 만드는지"를 말해 주지 않는다 */
const CONFIG_FILE =
  /(^|\/)((next|vite|tailwind|postcss|eslint|prettier|jest|vitest|babel|webpack|svelte|astro|remotion)\.config\.[a-z]+|tsconfig[^/]*\.json|\.eslintrc[^/]*|next-env\.d\.ts)$/i;
/** 이만큼은 코드가 있어야 무엇을 만드는지 판단할 수 있다 — README·설정만 있는 레포는 여기서 멈춘다 */
const MIN_CODE_BYTES = 1500;
/**
 * 읽는 양 — 개요를 쓰는 데는 README와 화면의 입구 몇 개면 된다. 6만 자를 읽히던 때는 글이
 * 기능·화면·내부 동작을 늘어놓았다 (10/11). 많이 읽힐수록 많이 쓴다.
 */
const PER_FILE_CHARS = 5000;
const TOTAL_CHARS = 20000;

/** 먼저 읽을 파일 — 사람이 보는 이름·화면이 있는 자리 */
const FIRST = [
  /(^|\/)index\.html?$/i,
  /(^|\/)(app|src\/app)\/layout\.[jt]sx?$/,
  /(^|\/)(app|src\/app)\/page\.[jt]sx?$/,
  /(^|\/)(app|src\/app)\/manifest\.[jt]s$/,
  /(^|\/)(public\/)?(manifest\.json|site\.webmanifest|manifest\.webmanifest)$/,
  /(^|\/)pages\/(index|_app)\.[jt]sx?$/,
  /(^|\/)src\/(App|main|index)\.[jt]sx?$/,
];

export interface CodeMaterial {
  repo: string;
  description: string;
  tree: string[];
  files: { path: string; text: string }[];
  /** 설정 파일을 뺀 코드 파일의 크기 합 */
  codeBytes: number;
}

function codeRank(p: string): number {
  const i = FIRST.findIndex((re) => re.test(p));
  if (i !== -1) return i;
  // 화면·서버 코드가 있는 자리를 먼저, 테스트·스크립트는 뒤로
  if (/(^|\/)(app|pages|src|components|lib|server|api)\//.test(p)) return 20 + p.split("/").length;
  if (/(test|spec|__tests__|e2e|scripts?)\//i.test(p)) return 80;
  return 50 + p.split("/").length;
}

/**
 * 그 날짜(KST)가 끝날 때의 레포 — 나중에 넣는 소개 글도 그 시점의 코드로 쓴다. 그때 레포가
 * 아직 없었으면 첫 커밋. 날짜가 없으면 지금(새 프로젝트는 등록한 그 밤이 곧 그 시점이다).
 */
async function treeAt(octokit: Octokit, owner: string, repo: string, branch: string, at?: string): Promise<string> {
  if (!at) return branch;
  const { data } = await octokit.rest.repos.listCommits({ owner, repo, sha: branch, until: `${at}T23:59:59+09:00`, per_page: 1 });
  if (data[0]) return data[0].commit.tree.sha;
  const all = await octokit.paginate(octokit.rest.repos.listCommits, { owner, repo, sha: branch, per_page: 100 });
  return all.at(-1)?.commit.tree.sha ?? branch;
}

export async function gatherCode(
  octokit: Octokit,
  owner: string,
  repo: string,
  description: string,
  /** 이 날짜가 끝날 때의 코드를 읽는다 (나중에 넣는 소개 글) */
  at?: string,
): Promise<CodeMaterial> {
  const { data: meta } = await octokit.rest.repos.get({ owner, repo });
  const { data: tree } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: await treeAt(octokit, owner, repo, meta.default_branch, at),
    recursive: "true",
  });
  const blobs = tree.tree.filter(
    (t) => t.type === "blob" && t.path && !SKIP_DIR.test(t.path) && !SKIP_FILE.test(t.path),
  );
  const code = blobs.filter((t) => CODE_EXT.test(t.path!) && !CONFIG_FILE.test(t.path!));
  const codeBytes = code.reduce((n, t) => n + (t.size ?? 0), 0);

  const readme = blobs.find((t) => /^readme(\.[a-z]+)?$/i.test(t.path!));
  const pkg = blobs.find((t) => t.path === "package.json");
  const pick = [
    ...(readme ? [readme] : []),
    ...(pkg ? [pkg] : []),
    ...[...code].sort((a, b) => codeRank(a.path!) - codeRank(b.path!) || (a.size ?? 0) - (b.size ?? 0)),
  ];
  const files: { path: string; text: string }[] = [];
  let total = 0;
  for (const t of pick) {
    if (total >= TOTAL_CHARS) break;
    try {
      const { data } = await octokit.rest.git.getBlob({ owner, repo, file_sha: t.sha! });
      let text = Buffer.from(data.content, "base64").toString("utf8");
      if (t.path === "package.json") {
        // 이름·설명·쓰는 라이브러리만 — 나머지는 무엇을 만드는지와 상관없다
        try {
          const j = JSON.parse(text);
          text = JSON.stringify(
            { name: j.name, description: j.description, dependencies: Object.keys(j.dependencies ?? {}) },
            null,
            1,
          );
        } catch {
          // 깨진 package.json은 그대로 읽는다
        }
      }
      text = maskSecrets(text).slice(0, Math.min(PER_FILE_CHARS, TOTAL_CHARS - total));
      files.push({ path: t.path!, text });
      total += text.length;
    } catch {
      // 못 읽은 파일은 건너뛴다
    }
  }
  return {
    repo,
    description,
    tree: blobs.map((t) => t.path!).slice(0, 400),
    files,
    codeBytes,
  };
}

/** 모델을 부르기 전에 — 판단할 코드가 있는가 */
export function enoughCode(m: CodeMaterial): boolean {
  return m.codeBytes >= MIN_CODE_BYTES;
}

/* ---------- 소개 글 쓰기 ---------- */

const SYSTEM = `당신은 "vibelog"의 데브로그 작성자입니다. vibelog는 바이브 코딩(AI와 같이 코딩하는
방식)으로 만드는 프로젝트들의 제작기를 매일 밤 저절로 올리는 블로그입니다. 지금은 한
프로젝트의 **소개 글**을 씁니다 — 이 프로젝트의 첫 글이고, 이후의 모든 글이 이 글로 이어집니다.

## 이 글이 쓰이는 때
프로젝트를 블로그에 등록한 **직후**, 무엇을 만드는지 판단할 코드가 처음 올라온 밤에 씁니다.
받은 코드는 **그 시점의 레포**입니다. 대개 막 시작한 상태라 만들어 둔 것이 거의 없습니다.
그 시점의 사람이 "이런 걸 만들려고 합니다"라고 소개하는 글입니다. 진행 상황(시험판인지,
어디까지 됐는지), 만든 기능, 남은 일은 쓰지 않습니다 — 그건 이후의 하루 글이 매일 이야기합니다.

## 판단할 수 없으면 쓰지 않습니다
코드가 템플릿 그대로이거나(새 프로젝트 기본 화면, 예제 코드) 무엇을 만드는지 알 수 없으면
글을 쓰지 말고 {"ready": false, "why": "한 문장"}만 냅니다. 억지로 쓴 소개는 소개가 없는 것보다 나쁩니다.

## 공개하지 않는 것
이 글은 누구나 읽는 공개 블로그에 사람이 읽기 전에 올라갑니다. 코드에서 보았더라도 아래는 쓰지 않습니다.
- 게임·퀴즈의 정답, 사건의 진상, 인물의 비밀, 문제를 푸는 방법 — 쓰면 그 프로젝트가 망가집니다.
- 내부 동작 방식(데이터가 어디에 있는지, 어떤 규칙으로 답하는지, 어떤 AI를 어떻게 부르는지).
- 보안상 약점이나 아직 막지 않은 부분, 접속 방법·토큰·관리 화면.
- 공개 전 계획, 일정, 시험 방법.
- 사이트 주소(URL). 코드에 있어도 옮기지 않습니다.
알 수 있는 것은 "무엇을 하는 것인지"까지입니다. 이 프로젝트를 쓸 사람이 가게 앞 간판을 보고 아는 정도만 씁니다.

## 이 글을 읽는 사람
개발을 모르는 사람이 이 프로젝트를 처음 봅니다.
${CORE_TERMS_RULE}
- 파일 이름·함수 이름·폴더 구조는 쓰지 않습니다.
- 말하는 사람은 만든 사람 한 명("저")입니다. 존댓말로 씁니다.
- 개념에 짧은 이름을 새로 붙이지 않고, 명사를 이어 붙여 줄임말을 만들지 않습니다. 조사를 살려
  관계를 밝힙니다 ("글 맨 아래에 있는 링크" ○ / "글 끝 링크" ✗).
- 어색한 표현 목록 — 아래 말투는 쓰지 않습니다:
${styleRulesForPrompt()}

## 서비스 이름
레포 이름과 실제 서비스 이름은 다를 수 있습니다. 사용하는 사람이 실제로 보는 자리 — 페이지
<title>, 앱 manifest의 name, 첫 화면 헤더나 로고 글자 — 에서 이름을 찾아 name(한국어)과
nameEn(영어)에 넣습니다. 한쪽만 있으면 다른 쪽은 그 이름을 그대로 씁니다. 찾지 못했으면
둘 다 null입니다 — 레포 이름을 다듬어 지어내지 않습니다. nameFrom에는 찾은 자리를 짧게 적습니다.

## 프로젝트 설명 (about)
이후의 모든 글 제목 아래에 붙는 한 문장입니다. "<서비스 이름>은(는) …입니다."로 무엇을 하는
것인지만 말합니다. 60자 안팎. 위 "공개하지 않는 것"을 똑같이 지킵니다.

## 아이콘 (icons)
이 프로젝트가 **무엇인지** 보여 주는 Tabler 아이콘(tabler-icons.io) 이름 후보를 3–5개, 좋은
순서로 냅니다 (예: 추리 게임 → ["spy", "search"], 아파트 퀴즈 → ["building-community", "buildings"]).
영어 소문자와 하이픈만. 기술 스택이 아니라 사용하는 사람이 보는 것을 고릅니다.

## 글 — 개요만
- title: "…를 만들고 있습니다"처럼 무엇을 만드는지만 드러나는 한 문장.
- ko: 아래 두 섹션의 마크다운. 전체 200–350자. 목록(-) 없이 문단으로 씁니다.
  "## 어떤 프로젝트인가" — 첫 문장은 25–45자로 무엇인지 한 문장. 글 목록의 요약으로 그대로
    쓰입니다. 이어서 사용하는 사람이 이것으로 무엇을 하게 되는지 한 문장.
  "## 누구를 위해, 왜" — 누가 어떤 불편이나 재미 때문에 쓰게 되는지, 왜 만들기 시작했는지.
    README에 적힌 만큼만 쓰고, 없으면 무엇을 만드는지에서 자연스럽게 읽히는 만큼 한두 문장.
- en: 같은 구조의 영어 — "## What it is", "## Who it's for, and why".

반드시 아래 JSON 하나만 출력합니다 (코드펜스 없이):
{"ready": true, "name": "서비스 이름 또는 null", "nameEn": "Service name or null", "nameFrom": "찾은 자리", "icons": ["후보", "후보", "후보"],
 "about": "한 문장", "aboutEn": "one sentence", "title": "한국어 제목", "titleEn": "English title",
 "ko": "한국어 마크다운", "en": "English markdown"}`;

const REVIEW_SYSTEM = `당신은 개발을 전혀 모르는 독자입니다. 처음 보는 프로젝트의 소개 글을 읽습니다.
읽다가 멈추게 되는 문장만 고릅니다 — 뜻을 모르는 말(설명 없는 기술 용어, 내부에서만 쓰는 이름,
붙여 만든 말), 무엇을 가리키는지 모르는 말, 한 번 읽어서는 안 들어오는 문장.
${CORE_TERMS_REVIEW}
막힌 문장이 없으면 빈 배열을 냅니다. JSON 배열 하나만 출력합니다:
[{"sentence": "막힌 문장 그대로", "why": "왜 막혔는지 한 문장"}]`;

export interface Intro {
  name: string | null;
  nameEn: string | null;
  nameFrom: string;
  /** Tabler 세트에서 찾은 아이콘 — 후보가 하나도 없으면 null */
  icon: ProjectIcon | null;
  about: string;
  aboutEn: string;
  title: string;
  titleEn: string;
  ko: string;
  en: string;
}

export type IntroResult =
  | { status: "written"; intro: Intro; reviewed: { before: number; rewritten: boolean } }
  | { status: "deferred"; why: string };

function buildPrompt(m: CodeMaterial): string {
  return [
    `레포 이름: ${m.repo}`,
    `레포 한 줄 설명(만든 사람이 GitHub에 적은 것 — 참고만): ${m.description || "(없음)"}`,
    "## 파일 목록",
    m.tree.join("\n"),
    "## 코드 (앞부분만 — 비밀처럼 생긴 값은 [가린 값]으로 바꿔 두었습니다)",
    ...m.files.map((f) => `### ${f.path}\n${f.text}`),
  ].join("\n\n");
}

function textOf(r: Anthropic.Messages.Message): string {
  return r.content.filter((b) => b.type === "text").map((b) => (b as Anthropic.TextBlock).text).join("");
}

export function parseIntro(text: string): Intro | { why: string } {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`소개 글 JSON을 찾지 못했습니다: ${text.slice(0, 120)}`);
  const j = JSON.parse(cleaned.slice(start, end + 1));
  if (j.ready === false) return { why: typeof j.why === "string" ? j.why : "무엇을 만드는지 아직 알 수 없습니다" };
  for (const k of ["about", "aboutEn", "title", "titleEn", "ko", "en"] as const) {
    if (typeof j[k] !== "string" || !j[k].trim()) throw new Error(`소개 글 JSON에 ${k}가 없습니다`);
  }
  const nm = (v: unknown) => (typeof v === "string" && v.trim() && v.trim() !== "null" ? v.trim().slice(0, 40) : null);
  return {
    name: nm(j.name),
    nameEn: nm(j.nameEn),
    nameFrom: typeof j.nameFrom === "string" ? j.nameFrom.slice(0, 80) : "",
    icon: pickIcon(j.icons),
    about: j.about.trim(),
    aboutEn: j.aboutEn.trim(),
    title: j.title.trim(),
    titleEn: j.titleEn.trim(),
    ko: j.ko.trim(),
    en: j.en.trim(),
  };
}

/**
 * 소개 글을 쓴다. 쓰고 나서 처음 읽는 독자 역할의 모델이 한 번 읽고, 막힌 문장이나
 * 어색한 표현이 있으면 **한 번** 다시 쓴다 (generate.ts와 같은 구조).
 */
export async function writeIntro(m: CodeMaterial): Promise<IntroResult> {
  const client = new Anthropic();
  const system = [{ type: "text" as const, text: SYSTEM, cache_control: { type: "ephemeral" as const } }];
  const prompt = buildPrompt(m);
  const first = await streamMessage(client, {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  noteUsage("intro", first.usage);
  if (first.stop_reason === "max_tokens") throw new Error(`소개 글 답이 ${MAX_TOKENS} 토큰 상한에서 잘렸습니다`);
  const firstText = textOf(first);
  const draft = parseIntro(firstText);
  if ("why" in draft) return { status: "deferred", why: draft.why };

  const reviewed = await askReader(REVIEW_SYSTEM, `# ${draft.title}\n\n${draft.ko}`, "review").catch(() => [] as Unclear[]);
  const unclear = mergeUnclear(reviewed, styleUnclear(`${draft.title}\n${draft.about}\n${draft.ko}`));
  if (unclear.length === 0) return { status: "written", intro: draft, reviewed: { before: 0, rewritten: false } };
  // 문장은 로그에 적지 않는다 — 공개 로그이고 안전 검사 전의 원고다
  console.log(`[intro] 막힌 문장 ${unclear.length}개 — 다시 쓴다`);
  try {
    const second = await streamMessage(client, {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: firstText },
        {
          role: "user",
          content: [
            "개발을 모르는 독자가 이 소개 글을 처음 읽다가 아래 문장에서 멈췄습니다.",
            ...unclear.map((u, i) => `${i + 1}. "${u.sentence}"\n   → ${u.why}`),
            "",
            "이 문장들을 고쳐 전체를 다시 내 주세요. 기술 용어는 그대로 두고 처음 나올 때 괄호로 설명을 붙입니다.",
            "코드에 없는 사실을 새로 넣지 않습니다. 같은 JSON 형식 하나만 출력합니다.",
          ].join("\n"),
        },
      ],
    });
    noteUsage("intro", second.usage);
    const fixed = parseIntro(textOf(second));
    if (!("why" in fixed)) return { status: "written", intro: fixed, reviewed: { before: unclear.length, rewritten: true } };
  } catch (err) {
    console.warn(`[intro] 다시 쓰기 실패 — 첫 원고를 냅니다: ${(err as Error).message.slice(0, 120)}`);
  }
  return { status: "written", intro: draft, reviewed: { before: unclear.length, rewritten: false } };
}

/**
 * 소개 글 하나를 그 시점의 코드로 쓴다 — 밤 실행과 단독 실행이 같이 쓴다.
 * 새 프로젝트는 그 밤의 코드로 그 밤 날짜에, 이미 글이 있던 프로젝트(나중에 넣는 예외)는
 * 첫 글 하루 전 날짜에 그날의 코드로 쓴다. 그때 판단할 코드가 없었으면 첫 글 날짜의 코드로 한 번 더.
 * r이 null이면 판단할 코드가 없어 AI를 부르지 않았다.
 */
export async function composeIntro(
  octokit: Octokit,
  owner: string,
  repo: string,
  description: string,
  tonight: string,
  date = introDate(repo, tonight),
): Promise<{ date: string; r: IntroResult | null }> {
  const later = date === tonight ? undefined : date;
  let m = await gatherCode(octokit, owner, repo, description, later);
  let r = enoughCode(m) ? await writeIntro(m) : null;
  if (later && (!r || r.status === "deferred")) {
    const next = new Date(`${later}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    m = await gatherCode(octokit, owner, repo, description, next.toISOString().slice(0, 10));
    r = enoughCode(m) ? await writeIntro(m) : null;
  }
  return { date, r };
}

/* ---------- 파일 쓰기 ---------- */

/** 소개 글 날짜 — 이미 글이 있으면 첫 글 하루 전, 없으면 그 밤 (Jessi 10/11) */
export function introDate(repo: string, tonight: string): string {
  const dir = path.join(DEVLOG_DIR, repo);
  const first = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f)).sort()[0]
    : undefined;
  if (!first) return tonight;
  const d = new Date(`${first.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** 그 프로젝트 소개 글의 날짜 — 없으면 null */
export function introDateOf(repo: string): string | null {
  const dir = path.join(DEVLOG_DIR, repo);
  if (!fs.existsSync(dir)) return null;
  const f = fs
    .readdirSync(dir)
    .filter((x) => /^\d{4}-\d{2}-\d{2}\.md$/.test(x))
    .find((x) => matter(fs.readFileSync(path.join(dir, x), "utf8")).data.intro === true);
  return f ? f.slice(0, 10) : null;
}

export function hasIntro(repo: string): boolean {
  const dir = path.join(DEVLOG_DIR, repo);
  if (!fs.existsSync(dir)) return false;
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
    .some((f) => matter(fs.readFileSync(path.join(dir, f), "utf8")).data.intro === true);
}

export function writeIntroPost(repo: string, date: string, it: Intro): string {
  const file = path.join(DEVLOG_DIR, repo, `${date}.md`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const fm = [
    "---",
    `title: ${JSON.stringify(it.title)}`,
    `titleEn: ${JSON.stringify(it.titleEn)}`,
    `date: "${date}"`,
    `repo: "${repo}"`,
    "intro: true",
    "---",
  ].join("\n");
  fs.writeFileSync(file, `${fm}\n\n${it.ko}\n\n<!-- en -->\n\n${it.en}\n`);
  return file;
}

/**
 * 서비스 이름과 프로젝트 설명을 projects.json에 적는다. 밤 실행의 updateProjects가 이 값을
 * 이어받아 다시 쓴다 (run.ts). 화면 이름은 vibelog.json name이 있으면 그게 이긴다 —
 * 지금 name이 레포 이름이나 예전에 찾은 이름이 아니면 vibelog.json 값이라 두고 간다.
 */
export function saveIntroMeta(repo: string, it: Intro): void {
  const list: Record<string, unknown>[] = JSON.parse(fs.readFileSync(PROJECTS_FILE, "utf8"));
  const p = list.find((x) => x.slug === repo);
  if (!p) return;
  const auto = p.name === repo || p.name === p.serviceName;
  if (it.name) p.serviceName = it.name;
  if (it.nameEn) p.serviceNameEn = it.nameEn;
  if (auto && it.name) {
    p.name = it.name;
    if (it.nameEn) p.nameEn = it.nameEn;
  }
  p.about = it.about;
  p.aboutEn = it.aboutEn;
  if (it.icon) p.icon = it.icon;
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(list, null, 2) + "\n");
}

/** 소개 글은 코드 구조를 설명하는 그림을 붙인다 — 화면 캡처는 하지 않는다 */
export const INTRO_FIGURE_NOTE =
  "이 글은 프로젝트를 처음 시작할 때 쓰는 개요입니다. 이 프로젝트가 무엇인지 한눈에 보이는 그림을 한 장 그립니다 — 사용하는 사람이 무엇을 넣고 무엇을 얻는지 같은 큰 흐름. 기능·화면을 늘어놓거나 화면을 흉내 내지 않고, 본문에 없는 세부 내용을 넣지 않습니다.";

export async function writeIntroFigures(repo: string, date: string, it: Intro): Promise<{ count: number; dropped: string[] }> {
  const ko = parseSections(it.ko);
  const en = parseSections(it.en);
  const { figures, dropped } = await generateFigures(it.title, { ko, en }, INTRO_FIGURE_NOTE);
  const file = path.join(DEVLOG_DIR, repo, `${date}.figures.json`);
  if (figures.length) fs.writeFileSync(file, JSON.stringify(figures, null, 1) + "\n");
  // 다시 쓸 때 그림이 0장이면 예전 그림을 지운다 — 없는 섹션을 가리키는 그림이 남지 않게
  else if (fs.existsSync(file)) fs.unlinkSync(file);
  return { count: figures.length, dropped };
}

/** 쓴 소개 글이 나가도 되는가 — 일반 글과 같은 안전 검사 + live 전 주소가 옮겨지지 않았는가 */
export async function checkIntro(it: Intro, hiddenHost: string | null): Promise<void> {
  const text = [it.title, it.titleEn, it.about, it.aboutEn, it.ko, it.en].join("\n\n");
  const out = await checkSafety(text);
  const flags = [...out.flags];
  if (hiddenHost && text.toLowerCase().includes(hiddenHost.toLowerCase())) flags.push("internal");
  if (flags.length > 0) throw new SafetyBlockError("소개 글", [...new Set(flags)]);
}

/* ---------- 아이콘만 다시 고르기 ---------- */

/**
 * 아이콘이 생기기 전에 쓴 소개 글(10/11의 5편)에 아이콘만 붙인다. 코드를 다시 읽지 않고
 * 소개 글이 쓴 프로젝트 설명만 작은 모델에게 보여 준다 — 아이콘은 "무엇인지"를 보여 주는
 * 것이라 설명이면 충분하다.
 */
async function iconsOnly(): Promise<{ text: string }[]> {
  const list: Record<string, unknown>[] = JSON.parse(fs.readFileSync(PROJECTS_FILE, "utf8"));
  const client = new Anthropic();
  const lines: { text: string }[] = [];
  for (const p of list) {
    if (p.icon || typeof p.about !== "string") continue;
    const res = await client.messages.create({
      model: "claude-sonnet-5-5",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            "아래 프로젝트에 붙일 Tabler 아이콘(tabler-icons.io) 이름 후보를 3–5개, 좋은 순서로 JSON 배열 하나만 내 주세요.",
            "프로젝트가 무엇인지를 사용하는 사람 눈으로 보여 주는 것을 고릅니다. 기술 스택이 아닙니다. 영어 소문자와 하이픈만.",
            `이름: ${String(p.name)}`,
            `설명: ${p.about}`,
          ].join("\n"),
        },
      ],
    });
    const text = res.content.filter((b) => b.type === "text").map((b) => (b as Anthropic.TextBlock).text).join("");
    let cands: unknown = [];
    try {
      cands = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1));
    } catch {
      // 못 읽으면 아이콘 없이 둔다
    }
    const icon = pickIcon(cands);
    if (icon) p.icon = icon;
    console.log(`- ${String(p.slug)}: ${icon?.name ?? "맞는 아이콘 없음"}`);
    lines.push({ text: `icon     · ${String(p.slug)} ${icon ? icon.name.replace("tabler:", "") : "맞는 아이콘 없음"}` });
  }
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(list, null, 2) + "\n");
  return lines;
}

/* ---------- 단독 실행 (Run workflow의 intro 입력) ---------- */

async function main(): Promise<void> {
  const arg = process.argv[2] ?? "";
  if (!arg) {
    console.error("사용: npx tsx scripts/intro.ts all | repo[,repo]");
    process.exit(1);
  }
  if (arg === "icons") {
    const lines = await iconsOnly();
    fs.writeFileSync(
      path.join(process.cwd(), "content", "run.json"),
      JSON.stringify(
        { at: new Date().toISOString(), lines: [{ text: "npx tsx scripts/intro.ts icons", kind: "cmd" }, ...lines] },
        null,
        2,
      ) + "\n",
    );
    return;
  }
  const projects: { slug: string; description?: string; status?: string; homepage?: string }[] = JSON.parse(
    fs.readFileSync(PROJECTS_FILE, "utf8"),
  );
  // redo — 지시문을 바꾼 뒤 이미 쓴 소개 글을 같은 날짜에 다시 쓴다 (10/11: 세부 목록을 빼고 개요만)
  const redo = arg === "redo";
  const targets = redo
    ? projects.filter((p) => hasIntro(p.slug)).map((p) => p.slug)
    : arg === "all"
      ? projects.filter((p) => !hasIntro(p.slug)).map((p) => p.slug)
      : arg.split(",").map((s) => s.trim());
  const octokit = new Octokit({ auth: process.env.GH_PAT || process.env.GITHUB_TOKEN || undefined });
  const owner = await getOwner(octokit);
  const lines: { text: string; textEn?: string; kind?: string }[] = [{ text: `npx tsx scripts/intro.ts ${arg}`, kind: "cmd" }];
  const tonight = new Date(Date.now() + 9 * 3600_000 - 6 * 3600_000).toISOString().slice(0, 10);
  let failed = 0;
  for (const repo of targets) {
    const p = projects.find((x) => x.slug === repo);
    if (!p) {
      console.warn(`- ${repo}: projects.json에 없습니다`);
      continue;
    }
    if (!redo && hasIntro(repo)) {
      console.log(`- ${repo}: 소개 글이 이미 있습니다 — 건너뜀`);
      continue;
    }
    try {
      const { date, r } = await composeIntro(
        octokit, owner, repo, p.description ?? "", tonight,
        (redo ? introDateOf(repo) : null) ?? introDate(repo, tonight),
      );
      if (!r) {
        lines.push({ text: `skip     · ${repo} 판단할 코드가 아직 없어 소개 글을 미룹니다` });
        console.log(`- ${repo}: 판단할 코드가 아직 없음 — 미룸`);
        continue;
      }
      if (r.status === "deferred") {
        lines.push({ text: `skip     · ${repo} 무엇을 만드는지 아직 알 수 없어 소개 글을 미룹니다` });
        // 모델이 적은 이유는 로그에 남기지 않는다 — 공개 로그이고 검사 전의 글이다
        console.log(`- ${repo}: 무엇을 만드는지 아직 알 수 없다는 답 — 미룸`);
        continue;
      }
      // live 전 사이트는 공개 파일에 주소가 없다 — 그 주소가 글에 옮겨졌는지는 실제 주소로 본다
      const { resolveHomepage, isPublicStatus } = await import("./homepage");
      const real = isPublicStatus(p.status) ? null : await resolveHomepage(repo).catch(() => null);
      await checkIntro(r.intro, real ? new URL(real).host : null);
      writeIntroPost(repo, date, r.intro);
      saveIntroMeta(repo, r.intro);
      lines.push({ text: `intro    · ${repo}/${date} 소개 글 · ${fmtTally(takeUsage("intro"))}` });
      console.log(`- ${repo}/${date} 소개 글: ${r.intro.title} (이름: ${r.intro.name ?? "못 찾음"} — ${r.intro.nameFrom})`);
      const f = await writeIntroFigures(repo, date, r.intro);
      lines.push({ text: `figures  · ${repo}/${date} ${f.count}장 · ${fmtTally(takeUsage("figures"))}` });
      for (const why of f.dropped) lines.push({ text: `warn     · ${repo}/${date} 삽화 제외 — ${why}` });
    } catch (err) {
      if (err instanceof SafetyBlockError) {
        lines.push({ text: `block    · ${repo} ${err.message}`, kind: "fail" });
        continue;
      }
      failed++;
      console.error(`- ${repo} 소개 글 실패:`, (err as Error).message);
      lines.push({ text: `intro    · ${repo} 실패`, kind: "fail" });
    }
  }
  lines.push({ text: "publish  · content 커밋 → vercel 자동 배포" });
  fs.writeFileSync(
    path.join(process.cwd(), "content", "run.json"),
    JSON.stringify({ at: new Date().toISOString(), lines }, null, 2) + "\n",
  );
  if (failed > 0) process.exitCode = 1;
}

if (process.argv[1]?.endsWith("intro.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
