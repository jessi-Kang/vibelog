/**
 * 장면이 들어오는 효과 (10/11, remocn 효과를 실제 쇼츠에).
 *
 * 전에는 모든 장면이 "흐려졌다 나타나며 20px 올라오기" 하나였다.
 * 그래서 장면 종류마다 어울리는 효과 몇 가지를 두고 장면마다 하나를 고른다. 바로 앞 장면과 같은
 * 효과는 피한다. 고르는 값은 편 번호(day)와 장면 순번에서 나와, 같은 편을 다시 렌더해도 같다.
 * 훅(인트로 글)과 마무리 카드에는 장면 효과를 덧씌우지 않는다 — 글자가 제 움직임을 따로 정해 두었다
 * (훅은 제자리에서 옅게→또렷하게, 자막은 그대로). 처음엔 그 둘에 타자 커서가 화면을 쓸며 드러내는 효과를
 * 얹었는데, 글자가 닦이듯 나타났다 (10/11).
 * 흐림(blur) 필터는 쓰지 않는다. 나가는 쪽은 예전처럼 다 사라진 뒤 다음 장면이 들어온다 —
 * 겹치는 크로스페이드는 레이아웃이 다른 장면끼리 애매하게 겹쳐 보였다.
 */
import React from "react";
import { AbsoluteFill, Easing, interpolate, spring } from "remotion";
import type { ShortsTheme } from "./theme";

export type EnterEffect =
  | "none"
  | "fade" // 제자리에서 나타나기만 — 움직임 없음. 훅·마무리처럼 글자가 제 움직임을 가진 장면
  | "push-right" // 오른쪽에서 밀려 들어온다 (remocn short-slide)
  | "push-left"
  | "rise" // 아래에서 올라오며 자리 잡는다
  | "zoom-in" // 작게 시작해 다가온다 (remocn shared-axis-z)
  | "zoom-out" // 크게 시작해 물러나며 자리 잡는다
  | "drop" // 아래에서 튕기듯 올라온다 (spring)
  | "stamp" // 살짝 크게 찍혔다 제자리 (remocn caption-stamp)
  | "iris" // 가운데 원이 열리며 드러난다
  | "split" // 가운데 가로 틈이 위아래로 열린다
  | "mask-up"; // 아래 선에서부터 위로 드러난다 (remocn mask-reveal-up)

type SceneKind = "cold" | "hook" | "phone" | "fail" | "end" | "art" | "diagram" | "plain";

/** 장면 종류마다 어울리는 효과들 — 이 안에서 고른다 */
const POOL: Record<SceneKind, EnterEffect[]> = {
  cold: ["zoom-in"],
  hook: ["fade"],
  phone: ["push-right", "push-left", "rise", "mask-up", "zoom-out"],
  diagram: ["zoom-in", "iris", "rise", "split", "mask-up"],
  plain: ["zoom-in", "iris", "rise", "zoom-out", "drop"],
  art: ["drop", "iris", "zoom-out", "rise"],
  fail: ["stamp", "split", "zoom-out"],
  end: ["fade"],
};

/** 편 번호와 장면 순번으로 고르는 정수 — 같은 편은 늘 같은 값 */
function pickIndex(day: number, i: number, n: number): number {
  let h = (day * 2654435761 + i * 40503) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995) >>> 0;
  return h % n;
}

/** 장면마다 들어오는 효과를 정한다 (첫 장면은 없음) */
export function enterEffects(kinds: SceneKind[], day: number): EnterEffect[] {
  const out: EnterEffect[] = [];
  kinds.forEach((kind, i) => {
    if (i === 0) return out.push("none");
    const pool = POOL[kind] ?? POOL.plain;
    let e = pool[pickIndex(day, i, pool.length)];
    if (e === out[i - 1] && pool.length > 1) e = pool[(pool.indexOf(e) + 1) % pool.length];
    out.push(e);
  });
  return out;
}

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 들어오는 데 걸리는 시간(초) */
export const ENTER_SEC: Record<EnterEffect, number> = {
  none: 0,
  fade: 0.3,
  "push-right": 0.45,
  "push-left": 0.45,
  rise: 0.45,
  "zoom-in": 0.42,
  "zoom-out": 0.45,
  drop: 0.6,
  stamp: 0.3,
  iris: 0.5,
  split: 0.45,
  "mask-up": 0.5,
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

  const ease = interpolate(p, [0, 1], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const wrap = (style: React.CSSProperties) => <AbsoluteFill style={style}>{children}</AbsoluteFill>;

  if (effect === "fade") return wrap({ opacity: ease });

  if (effect === "push-right" || effect === "push-left") {
    const dir = effect === "push-right" ? 1 : -1;
    return wrap({ opacity: Math.min(1, p * 2.5), transform: `translateX(${dir * (1 - ease) * 180}px)` });
  }
  if (effect === "rise") {
    return wrap({ opacity: Math.min(1, p * 2.5), transform: `translateY(${(1 - ease) * 140}px)` });
  }
  if (effect === "zoom-in") {
    return wrap({ opacity: Math.min(1, p * 2), transform: `scale(${0.88 + 0.12 * ease})` });
  }
  if (effect === "zoom-out") {
    return wrap({ opacity: Math.min(1, p * 2), transform: `scale(${1.1 - 0.1 * ease})` });
  }
  if (effect === "drop") {
    const sp = spring({ frame: local * fps, fps, config: { damping: 15, stiffness: 120 } });
    return wrap({ opacity: Math.min(1, p * 4), transform: `translateY(${(1 - sp) * 240}px)` });
  }
  if (effect === "iris") {
    // 화면 대각선 반지름(약 110%)까지 원이 열린다
    return wrap({ clipPath: `circle(${ease * 115}% at 50% 48%)` });
  }
  if (effect === "split") {
    const half = (1 - ease) * 50;
    return wrap({ clipPath: `inset(${half}% 0 ${half}% 0)` });
  }
  if (effect === "mask-up") {
    return wrap({ clipPath: `inset(${(1 - ease) * 100}% 0 0 0)`, transform: `translateY(${(1 - ease) * 40}px)` });
  }

  // stamp — 살짝 크게 찍혔다가 제자리로
  const s = interpolate(p, [0, 1], [1.16, 1], { ...clamp, easing: Easing.out(Easing.back(2.2)) });
  return (
    <AbsoluteFill style={{ opacity: Math.min(1, p * 3), transform: `scale(${s})` }}>{children}</AbsoluteFill>
  );
};
