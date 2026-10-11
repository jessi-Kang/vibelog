// remocn (MIT, https://github.com/Remocn/remocn) 에서 복사해 고쳐 쓴다 — 10/11 시안용.
// 고친 것: 글꼴을 이 채널 글꼴로(한글은 Noto Sans KR, 코드는 JetBrains Mono), 한글 자간 0, 색·크기를 밖에서 받게.

import type React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONT_MONO } from "../theme";

const MONO_FAMILY = FONT_MONO;

export interface RollingNumberProps {
  from?: number;
  to?: number;
  fontSize?: number;
  color?: string;
  speed?: number;
}

const COUNT_PORTION = 0.8;
const COUNT_EASING = Easing.out(Easing.poly(4));
const REVEAL_BAND = 0.4;
const REVEAL_EASING = Easing.inOut(Easing.sin);
const REVEAL_RISE_EM = 0.32;

function easedProgress(
  frame: number,
  speed: number,
  durationInFrames: number,
): number {
  return interpolate(
    frame * speed,
    [0, durationInFrames * COUNT_PORTION],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: COUNT_EASING,
    },
  );
}

function placeTravel(start: number, end: number, place: number): number {
  const pow = 10 ** place;
  const up = end >= start;
  const diff = Math.abs(end - start);
  const startDigit = Math.floor(start / pow) % 10;
  const finalDigit = Math.floor(end / pow) % 10;
  const fullTurns = Math.floor(diff / (pow * 10));
  const stepDelta = up
    ? (finalDigit - startDigit + 10) % 10
    : (startDigit - finalDigit + 10) % 10;
  const magnitude = fullTurns * 10 + stepDelta;
  return up ? magnitude : -magnitude;
}

function placeReveal(current: number, place: number): number {
  if (place === 0) return 1;
  const threshold = 10 ** place;
  return interpolate(current, [threshold * REVEAL_BAND, threshold], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: REVEAL_EASING,
  });
}

function wrap10(value: number): number {
  return ((value % 10) + 10) % 10;
}

function DigitColumn({
  value,
  fontSize,
  reveal,
}: {
  value: number;
  fontSize: number;
  reveal: number;
}) {
  const cellHeight = fontSize * 1.1;
  return (
    <span
      style={{
        display: "inline-block",
        overflow: "hidden",
        height: cellHeight,
        width: "0.62em",
        verticalAlign: "top",
        textAlign: "center",
        opacity: reveal,
        translate: `0 ${(1 - reveal) * fontSize * REVEAL_RISE_EM}px`,
      }}
    >
      <span
        style={{
          display: "flex",
          flexDirection: "column",
          translate: `0 ${-value * cellHeight}px`,
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d, i) => (
          <span
            key={i}
            style={{ height: cellHeight, lineHeight: `${cellHeight}px` }}
          >
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

export function RollingNumber({
  from = 0,
  to = 24813,
  fontSize = 120,
  color = "#171717",
  speed = 1,
}: RollingNumberProps) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const start = Math.max(0, Math.round(from));
  const end = Math.max(0, Math.round(to));

  const e = easedProgress(frame, speed, durationInFrames);
  const current = start + e * (end - start);

  const maxVal = Math.max(start, end);
  const digits = String(maxVal);
  const cellHeight = fontSize * 1.1;

  const cells: React.ReactNode[] = [];
  for (let place = 0; place < digits.length; place++) {
    if (place > 0 && place % 3 === 0) {
      cells.unshift(
        <span
          key={`s${place}`}
          style={{
            display: "inline-block",
            width: "0.34em",
            height: cellHeight,
          }}
        />,
      );
    }
    const pow = 10 ** place;
    const startDigit = Math.floor(start / pow) % 10;
    const travel = placeTravel(start, end, place);
    const pos = startDigit + e * travel;
    cells.unshift(
      <DigitColumn
        key={`d${place}`}
        value={wrap10(pos)}
        fontSize={fontSize}
        reveal={placeReveal(current, place)}
      />,
    );
  }

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          fontSize,
          fontWeight: 800,
          color,
          fontFamily: MONO_FAMILY,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.03em",
          lineHeight: 1,
        }}
      >
        {cells}
      </div>
    </AbsoluteFill>
  );
}

/**
 * 쇼츠의 숫자 인서트(StatPunch)용 — 화면 가운데를 차지하지 않고 글줄 안에 놓인다.
 * progress(0–1)는 부르는 쪽이 시간으로 정한다 (원본은 영상 전체 길이에 맞춰 굴러서, 긴 영상
 * 안에서는 너무 느렸다). 천 단위 자리에는 빈칸 대신 콤마를 찍는다 — 숫자 표기 규칙.
 */
export function RollingInline({
  to,
  progress,
  fontSize,
}: {
  to: number;
  progress: number;
  fontSize: number;
}) {
  const end = Math.max(0, Math.round(to));
  const e = COUNT_EASING(Math.min(1, Math.max(0, progress)));
  const current = e * end;
  const digits = String(end);
  const cellHeight = fontSize * 1.1;
  const cells: React.ReactNode[] = [];
  for (let place = 0; place < digits.length; place++) {
    if (place > 0 && place % 3 === 0) {
      cells.unshift(
        <span key={`c${place}`} style={{ display: "inline-block", height: cellHeight, lineHeight: `${cellHeight}px` }}>
          ,
        </span>,
      );
    }
    const travel = placeTravel(0, end, place);
    cells.unshift(
      <DigitColumn
        key={`d${place}`}
        value={wrap10(e * travel)}
        fontSize={fontSize}
        reveal={placeReveal(current, place)}
      />,
    );
  }
  return <span style={{ display: "inline-flex", alignItems: "flex-start", fontVariantNumeric: "tabular-nums" }}>{cells}</span>;
}
