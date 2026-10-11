// remocn (MIT, https://github.com/Remocn/remocn) 에서 복사해 고쳐 쓴다 — 10/11 시안용.
// 고친 것: 글꼴을 이 채널 글꼴로(한글은 Noto Sans KR, 코드는 JetBrains Mono), 한글 자간 0, 색·크기를 밖에서 받게.

import {
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type React from "react";
import { FONT_SANS } from "../theme";

export interface MarkerHighlightProps {
  before?: string;
  highlight: string;
  after?: string;
  markerColor?: string;
  baseColor?: string;
  highlightedTextColor?: string;
  fontSize?: number;
  fontWeight?: number;
  speed?: number;
  className?: string;
  /** 바깥 상자 — 기본은 화면 가운데. 자막 자리에 쓰려고 밖에서 덮어쓴다 */
  containerStyle?: React.CSSProperties;
  /** 형광펜이 칠해지기 시작하는 프레임 (원본은 15) */
  delay?: number;
}

export function MarkerHighlight({
  before = "",
  highlight,
  after = "",
  markerColor = "#facc15",
  baseColor = "#171717",
  highlightedTextColor = "#171717",
  fontSize = 72,
  fontWeight = 600,
  speed = 1,
  className,
  containerStyle,
  delay = 15,
}: MarkerHighlightProps) {
  const frame = useCurrentFrame() * speed;
  const { fps } = useVideoConfig();

  const markerScale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14 },
  });

  const textColor = interpolateColors(
    interpolate(markerScale, [0.5, 0.8], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    [0, 1],
    [baseColor, highlightedTextColor],
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...containerStyle,
      }}
    >
      <span
        className={className}
        style={{
          fontSize,
          fontWeight,
          color: baseColor,
          letterSpacing: 0,
          fontFamily: FONT_SANS,
          wordBreak: "keep-all",
          textWrap: "balance",
          textAlign: "center",
        }}
      >
        {before}
        <span style={{ position: "relative", display: "inline-block" }}>
          <span
            aria-hidden
            style={{
              position: "absolute",
              inset: "0 -0.1em",
              background: markerColor,
              transformOrigin: "left center",
              scale: `${markerScale} 1`,
              zIndex: 0,
            }}
          />
          <span style={{ position: "relative", zIndex: 1, color: textColor }}>
            {highlight}
          </span>
        </span>
        {after}
      </span>
    </div>
  );
}
