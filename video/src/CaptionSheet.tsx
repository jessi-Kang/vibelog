/**
 * CaptionSheet — **검수용** 컴포지션. 발행 파이프라인은 쓰지 않는다.
 *
 * 자막 표시 방식 시안 (10/11). 실제 쇼츠의 대본·낱말 타이밍으로 자막만 그려 견준다.
 * 흐림은 쓰지 않는다. remocn의 자막 효과들에서 가져왔다:
 *   now        지금 — 낱말이 옅게(0.3) 있다가 말할 때 또렷해진다, 키워드는 켜지면 강조색 유지
 *   marker     문장이 통째로 뜨고, 키워드를 말하는 순간 형광펜이 칠해진다 (caption-marker)
 *   rise       낱말이 말하는 순간 바닥선 아래에서 올라온다 (caption-rise)
 *   pop        문장이 통째로 뜨고, 말하는 낱말이 강조색으로 살짝 커졌다 돌아온다 (caption-active-pop)
 *   underline  말하는 낱말 밑으로 막대가 따라간다 (caption-underline)
 *   word       한 번에 낱말 하나만 크게, 말할 때마다 튀어나온다 (caption-word-pop)
 * 렌더: cd video && npx remotion render CaptionSheet out.mp4 --props=props.json
 */
import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { ShortsScript, ShortsTiming } from "../../scripts/shorts-types";
import { Background } from "./Scenes";
import { Captions } from "./Captions";
import { FONT_MONO, FONT_SANS, getTheme, keywordIndices, type ShortsTheme } from "./theme";

export type CaptionStyle = "now" | "marker" | "rise" | "pop" | "underline" | "word";

export interface CaptionSheetProps {
  script: ShortsScript;
  timing: ShortsTiming;
  style?: CaptionStyle;
  theme?: string | null;
  /** 오디오 몇 초부터 보여 줄지 — 훅 문장은 자막이 없으니 그 뒤부터 */
  fromSec?: number;
}

const LABEL: Record<CaptionStyle, string> = {
  now: "지금",
  marker: "형광펜",
  rise: "아래에서 올라오기",
  pop: "말하는 낱말 강조",
  underline: "밑줄 따라가기",
  word: "낱말 하나씩",
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const Box: React.FC<{ th: ShortsTheme; children: React.ReactNode; size?: number }> = ({ th, children, size = 52 }) => (
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
        fontSize: size,
        fontWeight: 900,
        lineHeight: 1.42,
        wordBreak: "keep-all",
        textWrap: "pretty",
        color: th.ink,
      }}
    >
      {children}
    </div>
  </div>
);

const Variant: React.FC<{ script: ShortsScript; timing: ShortsTiming; th: ShortsTheme; style: CaptionStyle; at: number }> = ({
  script,
  timing,
  th,
  style,
  at,
}) => {
  const { fps } = useVideoConfig();
  // 지금 문장 — 다음 문장 시작 직전까지 남는다 (지금 자막과 같은 규칙)
  const idx = timing.sentences.findIndex((s, i) => {
    const next = timing.sentences[i + 1];
    return at >= s.start && at < (next ? next.start - 0.15 : s.end + 2);
  });
  if (idx < 0) return null;
  const sen = timing.sentences[idx];
  const line = script.lines[sen.index];
  if (!line || line.scene === "hook") return null;
  const words = sen.words;
  const kw = keywordIndices(
    words.map((w) => w.text),
    line.keywords,
  );
  const cur = words.findIndex((w, i) => at >= w.start && at < (words[i + 1]?.start ?? w.end + 0.3));

  if (style === "word") {
    const w = words[Math.max(0, cur)] ?? words[words.length - 1];
    const sp = spring({ frame: Math.max(0, (at - w.start) * fps), fps, config: { damping: 12, stiffness: 180 } });
    const on = kw.has(words.indexOf(w));
    return (
      <Box th={th} size={96}>
        <span style={{ display: "inline-block", transform: `scale(${0.6 + 0.4 * sp})`, color: on ? th.accent : th.ink }}>{w.text}</span>
      </Box>
    );
  }

  return (
    <Box th={th}>
      {words.map((w, i) => {
        const spoken = at >= w.start;
        const isKw = kw.has(i);
        const sep = i < words.length - 1 ? " " : null;
        if (style === "marker") {
          const m = interpolate(at, [w.start, w.start + 0.25], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
          return (
            <React.Fragment key={i}>
              {isKw ? (
                <span style={{ position: "relative", display: "inline-block" }}>
                  <span
                    style={{
                      position: "absolute",
                      inset: "0.12em -0.12em 0.04em",
                      background: th.accent,
                      borderRadius: 6,
                      transformOrigin: "left center",
                      transform: `scaleX(${m})`,
                    }}
                  />
                  <span style={{ position: "relative", color: m > 0.6 ? th.accentInk : th.ink }}>{w.text}</span>
                </span>
              ) : (
                <span>{w.text}</span>
              )}
              {sep}
            </React.Fragment>
          );
        }
        if (style === "rise") {
          const r = interpolate(at, [w.start, w.start + 0.22], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
          return (
            <React.Fragment key={i}>
              <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", paddingBottom: 4 }}>
                <span
                  style={{
                    display: "inline-block",
                    transform: `translateY(${(1 - r) * 110}%)`,
                    color: isKw && spoken ? th.accent : th.ink,
                  }}
                >
                  {w.text}
                </span>
              </span>
              {sep}
            </React.Fragment>
          );
        }
        if (style === "pop") {
          const sp = spring({ frame: Math.max(0, (at - w.start) * fps), fps, config: { damping: 10, stiffness: 200 } });
          const active = i === cur;
          const k = active ? 1 + 0.12 * Math.sin(Math.min(1, sp) * Math.PI) : 1;
          return (
            <React.Fragment key={i}>
              <span
                style={{
                  display: "inline-block",
                  transform: `scale(${k})`,
                  color: active || (isKw && spoken) ? th.accent : th.ink,
                }}
              >
                {w.text}
              </span>
              {sep}
            </React.Fragment>
          );
        }
        if (style === "underline") {
          const active = i === cur;
          return (
            <React.Fragment key={i}>
              <span style={{ position: "relative", display: "inline-block", color: isKw && spoken ? th.accent : th.ink }}>
                {w.text}
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: "0.02em",
                    height: 7,
                    borderRadius: 4,
                    background: th.accent,
                    opacity: active ? 1 : 0,
                    transform: `scaleX(${active ? interpolate(at, [w.start, w.start + 0.15], [0.3, 1], clamp) : 0})`,
                  }}
                />
              </span>
              {sep}
            </React.Fragment>
          );
        }
        return null;
      })}
    </Box>
  );
};

export const CaptionSheet: React.FC<CaptionSheetProps> = ({ script, timing, style = "now", theme, fromSec = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const th = getTheme(theme ?? script.theme);
  const at = frame / fps + fromSec;
  return (
    <AbsoluteFill style={{ background: th.bg }}>
      <Background th={th} />
      <div style={{ position: "absolute", top: 88, left: 80, fontFamily: FONT_MONO, fontSize: 30, letterSpacing: ".14em", color: th.muted }}>
        자막 · {LABEL[style]}
      </div>
      {style === "now" ? (
        // 지금 자막 그대로 — 오프셋으로 같은 시각을 맞춘다
        <Captions script={script} timing={timing} lang="ko" th={th} offsetSec={-fromSec} />
      ) : (
        <Variant script={script} timing={timing} th={th} style={style} at={at} />
      )}
    </AbsoluteFill>
  );
};
