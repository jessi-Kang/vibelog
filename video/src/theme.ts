/**
 * 테마 시스템 — 레포마다 다른 얼굴, 같은 문법 (Jessi 승인 시안 5종).
 * 채널 아이덴티티(장면 구조·자막 규칙·푸터·진행 바)는 모든 테마가 공유하고,
 * 팔레트·키워드 강조 방식·카드/배지 형태·배경 처리만 테마가 바꾼다.
 * 레포는 vibelog.json의 "theme" 한 줄로 고른다. 기본값은 terminal.
 */
import type { CSSProperties } from "react";
import { loadFont as loadNotoSansKR } from "@remotion/google-fonts/NotoSansKR";
import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";

const noto = loadNotoSansKR("normal", { weights: ["500", "700", "900"] });
const mono = loadJetBrainsMono("normal", { weights: ["500", "700"] });

export interface ShortsTheme {
  bg: string;
  panel: string;
  panel2: string;
  line: string;
  ink: string;
  muted: string;
  accent: string;
  /** accent 배경 위 글자색 */
  accentInk: string;
  /** 삽질 카드 라벨("오늘의 삽질") 색 */
  warn: string;
  /** 키워드 강조: 컬러 글자 / 밑줄 / 마커칠(배경 채움) */
  keyword: "color" | "underline" | "marker";
  /** 배경 처리: 래디얼 글로우 / 도면 격자 / 상단 엣지 / 무지 */
  backdrop: "glow" | "grid" | "edge" | "flat";
  /** 카드·박스 기본 모서리 */
  radius: number;
  /** 상단 배지(SHIP IT): 테두리형/채움형 + 모서리 */
  badgeFill: boolean;
  badgeRadius: number;
  /** 삽질 카드 변형 */
  fail: "panel" | "annotation" | "strike" | "paper" | "marker";
  /** 라이트 테마 여부 (자막 그림자·폰 프레임 톤이 바뀐다) */
  light?: boolean;
}

export const THEMES: Record<string, ShortsTheme> = {
  /** 01 터미널 민트 — 현행 vibelog, 기본값. 도구·자동화 */
  terminal: {
    bg: "#0A0E14", panel: "#141B24", panel2: "#1B2430", line: "#26313F",
    ink: "#F3EFE6", muted: "#8C98A8", accent: "#5EE1C3", accentInk: "#06261F",
    warn: "#FFB454",
    keyword: "color", backdrop: "glow", radius: 28, badgeFill: false,
    badgeRadius: 999, fail: "panel",
  },
  /** 02 블루프린트 — 격자 + 블루 밑줄, 각진 모서리. 인프라·API */
  blueprint: {
    bg: "#0D1B2E", panel: "#122540", panel2: "#173050", line: "#2A4A75",
    ink: "#EDF2FA", muted: "#6D84A3", accent: "#7FB0FF", accentInk: "#071426",
    warn: "#7FB0FF",
    keyword: "underline", backdrop: "grid", radius: 8, badgeFill: false,
    badgeRadius: 8, fail: "annotation",
  },
  /** 03 시그널 오렌지 — 상단 엣지 + 채움 배지, before 취소선. 소비자 앱·운동 */
  signal: {
    bg: "#131110", panel: "#1C1815", panel2: "#241A13", line: "#2A2522",
    ink: "#F5EFE8", muted: "#8A807A", accent: "#FF6B35", accentInk: "#1B0E06",
    warn: "#FF6B35",
    keyword: "color", backdrop: "edge", radius: 24, badgeFill: true,
    badgeRadius: 999, fail: "strike",
  },
  /** 04 페이퍼 — 유일한 라이트, 형광펜 그린. 글쓰기·정리 도구 */
  paper: {
    bg: "#EFF1F4", panel: "#FFFFFF", panel2: "#E4E8ED", line: "#DDE1E7",
    ink: "#171A1F", muted: "#8A919B", accent: "#0F7B5F", accentInk: "#F2FBF8",
    warn: "#0F7B5F",
    keyword: "marker", backdrop: "flat", radius: 20, badgeFill: false,
    badgeRadius: 999, fail: "paper", light: true,
  },
  /** 05 하이라이터 — 흑백 + 노랑 마커, 브루탈리스트. 실험작·장난감 */
  highlighter: {
    bg: "#0C0C0D", panel: "#161618", panel2: "#1D1D20", line: "#232326",
    ink: "#FAFAF7", muted: "#77777B", accent: "#FFD84D", accentInk: "#0C0C0D",
    warn: "#FFD84D",
    keyword: "marker", backdrop: "flat", radius: 4, badgeFill: true,
    badgeRadius: 4, fail: "marker",
  },
};

export function getTheme(name?: string | null): ShortsTheme {
  return (name && THEMES[name]) || THEMES.terminal;
}

/**
 * 키워드 강조 스타일 — HookCard(헤드라인)와 Captions(자막)가 같은 규칙을 쓴다.
 * scale: 헤드라인 1, 자막은 밑줄·패딩을 줄여서.
 */
export function keywordStyle(th: ShortsTheme, scale = 1): CSSProperties {
  if (th.keyword === "underline") {
    return {
      color: th.accent,
      boxShadow: `inset 0 ${-8 * scale}px 0 ${th.accent}55`,
    };
  }
  if (th.keyword === "marker") {
    return {
      color: th.accentInk,
      background: th.accent,
      padding: `0 ${12 * scale}px`,
      borderRadius: 8 * scale,
      boxDecorationBreak: "clone",
      WebkitBoxDecorationBreak: "clone",
    } as CSSProperties;
  }
  return { color: th.accent };
}

/**
 * 토큰 비교용 정규화 — 양끝 문장부호를 뗀다. "never started"를 강조하려는데
 * 문장 토큰이 "started."라서 못 켜지던 문제 (영문 훅 하이라이트 누락 —
 * Jessi 지적). scripts/script.ts의 검증과 같은 규칙이어야 한다.
 */
export function stripPunct(w: string): string {
  return w.replace(/^[.,!?…:;"'“”‘’()[\]]+|[.,!?…:;"'“”‘’()[\]]+$/g, "");
}

/**
 * 키워드가 켜지는 단어 인덱스 — "두 번"처럼 연속된 여러 단어 구도 키워드가
 * 될 수 있다 (한 단어만 허용하면 "번"만 켜져 어색하다 — Jessi 지적).
 * 구의 모든 토큰이 문장에 연속으로 나타나는 자리를 전부 켠다.
 */
export function keywordIndices(
  words: string[],
  keywords: string[],
): Set<number> {
  const on = new Set<number>();
  for (const k of keywords) {
    const toks = k.split(/\s+/).map(stripPunct).filter(Boolean);
    if (!toks.length) continue;
    for (let i = 0; i + toks.length <= words.length; i++) {
      if (toks.every((tok, j) => stripPunct(words[i + j]) === tok)) {
        for (let j = 0; j < toks.length; j++) on.add(i + j);
      }
    }
  }
  return on;
}

/**
 * 시각 폭 기준 글자 수 — 한글(전각)은 1, 영문·숫자(반각)는 0.5로 센다.
 * "긴 문장은 글자를 줄인다" 기준을 글자 수로 재면 영어가 억울해진다:
 * 같은 폭에 라틴 글자가 두 배쯤 들어가기 때문 (Jessi 확인 질문에서 발견).
 */
export function visualLen(text: string): number {
  let n = 0;
  for (const ch of text) {
    n += /[ᄀ-ᇿ　-鿿가-힯豈-﫿]/.test(ch)
      ? 1
      : 0.5;
  }
  return n;
}

/** 하위 호환 — 기존 코드가 쓰던 기본 팔레트 (terminal과 동일) */
export const COLORS = THEMES.terminal;

// 렌더 환경에 웹폰트가 없을 수 있으니 Noto Sans CJK KR 로컬 폴백 (스펙 문서)
export const FONT_SANS = `${noto.fontFamily}, 'Noto Sans CJK KR', 'Noto Sans KR', sans-serif`;
export const FONT_MONO = `${mono.fontFamily}, ui-monospace, Menlo, monospace`;

/** 내레이션은 영상 시작 0.5초 뒤부터 (스펙) — 화면 시간 = 오디오 시간 + DELAY */
export const NARRATION_DELAY = 0.5;
/** 마지막 문장 뒤 엔드카드 여운 (음악 페이드아웃 3.5초와 맞물림) */
export const END_TAIL = 3.0;
/** 장면 크로스페이드 (프로토타입 .scene transition .45s) */
export const SCENE_FADE = 0.45;
/** 커밋 콜드오픈 길이 — script.commits가 있을 때만. scripts/render.ts와 같은 값 */
export const COLD_OPEN_SEC = 2.0;

export function totalSeconds(narrationDuration: number, coldOpenSec = 0): number {
  return coldOpenSec + NARRATION_DELAY + narrationDuration + END_TAIL;
}
