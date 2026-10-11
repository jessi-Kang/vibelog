// remocn (MIT, https://github.com/Remocn/remocn) 에서 복사해 고쳐 쓴다 — 10/11 시안용.
// 고친 것: 글꼴을 이 채널 글꼴로(한글은 Noto Sans KR, 코드는 JetBrains Mono), 한글 자간 0, 색·크기를 밖에서 받게.

import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export interface DriftProps {
  children: React.ReactNode;
  grow?: number;
}

export function Drift({ children, grow = 0.035 }: DriftProps) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const scale = interpolate(frame, [0, durationInFrames], [1, 1 + grow]);
  return <AbsoluteFill style={{ scale: `${scale}` }}>{children}</AbsoluteFill>;
}
