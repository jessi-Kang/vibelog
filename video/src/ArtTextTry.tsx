/**
 * ArtTextTry — **검수용** 컴포지션. 발행 파이프라인은 쓰지 않는다.
 *
 * …
 *   now   지금 — 그림만, 자막은 아래
 *   a     그림 위에 그 문장의 핵심 말을 제목처럼
 *   b     그림 아래에 핵심 말을 크게, 그림은 조금 작게
 *   c     아이콘 장면 — 판 위 아이콘 아래에 핵심 말
 * 그림은 video/public/sheet/에 둔다 (커밋하지 않는다 — art-try 시안 그림).
 */
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Background } from "./Scenes";
import { FONT_SANS, getTheme, keywordStyle, type ShortsTheme } from "./theme";

const SENTENCE = "실제 단지 자료는 사람이 검토한 뒤에만 문제로 올립니다.";
const KEY = "사람이 검토한 뒤에만";

const Caption: React.FC<{ th: ShortsTheme }> = ({ th }) => (
  <div
    style={{
      position: "absolute",
      left: 70,
      right: 70,
      bottom: 190,
      textAlign: "center",
      fontFamily: FONT_SANS,
      fontSize: 52,
      fontWeight: 900,
      lineHeight: 1.3,
      wordBreak: "keep-all",
      color: th.ink,
    }}
  >
    실제 단지 자료는 <span style={keywordStyle(th, 0.5)}>사람이 검토한 뒤에만</span> 문제로 올립니다.
  </div>
);

const Head: React.FC<{ th: ShortsTheme; top: number; size: number }> = ({ th, top, size }) => (
  <div
    style={{
      position: "absolute",
      left: 90,
      right: 90,
      top,
      textAlign: "center",
      fontFamily: FONT_SANS,
      fontWeight: 900,
      fontSize: size,
      lineHeight: 1.2,
      wordBreak: "keep-all",
      color: th.accent,
    }}
  >
    {KEY}
  </div>
);

export const ArtTextTry: React.FC<{ variant?: "now" | "a" | "b" | "c"; theme?: string | null }> = ({
  variant = "now",
  theme,
}) => {
  const th = getTheme(theme);
  const art = (top: number, size: number) => (
    <Img
      src={staticFile("sheet/flat-review.png")}
      style={{ position: "absolute", left: (1080 - size) / 2, top, width: size, height: size, objectFit: "contain" }}
    />
  );
  return (
    <AbsoluteFill style={{ background: th.bg }}>
      <Background th={th} />
      {variant === "now" && art(470, 820)}
      {variant === "a" && (
        <>
          <Head th={th} top={330} size={84} />
          {art(560, 720)}
        </>
      )}
      {variant === "b" && (
        <>
          {art(330, 680)}
          <Head th={th} top={1060} size={96} />
        </>
      )}
      {variant === "c" && (
        <>
          <div
            style={{
              position: "absolute",
              left: 330,
              top: 520,
              width: 420,
              height: 420,
              display: "grid",
              placeItems: "center",
              background: th.panel,
              border: `4px solid ${th.line}`,
              borderRadius: th.radius,
            }}
          >
            <svg viewBox="0 0 24 24" width={220} height={220} fill="none" stroke={th.accent} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0-8 0M6 21v-2a4 4 0 0 1 4-4h4m1 4l2 2l4-4" />
            </svg>
          </div>
          <Head th={th} top={1010} size={84} />
        </>
      )}
      <Caption th={th} />
    </AbsoluteFill>
  );
};
