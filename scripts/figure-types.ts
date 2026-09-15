/**
 * 글 삽화 — 계약과 검증.
 *
 * 글이 "원리"를 말하는 대목에 책 삽화처럼 그림 한 장이 들어간다. 종류를
 * 정해 두지 않는다 (쇼츠의 다이어그램 5종과 다른 점이다) — 대신 나가기 전에
 * 기계가 잰다. 시안·이유는 docs/post-figures.html.
 *
 * **모델이 쓴 마크업을 페이지에 그대로 넣지 않는다.** 이 사이트는 사람이 읽기
 * 전에 발행되므로, 생성된 것이 코드에 닿는 자리가 전부 공격면이다. 그래서
 * SVG 문자열을 여기서 **파싱해 허용 목록만 남긴 트리(FigNode)로 바꿔** 저장하고,
 * 화면은 그 트리를 React 엘리먼트로 그린다. 원문 문자열은 어디에도 안 들어간다.
 * 파서가 못 읽는 입력은 통째로 거절한다 — 관대한 파서가 곧 구멍이다.
 *
 * 이 파일에는 **타입과 순수 함수만** 둔다 (shorts-types.ts와 같은 이유 —
 * 브라우저로 번들되는 코드가 여기를 가져간다). 파일을 읽거나 브라우저를
 * 띄우는 검사는 scripts/check-figures.ts에 있다.
 */

/** 삽화가 들어갈 수 있는 섹션 — 글의 고정 구조와 같다 */
export const FIG_SECTIONS = ["did", "why", "fail", "next"] as const;
export type FigSection = (typeof FIG_SECTIONS)[number];

/**
 * 삽화는 **늘리지 않는다**. viewBox 폭을 390으로 고정하고 화면에서도 그 크기
 * 그대로 둔다 (가운데). 칼럼 폭에 맞춰 늘렸더니 680으로 그린 그림이 390에서
 * 라벨 7px가 됐다 — 본문 글자는 그대로인데 그림 글자만 줄어 삽화만 못 읽게
 * 된다. 책 삽화가 본문 단보다 좁은 것과 같다.
 */
export const FIG_W = 390;
/** 세로는 자유지만 한 화면을 넘기지 않는다 */
export const FIG_H_MAX = 520;

/**
 * 라벨 최소 크기. 320px 화면에서 본문 폭이 288까지 줄어 배율 0.74가 걸리므로,
 * 15 × 0.74 = 11.1px — 접근성 기준 11을 넘기는 가장 작은 값이다.
 */
export const FIG_MIN_FONT = 15;

/** 그려도 되는 태그. 이 밖이 하나라도 있으면 그 삽화는 버린다 */
export const FIG_TAGS = [
  "svg",
  "title",
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
] as const;
export type FigTag = (typeof FIG_TAGS)[number];

/** 모든 태그에 공통으로 허용 */
const COMMON = [
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "opacity",
  "fill-opacity",
  "stroke-opacity",
] as const;

/** 태그별 허용 속성. 여기 없는 속성은 **조용히 버리지 않고 거절한다** */
export const FIG_ATTRS: Record<FigTag, readonly string[]> = {
  svg: ["viewBox", "role"],
  title: [],
  g: [...COMMON],
  path: [...COMMON, "d"],
  rect: [...COMMON, "x", "y", "width", "height", "rx", "ry"],
  circle: [...COMMON, "cx", "cy", "r"],
  ellipse: [...COMMON, "cx", "cy", "rx", "ry"],
  line: [...COMMON, "x1", "y1", "x2", "y2"],
  polyline: [...COMMON, "points"],
  polygon: [...COMMON, "points"],
  text: [
    ...COMMON,
    "x",
    "y",
    "font-size",
    "font-weight",
    "font-family",
    "text-anchor",
    "letter-spacing",
  ],
  tspan: [...COMMON, "x", "y", "dx", "dy", "font-size", "font-weight"],
};

/**
 * 색은 **토큰 이름만** 쓴다. 생색·hex를 허용하면 테마와 어긋나고 대비가
 * 예측되지 않는다 — 오늘 영상 쪽에서 대비 1.8:1이 그대로 나갔다.
 */
export const FIG_COLOR_TOKENS = [
  "bg",
  "panel",
  "panel2",
  "line",
  "line-strong",
  "ink",
  "ink-soft",
  "muted",
  "accent",
  "accent-soft",
  "warn",
  "danger",
] as const;

/** 글꼴도 토큰 둘뿐 */
export const FIG_FONTS = ["var(--font-sans)", "var(--font-mono)"] as const;

/** 파싱·검증을 통과한 뒤의 그림. 화면은 이것만 본다 */
export interface FigNode {
  tag: FigTag;
  attrs: Record<string, string>;
  /** text·title의 글자. 다른 태그에는 없다 */
  text?: string;
  children?: FigNode[];
}

export interface PostFigure {
  section: FigSection;
  /** 이 섹션의 몇 번째 문단 **뒤**에 놓을지 (0부터) */
  after: number;
  /** 스크린 리더가 읽을 한 문장 — svg의 <title>과 같은 값 */
  alt: string;
  altEn: string;
  /** 그림 아래 한 줄 */
  caption: string;
  captionEn: string;
  node: FigNode;
  nodeEn: FigNode;
}

/* ────────────────────────── 파서 ──────────────────────────
   XML의 아주 좁은 부분집합만 읽는다. 주석·CDATA·네임스페이스·엔티티 확장·
   자기닫기 아닌 빈 태그 같은 것은 전부 "못 읽음"으로 거절한다. 관대할 이유가
   없다 — 입력은 우리가 프롬프트로 시킨 모양이고, 벗어났으면 버리면 된다. */

export class FigError extends Error {}

const NAME = /^[a-zA-Z][a-zA-Z0-9-]*$/;
/** 허용하는 엔티티 — 이 밖은 거절 (숫자 엔티티로 우회하는 길을 막는다) */
const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function decode(s: string): string {
  return s.replace(/&([a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);/g, (_, e: string) => {
    const v = ENTITIES[e];
    if (v === undefined) throw new FigError(`허용하지 않는 엔티티: &${e};`);
    return v;
  });
}

interface RawNode {
  tag: string;
  attrs: Record<string, string>;
  text: string;
  children: RawNode[];
}

/** 문자열 → 원시 트리. 모양만 본다 (허용 목록은 sanitizeFigure가 본다) */
export function parseSvg(src: string): RawNode {
  let i = 0;
  const s = src.trim();
  if (!s.startsWith("<svg")) throw new FigError("<svg>로 시작하지 않습니다");

  const stack: RawNode[] = [];
  let root: RawNode | null = null;

  while (i < s.length) {
    const lt = s.indexOf("<", i);
    if (lt === -1) {
      if (s.slice(i).trim()) throw new FigError("태그 밖에 글자가 있습니다");
      break;
    }
    // 태그 사이의 글자
    const between = s.slice(i, lt);
    if (between && stack.length) stack[stack.length - 1].text += decode(between);
    else if (between.trim()) throw new FigError("태그 밖에 글자가 있습니다");

    if (s.startsWith("<!--", lt)) throw new FigError("주석은 쓰지 않습니다");
    if (s.startsWith("<![", lt)) throw new FigError("CDATA는 쓰지 않습니다");
    if (s.startsWith("<?", lt) || s.startsWith("<!", lt))
      throw new FigError("선언·지시문은 쓰지 않습니다");

    const gt = s.indexOf(">", lt);
    if (gt === -1) throw new FigError("닫히지 않은 태그가 있습니다");
    let body = s.slice(lt + 1, gt).trim();

    // 닫는 태그
    if (body.startsWith("/")) {
      const name = body.slice(1).trim();
      const top = stack.pop();
      if (!top || top.tag !== name)
        throw new FigError(`</${name}>이 짝이 맞지 않습니다`);
      if (!stack.length) {
        root = top;
        i = gt + 1;
        if (s.slice(i).trim()) throw new FigError("<svg> 뒤에 무언가 있습니다");
        break;
      }
      i = gt + 1;
      continue;
    }

    const selfClose = body.endsWith("/");
    if (selfClose) body = body.slice(0, -1).trim();

    const sp = body.search(/\s/);
    const tag = (sp === -1 ? body : body.slice(0, sp)).trim();
    if (!NAME.test(tag)) throw new FigError(`태그 이름이 이상합니다: ${tag}`);

    const attrs: Record<string, string> = {};
    let rest = sp === -1 ? "" : body.slice(sp);
    const ATTR = /\s*([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*"([^"]*)"/y;
    ATTR.lastIndex = 0;
    let m: RegExpExecArray | null;
    let consumed = 0;
    while ((m = ATTR.exec(rest))) {
      if (m[1] in attrs) throw new FigError(`속성이 두 번 있습니다: ${m[1]}`);
      attrs[m[1]] = decode(m[2]);
      consumed = ATTR.lastIndex;
    }
    if (rest.slice(consumed).trim())
      throw new FigError(`속성을 읽지 못했습니다: ${rest.slice(consumed).trim()}`);

    const node: RawNode = { tag, attrs, text: "", children: [] };
    if (stack.length) stack[stack.length - 1].children.push(node);
    else if (root) throw new FigError("뿌리가 둘입니다");

    if (selfClose) {
      if (!stack.length) {
        root = node;
        i = gt + 1;
        if (s.slice(i).trim()) throw new FigError("<svg> 뒤에 무언가 있습니다");
        break;
      }
    } else {
      stack.push(node);
    }
    i = gt + 1;
  }

  if (stack.length) throw new FigError("닫히지 않은 태그가 있습니다");
  if (!root) throw new FigError("읽을 것이 없습니다");
  return root;
}

/* ────────────────────────── 허용 목록 ────────────────────────── */

const NUM = /^-?\d+(\.\d+)?$/;
const COLOR_RE = /^var\(--color-([a-z0-9-]+)\)$/;
/** d·points에 들어갈 수 있는 글자 — 명령과 숫자뿐 */
const PATH_RE = /^[MmLlHhVvCcSsQqTtAaZz0-9.,\-\s]+$/;
const DASH_RE = /^[0-9.\s]+$/;

function checkColor(v: string, what: string): void {
  if (v === "none") return;
  const m = COLOR_RE.exec(v);
  if (!m || !(FIG_COLOR_TOKENS as readonly string[]).includes(m[1]))
    throw new FigError(`${what}은 토큰만 씁니다 (받은 값: ${v})`);
}

function checkAttr(tag: FigTag, k: string, v: string): void {
  if (k === "fill" || k === "stroke") return checkColor(v, k);
  if (k === "font-family") {
    if (!(FIG_FONTS as readonly string[]).includes(v))
      throw new FigError(`font-family는 토큰만 씁니다 (받은 값: ${v})`);
    return;
  }
  if (k === "d" || k === "points") {
    if (!PATH_RE.test(v)) throw new FigError(`${k}에 이상한 글자가 있습니다`);
    return;
  }
  if (k === "stroke-dasharray") {
    if (!DASH_RE.test(v)) throw new FigError("stroke-dasharray가 숫자가 아닙니다");
    return;
  }
  if (k === "viewBox") {
    const p = v.trim().split(/\s+/);
    if (p.length !== 4 || !p.every((n) => NUM.test(n)))
      throw new FigError("viewBox를 읽지 못했습니다");
    const [x, y, w, h] = p.map(Number);
    if (x !== 0 || y !== 0 || w !== FIG_W)
      throw new FigError(`viewBox는 "0 0 ${FIG_W} 높이"여야 합니다`);
    if (!(h > 0 && h <= FIG_H_MAX))
      throw new FigError(`삽화 높이는 1–${FIG_H_MAX}입니다 (받은 값: ${h})`);
    return;
  }
  if (k === "font-size") {
    if (!NUM.test(v)) throw new FigError("font-size가 숫자가 아닙니다");
    if (Number(v) < FIG_MIN_FONT)
      throw new FigError(
        `라벨은 ${FIG_MIN_FONT} 이상입니다 — 좁은 화면에서 못 읽습니다 (받은 값: ${v})`,
      );
    return;
  }
  if (k === "text-anchor") {
    if (!["start", "middle", "end"].includes(v))
      throw new FigError(`text-anchor 값이 이상합니다: ${v}`);
    return;
  }
  if (k === "font-weight") {
    if (!["400", "700", "normal", "bold"].includes(v))
      throw new FigError(`font-weight는 400/700입니다 (받은 값: ${v})`);
    return;
  }
  if (k === "role") {
    if (v !== "img") throw new FigError('role은 "img"만 씁니다');
    return;
  }
  if (
    k === "opacity" ||
    k === "fill-opacity" ||
    k === "stroke-opacity"
  ) {
    if (!NUM.test(v) || Number(v) < 0 || Number(v) > 1)
      throw new FigError(`${k}는 0–1입니다`);
    return;
  }
  if (["stroke-linecap", "stroke-linejoin"].includes(k)) return;
  if (!NUM.test(v)) throw new FigError(`${tag}의 ${k}가 숫자가 아닙니다`);
}

/** 원시 트리 → 화면이 그릴 트리. 어긋나면 던진다 */
export function sanitizeFigure(raw: RawNode, depth = 0): FigNode {
  if (depth > 6) throw new FigError("너무 깊습니다");
  const tag = raw.tag as FigTag;
  if (!(FIG_TAGS as readonly string[]).includes(tag))
    throw new FigError(`쓸 수 없는 태그입니다: <${raw.tag}>`);

  const allowed = FIG_ATTRS[tag];
  const attrs: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw.attrs)) {
    if (!allowed.includes(k))
      throw new FigError(`<${tag}>에 쓸 수 없는 속성입니다: ${k}`);
    checkAttr(tag, k, v);
    attrs[k] = v;
  }

  const node: FigNode = { tag, attrs };
  const text = raw.text.replace(/\s+/g, " ").trim();
  if (tag === "text" || tag === "tspan" || tag === "title") {
    if (text) node.text = text;
  } else if (text) {
    throw new FigError(`<${tag}> 안에 글자가 있습니다`);
  }
  if (raw.children.length)
    node.children = raw.children.map((c) => sanitizeFigure(c, depth + 1));
  return node;
}

/** 트리를 훑어 모든 노드를 준다 */
export function walk(n: FigNode): FigNode[] {
  return [n, ...(n.children ?? []).flatMap(walk)];
}

/** 그림 안 글자 전부 (title 포함) */
export function figureText(n: FigNode): string[] {
  return walk(n)
    .filter((x) => x.text)
    .map((x) => x.text as string);
}

/**
 * 그림이 본문에 없는 사실을 지어내지 않았는지 — 가장 중요한 검사다.
 * 라벨의 **숫자**는 그 섹션 본문에 그대로 있어야 한다. 낱말까지 강제하면
 * "→"나 "경계" 같은 그림 문법을 못 쓰므로 숫자만 본다 (숫자가 틀리면
 * 읽는 사람이 글과 그림 중 어느 쪽을 믿어야 할지 알 수 없다).
 */
export function inventedNumbers(node: FigNode, sectionText: string): string[] {
  // 시각(6:06)·천 단위(3,151)는 통째로 찾으면 본문 표기("6시 6분", "3151건")와
  // 어긋난다. 낱개 수로 쪼개서 본다 — 6:06은 6과 06, 06은 6과 같다고 친다.
  const nums = (s: string): string[] =>
    (s.replace(/,/g, "").match(/\d+(?:\.\d+)?/g) ?? []).map((n) =>
      n.replace(/^0+(?=\d)/, ""),
    );
  const inBody = new Set(nums(sectionText));
  return [...new Set(nums(figureText(node).join(" ")))].filter(
    (n) => !inBody.has(n),
  );
}

/**
 * 한글 수사 + 단위("네 회차", "세 개")는 거절한다. 표기 규칙은 아라비아 숫자다
 * ("4회차" — 데브로그와 같다). 그리고 이게 검증의 구멍이었다: 본문에 없는
 * 수를 한글로 적으면 숫자 검사가 못 본다 — 실제로 본문에 4가 없는 글에
 * "네 회차"가 그대로 나갔다 (Jessi 지적). 한/두는 "한 번 더"처럼 관용구가
 * 많아 셋부터 본다.
 */
const KO_NUMERAL =
  /(?:^|\s)(?:세|네|다섯|여섯|일곱|여덟|아홉|열|스무|스물|서른|마흔|쉰|예순|일흔|여든|아흔|백|천)\s?(?:개|번|회차|건|장|편|명|시간|초|분|줄|칸|번째|가지|곳|배|살|일|주|달|해|번씩)/;
export function koreanNumerals(texts: string[]): string[] {
  return texts.filter((t) => KO_NUMERAL.test(t));
}

/** svg 루트가 갖춰야 할 것 */
export function checkRoot(node: FigNode): void {
  if (node.tag !== "svg") throw new FigError("뿌리가 <svg>가 아닙니다");
  if (!node.attrs.viewBox) throw new FigError("viewBox가 없습니다");
  const first = node.children?.[0];
  if (!first || first.tag !== "title" || !first.text)
    throw new FigError("<title>이 없습니다 — 그림만 있으면 읽어 줄 것이 없습니다");
  if (figureText(node).length < 2)
    throw new FigError("라벨이 없습니다 — 글자 없는 그림은 삽화가 아닙니다");
}

/** 문자열 하나를 받아 저장할 트리로. 실패하면 던진다 */
export function toFigure(svg: string, sectionText: string): FigNode {
  const node = sanitizeFigure(parseSvg(svg));
  checkRoot(node);
  const bad = inventedNumbers(node, sectionText);
  if (bad.length)
    throw new FigError(`본문에 없는 숫자가 그림에 있습니다: ${bad.join(", ")}`);
  const ko = koreanNumerals(figureText(node));
  if (ko.length)
    throw new FigError(
      `수는 아라비아 숫자로 씁니다 ("4회차"): ${ko[0].slice(0, 30)}`,
    );
  return node;
}

/**
 * 섹션 본문을 문단으로 쪼갠다. 삽화의 `after`가 가리키는 번호가 이 결과의
 * 인덱스다 — **생성 쪽과 화면 쪽이 같은 함수를 써야** 자리가 안 어긋난다.
 * (쇼츠에서 어휘 목록이 두 군데로 갈라져 있던 것과 같은 실수를 안 만든다.)
 */
export function splitParas(md: string): string[] {
  return md
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
