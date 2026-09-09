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
import { COLORS, FONT_SANS, NARRATION_DELAY } from "./theme";

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
}> = ({ script, timing, lang }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps - NARRATION_DELAY; // 오디오 시간

  const win = displayWindows(timing).find((w) => t >= w.from && t < w.to);
  if (!win) return null;

  const line = script.lines[win.sentence.index];
  if (!line) return null;
  const keywords = new Set(lang === "ko" ? line.keywords : line.keywordsEn);

  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        bottom: 190,
        minHeight: 200,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: FONT_SANS,
          fontSize: 62,
          fontWeight: 900,
          lineHeight: 1.3,
          wordBreak: "keep-all",
          textWrap: "balance",
          textShadow: "0 4px 24px rgba(0,0,0,.6)",
          color: COLORS.ink,
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
                  color: isKeyword && on ? COLORS.accent : undefined,
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
