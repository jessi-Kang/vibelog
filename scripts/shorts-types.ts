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
  /** 숫자 모먼트 — 문장 속 숫자+단위("16개","52초"). 말하는 순간 카운터로 박힌다 */
  stat?: string;
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
  if (s.template === "before-after" && s.failCard?.before && s.failCard?.after) {
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

export function narrationPath(
  repo: string,
  date: string,
  lang: "ko" | "en",
): string {
  return `${shortsDir(repo)}/${date}.${lang}.mp3`;
}
