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
  MUSIC_MOODS,
  SHORTS_THEMES,
  shortsJsonPath,
  type ShortsLine,
  type ShortsScript,
  type ShortsTemplate,
} from "./shorts-types";

const MODEL = "claude-opus-5";

const SYSTEM = `당신은 "vibelog" 쇼츠(30~45초 세로 영상)의 대본 작가입니다.
데브로그 한 편을 받아 내레이션 대본을 씁니다. 개발자 본인이 담백하게 말하는 존댓말입니다.

**한 편에 이야기 하나.** 그날 한 일을 전부 나열하지 않는다. 가장 재미있는
것 하나(제일 큰 삽질, 또는 제일 신기한 변화)만 골라 그 이야기만 한다.
나머지는 과감히 버린다 — 어차피 블로그 글에 다 있다.
이야기 구조: "이런 게 되면 좋겠는데(문제) → 이렇게 됐다(해결) → 직접 보세요(데모)".
중학생이 들어도 따라올 수 있는 말로. 비유는 한 문장으로 끝나는 것 하나만 —
여러 문장에 걸쳐 소품이 늘어나는 비유(가게→명함처럼)는 금지, 직설이 낫다.
**데브로그가 쓴 비유·작명을 이어받지 않는다.** 원문이 자동화를 "기계",
"장치"라 불렀어도 대본은 실제 행위로 직설한다 ("밤마다 자동으로 글이
올라갑니다"). "밤 발행" 같은 압축 조어도 입말로 푼다 — 내레이션은
소리 내어 말했을 때 자연스러워야 한다.

구조(scene 순서)는 template이 정한다 — 매편 같은 구성이면 채널이 단조로워진다:
- "ship-it" (만든 것·배포가 그날의 이야기): hook(강한 첫 마디) → build(뭘 만들었나)
  → demo(화면을 보여주며) → fail(삽질) → next(다음 할 것) → end(마무리 한 마디)
- "fail" (삽질이 그날의 이야기): hook(사고 선언 — 무엇이 어떻게 터졌나) → fail(원인)
  → build(어떻게 고쳤나) → demo(멀쩡해진 화면 증명) → next → end
- "before-after" (어제와 오늘의 차이가 또렷한 날): hook(어제의 문제 한 마디)
  → build(오늘 바뀐 것) → demo(달라진 화면) → fail → next → end.
  문장을 더 짧게 — 화면이 말하게 한다.
장면당 1~2문장. 전체 8~10문장, 말했을 때 30~40초 분량 (상한 45초 — 넘길 바엔 문장을 뺀다).
문장은 짧게 — 화면 자막 두 줄(공백 포함 ~24자)을 넘기지 않는다.
**hook 문장은 그보다 더 짧게 — 공백 포함 20자 안팎.** 훅은 화면 가득 큰
헤드라인으로 뜬다: 길면 글자 벽이 된다. "어제까지는", "사실은" 같은 배경
설명을 앞에 붙이지 말고 사건을 바로 친다 ("같은 날 작업을 두 번 돌리면
그날 글이 사라졌습니다" 대신 "글이 통째로 사라졌습니다").
단, 짧게 하려고 뜻을 흐리면 더 나쁘다 — 훅만 읽어도 무슨 일이 났는지
통해야 한다. 주어를 지우거나 압축 조어("글 증발 사건")로 알 수 없는
말을 만들지 말 것. 20자에 안 들어가면 뜻이 통하는 25자가 낫다.
**채널 소개를 반복하지 않는다.** "이 블로그의 글은 사람이 쓰지 않는다"
같은 채널 컨셉 설명은 별도 인트로 영상이 이미 한다 — 첫 에피소드라도
훅은 그날의 사건("첫 자동 실행이 안 됐습니다")으로 시작한다.

규칙:
- **시청자는 개발자가 아닐 수 있다.** 전문용어는 편당 두세 개 이하로만 쓰고,
  쓸 때는 짧게 풀어 말한다. 파일명·함수명은 입에 올리지 않는다.
- 숫자는 아라비아 숫자로, 단위와 함께 쓴다: "52초", "커밋 16개", "화면 5개".
  금지하는 것은 두 가지뿐 — ① "5화면"처럼 단위 없이 숫자를 명사에 붙이는
  축약, ② "쉰두 초", "다섯 화면"처럼 숫자를 한글 수사로 풀어 쓰는 것.
  모든 문장은 소리 내어 읽었을 때 자연스러운 말이어야 한다 (내레이션이 된다).
- 데브로그에 없는 사실을 지어내지 않는다. 과장·이모지 금지.
- stat: 문장에 이야기의 핵심이 되는 숫자가 있으면 그 문장에만 stat으로 숫자+단위를
  적는다 (예: "16개", "52초", "11시"). 문장에 실제로 등장하는 표기 그대로.
  statEn은 같은 값을 영어로, 화면에 단독으로 떠도 자연스러운 표기로 적는다
  ("16 commits", "36 seconds"). 문장이 "36-second video"처럼 하이픈 수식어라도
  카운터 단독 표기는 복수 명사형 — 하이픈 형태를 그대로 옮기지 않는다.
  편당 최대 2문장 — 곁가지 숫자엔 붙이지 않는다. 없으면 생략.
  hook 장면 문장에는 붙이지 않는다 — 카운터가 헤드라인과 겹친다.
  날짜("9월 9일")는 stat이 아니다 — 세거나 잴 수 있는 양·시간·횟수만.
- keywords: 각 ko 문장에서 강조할 곳 1~3개. 문장에 실제로 등장하는 단어(공백 단위
  토큰) 또는 연속된 단어 구("두 번", "밤 11시에")와 정확히 일치해야 한다.
  의미 단위를 통째로 — "두 번"에서 "번"만 강조하면 어색하다. keywordsEn도 en 문장에 대해 동일.
- en은 같은 내용의 자연스러운 영어. 존댓말 뉘앙스는 평서체로.
  en 훅도 같은 규칙 — 짧게(6~9단어 안팎), 배경 설명 없이 사건부터, 뜻은 통하게.
- template: 위 셋 중 이야기에 맞는 것을 고른다. 이웃 편(직전·다음)과 같은
  템플릿은 이야기가 강하게 요구할 때만 — 애매하면 이웃과 다른 것을 골라
  구성을 돌린다. 나란히 놓였을 때 같은 배지가 연달아 보이면 안 된다.
  "fail"과 "before-after"는 failCard가 콜드오픈 재료가 되므로 반드시 failCard를 채운다.
- music: 이야기의 분위기에 맞는 배경음악 톤 하나 — "ship-it"(기본, 담담한 전진),
  "upbeat"(배포·성공으로 기분 좋은 날), "tense"(큰 삽질과 씨름한 날),
  "calm"(문서·정리처럼 잔잔한 날), "playful"(실험·장난기 있는 날) 중에서 고른다.
- fail 장면이 있으면 failCard도 채운다: before(문제 상황 한 줄), after(해결 한 줄),
  title(카드 제목, 짧게 — 단 짧게 하려고 조어를 만들지 않는다. "글 증발" 금지,
  "글이 사라졌다"처럼 짧아도 자연스러운 구로). 각각의 영어판 beforeEn·afterEn·titleEn도 반드시 채운다 — 영문 영상에 그대로 표시된다.
- captions: 유튜브/인스타 설명문 (ko/en 각 1~2문장 + 줄바꿈 없이).
- hashtags: 5~8개, # 포함, 한국어·영어 섞어서.
- art: next 문장에만, 그 장면을 은유하는 일러스트를 영어 한 문장으로
  묘사한다 (예: "a tiny robot stacking glowing building blocks into a tower").
  구체적 사물 하나 중심, 은유는 문장 내용에서. 글자·로고·UI 스크린샷 묘사 금지.
  hook 등 다른 장면에는 art를 쓰지 않는다.

반드시 아래 JSON 하나만 출력 (코드펜스 없이):
{"template":"ship-it","music":"ship-it","lines":[{"scene":"hook","ko":"...","en":"...","keywords":["..."],"keywordsEn":["..."],"stat":"16개","art":"..."}],
 "failCard":{"title":"...","titleEn":"...","before":"...","after":"...","beforeEn":"...","afterEn":"..."},
 "captions":{"ko":"...","en":"..."},"hashtags":["#..."]}`;

interface ProjectMeta {
  slug: string;
  homepage?: string;
  /** 레포가 vibelog.json으로 고른 쇼츠 테마 */
  theme?: string;
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
    // 키워드는 문장에 실제로 있는 것만 남긴다 — 자막 강조 매칭이 어긋나지 않게.
    // "두 번" 같은 연속된 단어 구도 허용 (한 단어만 허용하면 "번"만 켜진다).
    // 비교는 양끝 문장부호를 떼고 — "never started"가 문장 끝 "started."와
    // 못 맞아 통째로 걸러졌다 (영문 훅 하이라이트 누락, Jessi 지적).
    // video/src/theme.ts의 stripPunct와 같은 규칙.
    const strip = (w: string): string =>
      w.replace(/^[.,!?…:;"'“”‘’()[\]]+|[.,!?…:;"'“”‘’()[\]]+$/g, "");
    const koTokens = l.ko.split(/\s+/).map(strip);
    const enTokens = l.en.split(/\s+/).map(strip);
    const inSentence = (tokens: string[]) => (k: string): boolean => {
      const toks = k.split(/\s+/).map(strip).filter(Boolean);
      if (!toks.length) return false;
      for (let i = 0; i + toks.length <= tokens.length; i++) {
        if (toks.every((tok, j) => tokens[i + j] === tok)) return true;
      }
      return false;
    };
    return {
      scene: l.scene,
      ko: l.ko,
      en: l.en,
      keywords: (Array.isArray(l.keywords) ? l.keywords : [])
        .filter((k: unknown): k is string => typeof k === "string")
        .filter(inSentence(koTokens))
        .slice(0, 3),
      keywordsEn: (Array.isArray(l.keywordsEn) ? l.keywordsEn : [])
        .filter((k: unknown): k is string => typeof k === "string")
        .filter(inSentence(enTokens))
        .slice(0, 3),
      // +알파 그래픽용 장면 은유 묘사 — 여기서 떨어뜨리면 art.ts가 만들 게 없다
      ...(typeof l.art === "string" && l.art.trim() ? { art: l.art.trim() } : {}),
      // 숫자 모먼트 — 숫자가 없는 stat은 카운터를 만들 수 없다
      ...(typeof l.stat === "string" && /\d/.test(l.stat) ? { stat: l.stat } : {}),
      ...(typeof l.statEn === "string" && /\d/.test(l.statEn)
        ? { statEn: l.statEn }
        : {}),
    };
  });
}

/**
 * 이웃 편들이 쓴 템플릿 — 로테이션 재료. 같은 레포의 직전 편과 다음 편
 * 대본 JSON에서 읽는다. 다음 편까지 보는 이유: 지난 날짜를 나중에 다시
 * 생성하면(regen) "직전만 회피"로는 이미 발행된 다음 편과 겹칠 수 있다
 * (9/9·9/10이 나란히 같은 템플릿이 된 사고).
 */
function neighborTemplates(
  repo: string,
  date: string,
): { prev: string | null; next: string | null } {
  const dir = path.join(process.cwd(), "content", "shorts", repo);
  if (!fs.existsSync(dir)) return { prev: null, next: null };
  const dates = fs
    .readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => f.slice(0, 10))
    .sort();
  const read = (d: string | undefined): string | null => {
    if (!d) return null;
    try {
      const s = JSON.parse(fs.readFileSync(path.join(dir, `${d}.json`), "utf8"));
      return typeof s.template === "string" ? s.template : null;
    } catch {
      return null;
    }
  };
  return {
    prev: read(dates.filter((d) => d < date).pop()),
    next: read(dates.find((d) => d > date)),
  };
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
  // 레포가 고른 테마 — 알 수 없는 값은 기본(terminal)으로
  const theme = SHORTS_THEMES.includes(meta.theme as (typeof SHORTS_THEMES)[number])
    ? (meta.theme as string)
    : "terminal";

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
          (() => {
            const n = neighborTemplates(repo, date);
            return `이웃 편 템플릿 — 직전: ${n.prev ?? "(없음)"}, 다음: ${n.next ?? "(없음)"}`;
          })(),
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

  const music = MUSIC_MOODS.includes(parsed.music as (typeof MUSIC_MOODS)[number])
    ? (parsed.music as string)
    : "ship-it";

  const failCard =
    parsed.failCard &&
    typeof (parsed.failCard as Record<string, unknown>).title === "string"
      ? (parsed.failCard as ShortsScript["failCard"])
      : undefined;

  const captions = (parsed.captions ?? {}) as Record<string, unknown>;

  // 커밋 콜드오픈 재료 — 데브로그 frontmatter의 shas/shasEn을 그대로 싣는다.
  // 대본이 아니라 원료에서 오므로 LLM 출력 검증이 필요 없다.
  const shaPairs = (raw: unknown): [string, string][] =>
    (Array.isArray(raw) ? raw : []).filter(
      (p): p is [string, string] =>
        Array.isArray(p) &&
        typeof p[0] === "string" &&
        typeof p[1] === "string",
    );
  const commits = shaPairs(data.shas);
  const commitsEn = shaPairs(data.shasEn);
  const commitCount =
    typeof data.commits === "number" && data.commits > 0 ? data.commits : 0;

  const script: ShortsScript = {
    template,
    music,
    theme,
    repo,
    date,
    day: dayNumber(repo, date),
    lines: validateLines(parsed.lines),
    demo: { url: demoUrl, steps: [] },
    ...(failCard ? { failCard } : {}),
    ...(commits.length ? { commits } : {}),
    ...(commitsEn.length ? { commitsEn } : {}),
    ...(commitCount ? { commitCount } : {}),
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
