/**
 * ArtTextTry — **검수용** 컴포지션. 발행 파이프라인은 쓰지 않는다.
 *
 * 쇼츠 그림 장면의 세로 자리 시안 (10/11, Jessi: "…").
 * 지금은 그림 가운데가 화면 46%(883px)에 있다. 얼마나 내릴지 견준다.
 * 그림은 video/public/sheet/에 둔다 (커밋하지 않는다 — art-try 시안 그림).
 */
import React from "react";
import { AbsoluteFill } from "remotion";
import { ArtCard, Background } from "./Scenes";
import { FONT_MONO, FONT_SANS, getTheme, keywordStyle } from "./theme";

export const ArtTextTry: React.FC<{ centerY?: number; theme?: string | null; file?: string }> = ({
  centerY = 883,
  theme,
  file = "sheet/flat-review.png",
}) => {
  const th = getTheme(theme);
  return (
    <AbsoluteFill style={{ background: th.bg }}>
      <Background th={th} />
      <div style={{ position: "absolute", top: 88, left: 80, fontFamily: FONT_MONO, fontSize: 30, fontWeight: 700, letterSpacing: "0.08em", color: th.muted }}>
        <span style={{ color: th.accent }}>VIBELOG</span> · DAY 10
      </div>
      <ArtCard file={file} th={th} centerY={centerY} />
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
    </AbsoluteFill>
  );
};
