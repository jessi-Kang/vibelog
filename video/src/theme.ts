/** docs/03-shorts-spec.md "색·타이포" — 프로토타입과 동일 팔레트 */
import { loadFont as loadNotoSansKR } from "@remotion/google-fonts/NotoSansKR";
import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";

const noto = loadNotoSansKR("normal", { weights: ["500", "700", "900"] });
const mono = loadJetBrainsMono("normal", { weights: ["500", "700"] });

export const COLORS = {
  bg: "#0A0E14",
  panel: "#141B24",
  panel2: "#1B2430",
  line: "#26313F",
  ink: "#F3EFE6",
  muted: "#8C98A8",
  accent: "#5EE1C3",
  accentInk: "#06261F",
  warn: "#FFB454",
};

// 렌더 환경에 웹폰트가 없을 수 있으니 Noto Sans CJK KR 로컬 폴백 (스펙 문서)
export const FONT_SANS = `${noto.fontFamily}, 'Noto Sans CJK KR', 'Noto Sans KR', sans-serif`;
export const FONT_MONO = `${mono.fontFamily}, ui-monospace, Menlo, monospace`;

/** 내레이션은 영상 시작 0.5초 뒤부터 (스펙) — 화면 시간 = 오디오 시간 + DELAY */
export const NARRATION_DELAY = 0.5;
/** 마지막 문장 뒤 엔드카드 여운 (음악 페이드아웃 3.5초와 맞물림) */
export const END_TAIL = 3.0;
/** 장면 크로스페이드 (프로토타입 .scene transition .45s) */
export const SCENE_FADE = 0.45;

export function totalSeconds(narrationDuration: number): number {
  return NARRATION_DELAY + narrationDuration + END_TAIL;
}
