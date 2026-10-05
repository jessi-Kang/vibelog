/**
 * korean-style.ts — 읽는 사람이 멈추게 되는 한국어 표현 목록과 찾기 함수.
 *
 * 두 곳이 같이 쓴다.
 * - scripts/check-korean.ts: 문서·커밋 메시지·실행 기록 문구를 커밋 전에 검사한다.
 * - generate.ts·script.ts: 밤에 쓴 글과 대본에서 "강"으로 걸린 문장을 다시 쓰게 한다.
 *
 * 목록은 두 갈래다.
 * 1. 영어를 옮긴 말투 — daleseo/korean-skills humanizer(.claude/skills/humanizer)의
 *    번역투 패턴에서 이 사이트 글에 실제로 나오는 것만 골랐다.
 * 2. 이 레포에서 만든 말 — 개발 개념을 짧은 한국어 이름으로 바꾼 것이 저한테만
 *    통하는 말이 됐다. Jessi가 "한국어인데 무슨 말인지 모르겠다"고 짚은 말들이다
 *    (10/5: 문턱, 손잡이, 거는 문 …).
 *
 * 순수 모듈 — 파일·네트워크 없음.
 */

export type Level = "strong" | "weak";

export interface StyleRule {
  id: string;
  re: RegExp;
  level: Level;
  /** 왜 걸리는지와 어떻게 고치는지 — 사람과 모델이 같이 읽는다 */
  why: string;
}

export const STYLE_RULES: StyleRule[] = [
  // ── 영어를 옮긴 말투 ──
  {
    id: "되어지다",
    re: /되어\s?지|되어진|되어집/g,
    level: "strong",
    why: "피동을 두 번 겹친 말입니다. '된다'로 줄이거나 누가 했는지 주어로 씁니다.",
  },
  {
    id: "에 의해",
    re: /에\s?의해(서)?\s/g,
    level: "strong",
    why: "영어 수동태 'by'를 옮긴 말입니다. 'A에 의해 만들어진' 대신 'A가 만든'으로 씁니다.",
  },
  {
    id: "를 통해",
    re: /[을를]\s?통(해서?|하여)\s/g,
    level: "strong",
    why: "영어 'through'를 옮긴 말입니다. '~로', '~해서'로 씁니다.",
  },
  {
    id: "가지고 있다",
    re: /[을를]\s?가지고\s?있/g,
    level: "strong",
    why: "영어 'have'를 옮긴 말입니다. '~이 있다'나 형용사로 씁니다 ('기능이 많다').",
  },
  {
    id: "결말 상투어",
    re: /결론적으로|시사하는 바|지금이야말로/g,
    level: "strong",
    why: "영어 글의 맺음 상투어를 옮긴 말입니다. 빼고 그냥 말합니다.",
  },
  {
    id: "에 대해",
    re: /에\s?대해(서)?\s/g,
    level: "weak",
    why: "영어 'about'을 옮긴 말일 때가 많습니다. '~를'로 바꿀 수 있으면 바꿉니다.",
  },
  {
    id: "에 있어서",
    re: /에\s?있어서?\s/g,
    level: "weak",
    why: "일본어 'において'에서 온 말입니다. '~에서'로 씁니다. 장소를 말하는 '화면에 있어서'는 괜찮습니다.",
  },
  {
    id: "관련하여",
    re: /관련하여|와 관련된|과 관련된/g,
    level: "weak",
    why: "영어 'regarding'을 옮긴 말입니다. '보안 우려'처럼 바로 붙이거나 '~에'로 씁니다.",
  },
  {
    id: "라는 점에서",
    re: /라는 점에서/g,
    level: "weak",
    why: "영어 'in that'을 옮긴 말입니다. '~해서', '~라서'로 씁니다.",
  },
  // ── 이 레포에서 만든 말 ──
  {
    id: "문턱",
    re: /문턱/g,
    level: "strong",
    why: "조건을 비유한 말입니다. '5개가 모여야 글이 나온다'처럼 조건을 그대로 씁니다.",
  },
  {
    id: "손잡이",
    re: /손잡이/g,
    level: "strong",
    why: "설정을 비유한 말입니다. '바꿀 수 있는 설정', '줄이는 방법'으로 씁니다.",
  },
  {
    id: "거는 문",
    re: /거는 문/g,
    level: "strong",
    why: "검사를 비유한 말입니다. '부르기 전에 걸러 낸다'처럼 하는 일을 씁니다.",
  },
  {
    id: "헛실행",
    re: /헛실행|헛돈(?!다)/g, // "헛돈다"(헛돌다)는 바른 말이다
    level: "strong",
    why: "줄여 만든 말입니다. '쓸 글이 없는데 실행이 돌았다', '낭비된 돈'으로 씁니다.",
  },
  {
    id: "속사정",
    re: /속사정/g,
    level: "strong",
    why: "뜻이 흐린 말입니다. '프로그램이 안에서 판단하는 기준'처럼 무엇인지 씁니다.",
  },
  {
    id: "무대를 깔다",
    re: /무대를\s?(깔|깐)/g,
    level: "strong",
    why: "영어 'set the stage'를 옮긴 말입니다. '먼저 무엇인지 소개한다'로 씁니다.",
  },
  {
    id: "넘어가기 장치",
    re: /넘어가기 장치|나눠 받는 방식|나눠 받기/g,
    level: "strong",
    why: "개념을 짧은 이름으로 만든 말입니다. '못 부르면 예전 모델로 다시 부른다', '답을 조금씩 받아 모은다'처럼 하는 일을 씁니다.",
  },
  {
    id: "사게 두지",
    re: /사게 두지/g,
    level: "strong",
    why: "영어식 비유입니다. '~만으로는 글이 나오지 않는다'처럼 씁니다.",
  },
];

export interface StyleHit {
  rule: StyleRule;
  /** 걸린 말 그대로 */
  match: string;
  /** 걸린 말이 든 문장 (모델에게 돌려줄 때 쓴다) */
  sentence: string;
  /** 1부터 세는 줄 번호 */
  line: number;
}

/**
 * 따옴표·백틱 안은 보지 않는다 — 문서가 나쁜 예를 인용할 때 걸리지 않게.
 * 길이를 그대로 두어 위치가 어긋나지 않게 같은 길이의 공백으로 덮는다.
 */
function maskQuotes(line: string): string {
  return line.replace(/`[^`]*`|"[^"\n]*"|“[^”\n]*”|'[^'\n]*'|‘[^’\n]*’/g, (m) => " ".repeat(m.length));
}

/** 줄 하나에서 위치를 감싼 문장을 잘라 낸다 */
function sentenceAround(line: string, index: number): string {
  const before = line.slice(0, index);
  const start = Math.max(before.lastIndexOf(". "), before.lastIndexOf("? "), before.lastIndexOf("! "));
  const after = line.slice(index);
  const endRel = after.search(/[.?!](\s|$)/);
  const end = endRel === -1 ? line.length : index + endRel + 1;
  return line.slice(start === -1 ? 0 : start + 2, end).replace(/^[-*>\s#|]+/, "").trim();
}

/**
 * 한국어 글에서 규칙에 걸린 곳을 찾는다. 마크다운 코드 블록은 건너뛴다.
 * opts.quoted가 true면 따옴표 안도 본다 (모델이 쓴 글은 인용이 아니라 본문이다).
 */
export function findStyleHits(text: string, opts: { quoted?: boolean } = {}): StyleHit[] {
  const hits: StyleHit[] = [];
  let inFence = false;
  text.split("\n").forEach((raw, i) => {
    if (/^\s*```/.test(raw)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    const line = opts.quoted ? raw : maskQuotes(raw);
    for (const rule of STYLE_RULES) {
      rule.re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = rule.re.exec(line))) {
        hits.push({ rule, match: m[0].trim(), sentence: sentenceAround(raw, m.index), line: i + 1 });
      }
    }
  });
  return hits;
}

/** 모델에게 보여 줄 짧은 목록 — 글·대본 지시문과 읽기 검사에 넣는다 */
export function styleRulesForPrompt(): string {
  return STYLE_RULES.filter((r) => r.level === "strong" && !r.id.match(/^(문턱|손잡이|거는 문|헛실행|속사정|사게 두지|넘어가기 장치)$/))
    .map((r) => `- ${r.id}: ${r.why}`)
    .join("\n");
}
