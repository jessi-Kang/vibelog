/**
 * 장면이 들어오는 효과 — 장면 종류가 고른다 (10/11, remocn 효과를 실제 쇼츠에).
 *
 * 전에는 모든 장면이 "흐려졌다 나타나며 20px 올라오기" 하나였다. Jessi가 remocn 시안을 보고
 * …
 * 번갈아 돌리지 않는다 — 같은 종류의 장면은 늘 같은 방식으로 들어온다 (구성은 내용이 정한다).
 *   …
 *   push   옆에서 밀려 들어온다 (remocn short-slide에서) — 실제 사이트 화면
 *   zoom   가까이 다가오며 자리 잡는다 (remocn shared-axis-z에서) — 다이어그램·아이콘·모티프
 *   drop   아래에서 튕기듯 올라온다 (spring) — 생성 그림
 *   stamp  살짝 크게 찍혔다 자리 잡는다 (remocn caption-stamp에서) — 삽질 카드
 * 흐림(blur) 필터는 쓰지 않는다. 나가는 쪽은 예전처럼 다 사라진 뒤 다음 장면이 들어온다 —
 * 겹치는 크로스페이드는 레이아웃이 다른 장면끼리 애매하게 겹쳐 보였다 (Jessi).
 */
import React from "react";
import { AbsoluteFill, Easing, interpolate, spring } from "remotion";
import type { ShortsTheme } from "./theme";

export type EnterEffect = "none" | "caret" | "push" | "zoom" | "drop" | "stamp";

type SceneKind = "cold" | "hook" | "phone" | "fail" | "end" | "art" | "diagram" | "plain";

/** 이 장면이 어떻게 들어올지 — 장면 종류와 바로 앞 장면이 정한다 */
export function enterOf(kind: SceneKind, prev: SceneKind | null): EnterEffect {
  if (prev == null) return "none";
  switch (kind) {
    case "hook":
      // 터미널(커밋 콜드오픈)에서 넘어오면 커서가 화면을 새로 쓴다
      return prev === "cold" ? "caret" : "zoom";
    case "end":
      return "caret";
    case "phone":
      return "push";
    case "diagram":
    case "plain":
      return "zoom";
    case "art":
      return "drop";
    case "fail":
      return "stamp";
    default:
      return "zoom";
  }
}

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 들어오는 데 걸리는 시간(초) */
export const ENTER_SEC: Record<EnterEffect, number> = {
  none: 0,
  caret: 0.55,
  push: 0.45,
  zoom: 0.42,
  drop: 0.6,
  stamp: 0.3,
};

/**
 * 장면을 감싸 들어오는 효과를 입힌다. local은 장면이 시작된 뒤 지난 초.
 * 효과가 끝난 뒤에는 아무것도 덧씌우지 않는다 — 장면 안의 연출(폰 카메라워크 등)을 건드리지 않게.
 */
export const Enter: React.FC<{
  effect: EnterEffect;
  local: number;
  fps: number;
  th: ShortsTheme;
  children: React.ReactNode;
}> = ({ effect, local, fps, th, children }) => {
  const dur = ENTER_SEC[effect];
  if (effect === "none" || local >= dur + 0.05) return <AbsoluteFill>{children}</AbsoluteFill>;
  const p = interpolate(local, [0, dur], [0, 1], clamp);

  if (effect === "caret") {
    const e = interpolate(p, [0, 1], [0, 1], { ...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1) });
    const x = e * 100;
    const caretOpacity = interpolate(p, [0, 0.08, 0.92, 1], [0, 1, 1, 0], clamp);
    return (
      <AbsoluteFill>
        <AbsoluteFill style={{ clipPath: `inset(0 ${100 - x}% 0 0)` }}>{children}</AbsoluteFill>
        <div
          style={{
            position: "absolute",
            left: `${x}%`,
            top: "29%",
            height: "42%",
            width: 6,
            translate: "-50%",
            borderRadius: 6,
            background: th.accent,
            opacity: caretOpacity,
          }}
        />
      </AbsoluteFill>
    );
  }

  if (effect === "push") {
    const e = interpolate(p, [0, 1], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
    return (
      <AbsoluteFill style={{ opacity: Math.min(1, p * 2.5), transform: `translateX(${(1 - e) * 180}px)` }}>
        {children}
      </AbsoluteFill>
    );
  }

  if (effect === "zoom") {
    const e = interpolate(p, [0, 1], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
    return (
      <AbsoluteFill style={{ opacity: Math.min(1, p * 2), transform: `scale(${0.88 + 0.12 * e})` }}>
        {children}
      </AbsoluteFill>
    );
  }

  if (effect === "drop") {
    const sp = spring({ frame: local * fps, fps, config: { damping: 15, stiffness: 120 } });
    return (
      <AbsoluteFill style={{ opacity: Math.min(1, p * 4), transform: `translateY(${(1 - sp) * 240}px)` }}>
        {children}
      </AbsoluteFill>
    );
  }

  // stamp — 살짝 크게 찍혔다가 제자리로
  const s = interpolate(p, [0, 1], [1.16, 1], { ...clamp, easing: Easing.out(Easing.back(2.2)) });
  return (
    <AbsoluteFill style={{ opacity: Math.min(1, p * 3), transform: `scale(${s})` }}>{children}</AbsoluteFill>
  );
};
