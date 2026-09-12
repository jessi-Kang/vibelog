import fs from "node:fs";
import path from "node:path";
/**
 * shorts-types.ts — 쇼츠 파이프라인 단계 간 계약.
 *
 * content/shorts/<repo>/<date>.json        ← script.ts가 생성
 * content/shorts/<repo>/<date>.<lang>.timing.json ← audio.ts가 생성
 */

export type ShortsTemplate = "ship-it" | "fail" | "before-after";

/**
 * 배경음악 톤 5종 — video/assets/music/<mood>.mp3 로 미리 만들어 둔 고정
 * 트랙. 대본이 그날 이야기의 분위기에 맞는 톤을 고른다 (Jessi 지시).
 */
export const MUSIC_MOODS = [
  "ship-it", // 기본 — 담담한 전진
  "upbeat", // 배포·성공
  "tense", // 큰 삽질
  "calm", // 문서·정리
  "playful", // 실험·장난기
] as const;
export type MusicMood = (typeof MUSIC_MOODS)[number];

/**
 * 쇼츠 영상 테마 5종 (Jessi 승인 시안) — 레포가 vibelog.json의 "theme"
 * 한 줄로 고른다. 채널 문법(장면·자막·푸터)은 공유, 팔레트·키워드 강조·
 * 카드 형태만 바뀐다. 토큰 정의는 video/src/theme.ts.
 */
export const SHORTS_THEMES = [
  "terminal", // 01 터미널 민트 — 기본. 도구·자동화
  "blueprint", // 02 블루프린트 — 인프라·API
  "signal", // 03 시그널 오렌지 — 소비자 앱·운동
  "paper", // 04 페이퍼(라이트) — 글쓰기·정리
  "highlighter", // 05 하이라이터 — 실험작·장난감
] as const;
export type ShortsThemeName = (typeof SHORTS_THEMES)[number];

/** 대본 한 문장이 속하는 장면. Remotion 템플릿이 장면 전환에 사용 */
export type ShortsScene = "hook" | "build" | "demo" | "fail" | "next" | "end";

export interface ShortsLine {
  scene: ShortsScene;
  ko: string;
  en: string;
  /** 자막에서 민트색으로 강조할 단어 (문장당 1~3개, ko 문장의 단어와 일치) */
  keywords: string[];
  /** en 문장에서 강조할 단어 */
  keywordsEn: string[];
  /** 이 장면을 은유하는 일러스트 묘사(영어) — art.ts가 이미지로 만든다. hook·next만 */
  art?: string;
  /** 숫자 모먼트 — 문장 속 숫자+단위("16개","52초"). 말하는 순간 카운터로 박힌다.
   *  hook·end 장면에는 안 띄운다 — 헤드라인·엔드카드 위에 겹친다 */
  stat?: string;
  /** en 문장 표기의 숫자+단위("16 commits","36-second") — 없으면(구버전) ko 폴백 */
  statEn?: string;
  /**
   * 이 문장 동안 데모에 보여줄 사이트 경로 ("/", "/play" 등) — 대본이 실제
   * 사이트의 링크 목록에서 문장 내용과 맞는 화면을 고른다. 녹화가 화면별
   * 구간을 찍고(segments), 렌더가 문장↔구간을 매칭한다. 없으면 투어를
   * 시간순으로 자르는 기존 방식 (내용과 화면이 어긋난다는 Jessi 지적의 해법)
   */
  screen?: string;
  /**
   * 그 화면에서 **이 문장이 말하는 것이 보이게** 올려 둘 글자.
   *
   * screen은 페이지만 고른다. 녹화는 그 페이지를 위에서 아래로 훑으므로,
   * "커밋 격자" 이야기를 하는 순간 화면이 격자에 있을 이유가 없었다
   * (Jessi 지적: "격자 이야기하는데 화면은 다른 데가 돌아가"). 그래서 문장이
   * 화면의 **어디**를 가리킬 수 있게 한다.
   *
   * 선택자(selector)가 아니라 **화면에 보이는 글자**다 — 대본은 DOM을 모르지만
   * 자기가 무슨 이야기를 하는지는 안다. 녹화기가 그 글자를 찾아 화면에 올린
   * 뒤부터 구간을 시작한다. 못 찾으면 화면 맨 위에서 시작한다(전과 동일).
   */
  find?: string;
  /** en 녹화에서 찾을 글자 — 없으면 find 폴백 */
  findEn?: string;
  /**
   * 이 문장을 **어떻게** 보여줄지. 연출을 내용이 정한다.
   *
   * 전에는 (day + 장면 순번) % 3으로 폰/밴드/듀오를 돌렸다. 내용과 무관한
   * 로테이션이라 작은 격자를 이야기하는 문장에 전체 화면이 붙고, 화면이 하나뿐인
   * 편에 두 폰이 겹쳐 나왔다 (Jessi: "정해놓은 걸 돌리거나 짜맞추는 게 아니라
   * 내용에 맞춘 구성이어야 한다").
   *
   * - `focus`  화면의 한 곳을 이야기할 때 — 베젤 없이 크게 (find와 함께 쓴다)
   * - `whole`  화면 전체의 인상·흐름을 이야기할 때 — 폰 프레임 그대로
   * - `compare` 두 화면을 견주는 문장일 때 — 폰 두 대. 서로 다른 화면이 실제로
   *   녹화돼 있을 때만 쓰이고, 없으면 focus로 내려간다
   *
   * 없으면 find가 있으면 focus, 없으면 whole로 본다.
   */
  shot?: "whole" | "focus" | "compare";
  /**
   * 이 문장 동안 띄울 다이어그램 — 화면 녹화로는 보여줄 수 없는 "원리"를
   * 그림으로 설명한다 (Jessi 지시). 자유 작도가 아니라 아래 5종 어휘에서
   * 고르고 라벨만 채운다 — 그림 품질을 고정하기 위해서다.
   * 종류별 labels 순서:
   *   numberline  [범위 이름, 문제였던 값, 고친 값]
   *   fork        [출발, 왼쪽 결과, 오른쪽 결과, 왼쪽 이름, 오른쪽 이름]
   *   beforeafter [전-시작, 전-결과, 후-시작, 후-결과]
   *   sets        [왼쪽 집합, 오른쪽 집합, 겹친 값]
   *   pipeline    [단계 2~5개]
   */
  diagram?: DiagramSpec;
}

/** 다이어그램 어휘 — 새 종류를 늘리기 전에 이 다섯으로 되는지 먼저 본다 */
export type DiagramKind =
  | "numberline"
  | "fork"
  | "beforeafter"
  | "sets"
  | "pipeline";

export interface DiagramSpec {
  kind: DiagramKind;
  /** 한국어 라벨 (종류별 개수·순서는 ShortsLine.diagram 주석 참고) */
  labels: string[];
  /** 영어 라벨 — 없으면 ko 폴백 */
  labelsEn?: string[];
  /**
   * fork에서 **강조할 결과** (1=왼쪽, 2=오른쪽). 기본 2.
   *
   * 강조가 왼쪽에 못 박혀 있었다. 이야기의 답이 오른쪽인 편에서 엉뚱한 쪽이
   * 켜졌다 — "방문자가 백 명이어도 요청은 한 번"인데 "요청 백 번"이 민트색이라
   * 그림이 반대로 읽혔다 (Jessi 지적). 기본을 2로 둔 건 다른 종류도 해결을
   * 마지막에 두기 때문이다 (numberline의 고친 값, beforeafter의 후).
   */
  pick?: 1 | 2;
}

/** 종류별 [최소, 최대] 라벨 수 — 대본 검증과 렌더가 같은 표를 본다 */
export const DIAGRAM_LABELS: Record<DiagramKind, [number, number]> = {
  numberline: [3, 3],
  fork: [3, 5],
  beforeafter: [4, 4],
  sets: [3, 3],
  pipeline: [2, 5],
};

/** 대본이 넘긴 값이 쓸 수 있는 다이어그램인지 — 아니면 조용히 버린다 */
export function validDiagram(v: unknown): DiagramSpec | undefined {
  const d = v as DiagramSpec | undefined;
  if (!d || typeof d !== "object") return undefined;
  const range = DIAGRAM_LABELS[d.kind];
  if (!range) return undefined;
  const labels = Array.isArray(d.labels)
    ? d.labels.filter((x): x is string => typeof x === "string" && !!x.trim())
    : [];
  if (labels.length < range[0]) return undefined;
  const labelsEn = Array.isArray(d.labelsEn)
    ? d.labelsEn.filter((x): x is string => typeof x === "string" && !!x.trim())
    : [];
  return {
    kind: d.kind,
    labels: labels.slice(0, range[1]),
    ...(labelsEn.length >= range[0]
      ? { labelsEn: labelsEn.slice(0, range[1]) }
      : {}),
    ...(d.pick === 1 || d.pick === 2 ? { pick: d.pick } : {}),
  };
}

/**
 * 녹화의 한 정류장 — readyAt 기준 상대 시각(초).
 * 화면(path)만이 아니라 "무엇이 보이게 올려 뒀는지"(find)까지가 키다.
 * 같은 페이지를 두 문장이 각자 다른 곳을 가리키며 쓸 수 있다.
 */
export interface DemoSegment {
  path: string;
  find?: string;
  start: number;
  end: number;
  /**
   * 가리킨 요소의 세로 중심 (0~1, 녹화 화면 높이 기준).
   *
   * 렌더의 `focus` 샷은 폰 화면을 밴드로 크롭해 크게 보여준다 — 가운데 띠만
   * 보이므로 요소가 그 밖에 있으면 **잘린다**. 실제로 도장을 제대로 잡아
   * 표시까지 했는데 영상에서 위가 잘려 나갔다 (Jessi: "스탬프를 제대로
   * 표시했는데 영상에서 보여줄 때 짤렸잖아").
   *
   * 그래서 녹화가 요소의 위치를 남기고, 렌더는 그 지점을 크롭의 가운데로
   * 잡는다. 어느 화면의 어디를 가리켜도 프레임 안에 들어온다.
   */
  focusY?: number;
}

/** 구간 매칭 키 — 렌더와 녹화가 같은 식을 써야 짝이 맞는다 */
export function stopKey(path: string, find?: string): string {
  return find ? `${path}\u0000${find}` : path;
}

export interface ShortsFailCard {
  /** 삽질 카드 제목 (짧게, 2줄 이내) */
  title: string;
  titleEn: string;
  before: string;
  after: string;
  /** en 렌더용 — 없으면(구버전 대본) ko로 폴백 */
  beforeEn?: string;
  afterEn?: string;
}

export interface ShortsScript {
  template: ShortsTemplate;
  /** 대본이 고른 배경음악 톤 — 없으면 template 트랙 → 아무 트랙 순 폴백 */
  music?: string;
  /** 레포가 고른 영상 테마 (vibelog.json "theme") — 없으면 terminal */
  theme?: string;
  repo: string;
  date: string; // YYYY-MM-DD
  /** eyebrow의 DAY NN — 이 레포의 몇 번째 데브로그인지 */
  day: number;
  lines: ShortsLine[];
  demo: { url: string; steps: string[] };
  /** 삽질 장면 카드. fail 장면이 있을 때만 */
  failCard?: ShortsFailCard;
  /** 엔드카드 하단 핸들에 표시할 URL */
  handle: string;
  captions: { ko: string; en: string };
  hashtags: string[];
  /** 커밋 콜드오픈 재료 — 데브로그 frontmatter shas [sha7, 한 줄 메시지] */
  commits?: [string, string][];
  /** 그날 커밋 수 (frontmatter commits) — 콜드오픈 ×N 카운터. shas는 일부만 싣는다 */
  commitCount?: number;
  /** 영문 영상용 커밋 메시지 (frontmatter shasEn) — 없으면 ko로 폴백 */
  commitsEn?: [string, string][];
  /** 8단계에서 업로드 후 기록. poster/posterEn = 훅 헤드라인이 다 켜진 순간의 프레임(썸네일용) */
  media?: { ko?: string; en?: string; poster?: string; posterEn?: string };
}

export interface TimedWord {
  text: string;
  start: number; // 초, 오디오 기준
  end: number;
}

export interface TimedSentence {
  /** lines 배열 인덱스 */
  index: number;
  start: number;
  end: number;
  words: TimedWord[];
}

export interface ShortsTiming {
  lang: "ko" | "en";
  /** 내레이션 mp3 전체 길이(초) */
  duration: number;
  sentences: TimedSentence[];
}

/**
 * 템플릿별 콜드오픈 문법 — 내레이션 전 2초를 무엇으로 여는지.
 *   log(ship-it): git log 커밋 타이핑 / error(fail): ✗ 사고 한 줄 /
 *   diff(before-after): git diff의 -before +after
 * 재료(failCard)가 없으면 log로, 커밋도 없으면 콜드오픈 없음.
 * scripts와 video 양쪽이 같은 판정을 써야 영상 길이가 어긋나지 않는다.
 */
export type ColdOpenKind = "log" | "error" | "diff";

export function coldOpenKind(s: ShortsScript): ColdOpenKind | null {
  if (s.template === "fail" && s.failCard?.before) return "error";
  if (
    s.template === "before-after" &&
    s.failCard?.before &&
    s.failCard?.after
  ) {
    return "diff";
  }
  return s.commits?.length ? "log" : null;
}

export function shortsDir(repo: string): string {
  return `content/shorts/${repo}`;
}

export function shortsJsonPath(repo: string, date: string): string {
  return `${shortsDir(repo)}/${date}.json`;
}

export function timingJsonPath(
  repo: string,
  date: string,
  lang: "ko" | "en",
): string {
  return `${shortsDir(repo)}/${date}.${lang}.timing.json`;
}

export function segmentsJsonPath(
  repo: string,
  date: string,
  lang: "ko" | "en",
): string {
  return `${shortsDir(repo)}/${date}.${lang}.segments.json`;
}

export function narrationPath(
  repo: string,
  date: string,
  lang: "ko" | "en",
): string {
  return `${shortsDir(repo)}/${date}.${lang}.mp3`;
}

/**
 * 녹화된 데모 구간이 **같은 화면을 두 번 보여주는지** 본다.
 *
 * 같은 페이지를 두 문장이 쓰는 것 자체는 괜찮다 — find를 다르게 주면 그 화면의
 * 다른 곳을 보여주니 다른 컷이다. 나쁜 것은 **같은 자리를 두 번** 쓰는 경우다:
 * 한쪽에 find가 없으면(화면 전체) 다른 쪽이 그 안의 한 곳이라 결국 같은 화면이
 * 비율만 달리 두 번 나온다. 실제로 홈을 전체로 한 번, 홈의 제목을 크게 한 번
 * 써서 그 편이 "같은 화면이 비율만 다르게" 반복됐다.
 *
 * 조용히 지나가는 부류라(영상을 봐야 안다) 실행 기록에 남긴다. 파일이 없으면
 * (녹화를 안 했거나 기본 투어면) 아무것도 보고하지 않는다.
 */
export function checkDemoScreens(
  repo: string,
  date: string,
  lang: "ko" | "en" = "ko",
): { stops: number; repeated: string[] } | null {
  const file = path.join(process.cwd(), segmentsJsonPath(repo, date, lang));
  if (!fs.existsSync(file)) return null;
  let segs: { path?: string; find?: string }[];
  try {
    segs = JSON.parse(fs.readFileSync(file, "utf8")).screens ?? [];
  } catch {
    return null;
  }
  if (segs.length < 3) return null;
  const byPath = new Map<string, (string | undefined)[]>();
  for (const sg of segs) {
    const key = (sg.path ?? "").split("?")[0];
    if (!key) continue;
    byPath.set(key, [...(byPath.get(key) ?? []), sg.find]);
  }
  const repeated: string[] = [];
  for (const [p2, finds] of byPath) {
    if (finds.length < 2) continue;
    // 화면 전체를 쓴 정류장이 끼어 있거나, 같은 곳을 두 번 가리켰으면 같은 컷
    const hasWhole = finds.some((f) => !f);
    const dup =
      new Set(finds.filter(Boolean)).size < finds.filter(Boolean).length;
    if (hasWhole || dup) repeated.push(p2);
  }
  return repeated.length > 0 ? { stops: segs.length, repeated } : null;
}
