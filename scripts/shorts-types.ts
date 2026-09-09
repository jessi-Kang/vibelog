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
}

export interface ShortsFailCard {
  /** 삽질 카드 제목 (짧게, 2줄 이내) */
  title: string;
  titleEn: string;
  before: string;
  after: string;
}

export interface ShortsScript {
  template: ShortsTemplate;
  /** 대본이 고른 배경음악 톤 — 없으면 template 트랙 → 아무 트랙 순 폴백 */
  music?: string;
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
  /** 8단계에서 업로드 후 기록. poster = ko 영상 첫 프레임(썸네일용) */
  media?: { ko?: string; en?: string; poster?: string };
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
