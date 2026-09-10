/**
 * 자막 — docs/03-shorts-spec.md "자막 규칙" 6개 항목 구현.
 *
 * 1. 문장 단위 한 덩어리, 최대 두 줄 (keep-all + balance)
 * 2. 단어는 흐림(.3) → 또렷(1), 단어별 타임스탬프에 맞춰 페이드 ~0.28s
 * 3. 키워드는 켜지는 순간 민트색이 들어가 문장 끝까지 유지 (단어별 색 반전 금지)
 * 4. 음성이 끝나도 다음 문장 시작 −0.15s까지 잔류, 최소 0.4초 보장,
 *    마지막 문장은 엔드카드 위 2초 잔류
 * 5. 키워드는 대본 JSON의 keywords 배열 (script.ts가 마킹)
 * 6. 타이밍은 ElevenLabs 단어 타임스탬프 (timing.json)
 */
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type {
  ShortsScript,
  ShortsTiming,
  TimedSentence,
} from "../../scripts/shorts-types";
import { FONT_SANS, keywordStyle, NARRATION_DELAY, type ShortsTheme } from "./theme";

const WORD_FADE = 0.28;
const LINGER_BEFORE_NEXT = 0.15;
const MIN_DISPLAY = 0.4;
const LAST_LINGER = 2.0;

interface Window {
  sentence: TimedSentence;
  from: number; // 오디오 시간
  to: number;
}

function displayWindows(timing: ShortsTiming): Window[] {
  return timing.sentences.map((s, i) => {
    const next = timing.sentences[i + 1];
    const to = next
      ? Math.max(next.start - LINGER_BEFORE_NEXT, s.start + MIN_DISPLAY)
      : s.end + LAST_LINGER;
    return { sentence: s, from: s.start, to };
  });
}

export const Captions: React.FC<{
  script: ShortsScript;
  timing: ShortsTiming;
  lang: "ko" | "en";
  th: ShortsTheme;
}> = ({ script, timing, lang, th }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps - NARRATION_DELAY; // 오디오 시간

  const win = displayWindows(timing).find((w) => t >= w.from && t < w.to);
  if (!win) return null;

  const line = script.lines[win.sentence.index];
  if (!line) return null;
  // 훅 문장은 자막을 끈다 — 같은 문장이 화면 중앙 헤드라인으로 이미 크게
  // 떠 있어 중복된다 (Jessi 지시). 헤드라인은 HookCard가 말 따라 갱신.
  if (line.scene === "hook") return null;
  const keywords = new Set(lang === "ko" ? line.keywords : line.keywordsEn);

  return (
    // 자막 안전 구역: 폰 프레임 하단(1390) 아래에서만 논다 — 데모 화면을
    // 가리지 않게 크기도 62→52로 (Jessi 지적)
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        bottom: 190,
        minHeight: 160,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: FONT_SANS,
          fontSize: 52,
          fontWeight: 900,
          lineHeight: 1.3,
          wordBreak: "keep-all",
          textWrap: "balance",
          // 라이트 테마는 어두운 그림자가 지저분하다 — 밝은 글로우로
          textShadow: th.light
            ? "0 2px 18px rgba(255,255,255,.7)"
            : "0 4px 24px rgba(0,0,0,.6)",
          color: th.ink,
        }}
      >
        {win.sentence.words.map((w, i) => {
          // 켜진 뒤에는 꺼지지 않는다 — 문장이 끝날 때까지 유지 (규칙 3)
          const progress = Math.min(1, Math.max(0, (t - w.start) / WORD_FADE));
          const on = progress > 0;
          const isKeyword = keywords.has(w.text);
          return (
            <React.Fragment key={i}>
              <span
                style={{
                  opacity: 0.3 + 0.7 * progress,
                  // 켜지는 순간부터 테마의 키워드 규칙(컬러/밑줄/마커) 적용
                  ...(isKeyword && on ? keywordStyle(th, 0.5) : {}),
                  transition: `color ${WORD_FADE}s ease-out`,
                }}
              >
                {w.text}
              </span>
              {i < win.sentence.words.length - 1 ? " " : null}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
