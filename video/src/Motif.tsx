/**
 * Motif — 화면도 그림도 못 고른 문장의 빈 자리를 채우는 **라벨 없는 아이콘** 열여섯.
 *
 * 다이어그램(5종)과 역할이 다르다. 다이어그램은 라벨을 달아 "원리"를 설명하고,
 * 모티프는 라벨 없이 문장의 **모양**만 보여 준다 — 반복·지켜봄·쌓임·되돌아감처럼
 * 말로는 이미 다 한 이야기에 그림을 하나 얹는 자리다. 그래서 글자가 없다.
 *
 * 대본은 종류 이름 하나만 고른다 (`line.motif`). 그림은 여기서 테마 토큰으로
 * 그린다 — 다이어그램과 같은 규칙이다.
 *
 * ── 박자 ──
 * 한 편이 BEAT초. 아래 퍼센트는 그 안에서의 구간이다.
 *   0~10%    가만히
 *   10~55%   움직임
 *   55~70%   뜻이 박히는 순간 (강조색이 여기서 켜진다)
 *   70~100%  머무름
 * 순서는 **구간으로** 만든다. 지연으로는 못 만든다 — 시작이 다른 게 아니라
 * 각자 제 구간을 갖는 것이라, 늦게 시작해야 할 것이 먼저 그려지지 않는다.
 *
 * ── 그리기 규칙 (시안 검수에서 확정) ──
 * - 움직임은 전부 **속성값**으로 낸다 (r·x·width·cx…). CSS transform과
 *   transform-box에 기대지 않는다 — 프레임 단위로 다시 그리는 렌더에서
 *   기준점이 흔들릴 여지를 없앤다.
 * - 선을 감출 때 `strokeDasharray`는 `1`이 아니라 `1 2`다. `1`이면 패턴이
 *   [1 켜짐 / 1 꺼짐]이라 offset 1에서 길이 0짜리 다음 칸이 선 **끝점**에
 *   걸리고, round 마감이 거기에 점을 찍는다 (fanin에서 선 셋이 모이는 자리에
 *   점이 미리 보이던 것).
 * - 시작 offset은 1이 아니라 1.06이다. 1에서 출발하면 길이가 거의 0인 토막이
 *   잠깐 멈춰 있고, 그게 선 **시작점**의 점으로 보인다 (merge는 선이 둘이라
 *   점도 둘이었다).
 * - 화살촉은 선을 다 그린 뒤에 켠다. 도착 도형에는 닿지 않는다.
 */
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { MotifName } from "../../scripts/shorts-types";
import type { ShortsTheme } from "./theme";

/** 한 편의 길이(초). 뜻이 박히는 순간(60~70%)이 1.3~1.5초에 온다 —
 *  짧은 문장에서도 결론을 보고 넘어갈 수 있는 길이다. */
const BEAT = 2.2;
/** 무대 — 자막 위, 헤드라인 아래의 가운데 (다이어그램과 같은 자리) */
const CY = 1020;
const SIZE = 660;
const SW = 3.2;

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const easeOut = (p: number): number => 1 - Math.pow(1 - clamp01(p), 3);

/** 장면 시작 t초일 때, 이 편의 a%~b% 구간 진행도 (0~1) */
function ph(t: number, a: number, b: number, lin = false): number {
  const s = (a / 100) * BEAT;
  const e = (b / 100) * BEAT;
  const p = clamp01((t - s) / Math.max(1e-6, e - s));
  return lin ? p : easeOut(p);
}

/** 선을 p만큼 그린 상태의 dash 속성 (pathLength=1인 도형이면 path·circle 모두) */
const drawn = (
  p: number,
): { pathLength: number; strokeDasharray: string; strokeDashoffset: number } => ({
  pathLength: 1,
  strokeDasharray: "1 2",
  strokeDashoffset: 1.06 * (1 - p),
});

type C = { line: string; hi: string; ink: string };

/** 선 도형 공통 — 한 굵기, 둥근 마감 */
const L: React.FC<React.SVGProps<SVGPathElement> & { c: string }> = ({
  c,
  ...p
}) => (
  <path
    fill="none"
    stroke={c}
    strokeWidth={SW}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  />
);

function body(name: MotifName, t: number, c: C): React.ReactNode {
  const F = 0.26; // 배경 선(있다는 것만 알리는 자리)의 진하기

  switch (name) {
    /** 반복 · 저절로 — 한 바퀴 돌아 제자리로 */
    case "loop": {
      const d = ph(t, 6, 50);
      return (
        <>
          <circle
            cx={60}
            cy={62}
            r={34}
            fill="none"
            stroke={c.line}
            strokeWidth={SW}
            opacity={F}
          />
          <L c={c.hi} d="M60 28 A34 34 0 1 1 26.6 68.4" {...drawn(d)} />
          <L c={c.hi} d="M52 22 L60 28 L52 34" opacity={ph(t, 48, 58)} />
          <circle cx={60} cy={62} r={5 * ph(t, 58, 70)} fill={c.hi} />
        </>
      );
    }

    /** 지켜보기 · 확인 — 훑개가 가운데를 지나는 순간 점이 켜진다 */
    case "watch": {
      const p = ph(t, 4, 88, true);
      const x = 16 + 88 * p;
      const fade = clamp01(ph(t, 4, 12, true)) * (1 - ph(t, 80, 88, true));
      return (
        <>
          <L c={c.line} d="M16 62 H104" opacity={F} />
          <L c={c.line} d="M16 44 V80 M104 44 V80" opacity={F} />
          <L c={c.hi} d={`M${x.toFixed(2)} 34 V90`} opacity={fade} />
          <circle cx={60} cy={62} r={6} fill={c.hi} opacity={ph(t, 42, 52)} />
        </>
      );
    }

    /** 관문 · 검토 — 셋이 줄지어 문을 지나고, 강조 상자가 지날 때 체크가 켜진다 */
    case "gate": {
      const box = (a: number, b: number, hi: boolean, key: string) => {
        const p = ph(t, a, b, true);
        const x = -59 + 172 * p;
        const io =
          clamp01(ph(t, a, a + 8, true)) * (1 - ph(t, b - 8, b, true));
        if (io <= 0) return null;
        return (
          <rect
            key={key}
            x={x.toFixed(2)}
            y={52}
            width={19}
            height={19}
            rx={3}
            fill="none"
            stroke={hi ? c.hi : c.line}
            strokeWidth={SW}
            strokeLinejoin="round"
            opacity={io}
          />
        );
      };
      return (
        <>
          <L c={c.ink} d="M62 26 V98" opacity={0.55} />
          <L c={c.line} d="M14 62 H106" opacity={F} />
          {box(2, 36, false, "a")}
          {box(20, 54, false, "b")}
          {box(38, 72, true, "c")}
          <L c={c.hi} d="M74 40 L80 46 L92 32" opacity={ph(t, 60, 70)} />
        </>
      );
    }

    /** 쌓임 · 모으기 — 하나씩 또렷하게 올라온다 */
    case "stack":
    case "limit": {
      const lim = name === "limit";
      const bars: [number, number, number, number, number][] = lim
        ? [
            [26, 16, 22, 6, 24],
            [52, 16, 36, 18, 36],
            [78, 16, 54, 32, 54],
          ]
        : [
            [22, 15, 26, 6, 24],
            [45, 15, 38, 18, 36],
            [68, 15, 48, 30, 48],
            [91, 15, 62, 42, 60],
          ];
      return (
        <>
          {lim && (
            <L
              c={c.ink}
              d="M14 36 H106"
              strokeDasharray="7 7"
              opacity={0.6}
            />
          )}
          {bars.map(([x, w, h, a, b], i) => {
            const p = ph(t, a, b);
            const hh = h * p;
            return (
              <rect
                key={x}
                x={x}
                y={92 - hh}
                width={w}
                height={hh}
                rx={3}
                fill={i === bars.length - 1 ? c.hi : c.line}
              />
            );
          })}
          {lim && <L c={c.hi} d="M78 28 H94" opacity={ph(t, 54, 64)} />}
          <L c={c.line} d="M14 92 H106" opacity={F} />
        </>
      );
    }

    /** 다듬기 · 계속 — 들쭉날쭉하던 선이 고른 선으로 갈린다 */
    case "refine":
      return (
        <>
          <L
            c={c.line}
            d="M16 74 L30 52 L40 82 L54 44 L66 80 L78 50 L90 72 L104 56"
            opacity={1 - ph(t, 16, 36)}
          />
          <L
            c={c.hi}
            d="M16 74 C42 74 40 48 60 48 S82 62 104 56"
            {...drawn(ph(t, 20, 60))}
          />
          <circle cx={104} cy={56} r={5 * ph(t, 60, 72)} fill={c.hi} />
        </>
      );

    /** 둘이 하나로 — 따로 가던 꼬리만 사라지고, 줄기는 늘 있다 */
    case "merge": {
      const d = ph(t, 20, 60);
      return (
        <>
          <L c={c.line} d="M16 40 H46 M16 84 H46" />
          <L
            c={c.line}
            d="M46 40 H102 M46 84 H102"
            opacity={1 - ph(t, 16, 36)}
          />
          <L c={c.hi} d="M46 40 C64 40 62 62 76 62 H92" {...drawn(d)} />
          <L c={c.hi} d="M46 84 C64 84 62 62 76 62" {...drawn(d)} />
          <circle cx={100} cy={62} r={5 * ph(t, 60, 72)} fill={c.hi} />
        </>
      );
    }

    /** 여럿이 한 번으로 — 모임 셋 → 허브 → 나감 → 화살촉 */
    case "fanin":
      return (
        <>
          {[26, 62, 98].map((y) => (
            <circle
              key={y}
              cx={21}
              cy={y}
              r={7}
              fill="none"
              stroke={c.line}
              strokeWidth={SW}
            />
          ))}
          <L
            c={c.line}
            d="M30 26 C46 26 42 62 54 62"
            {...drawn(ph(t, 0, 20))}
          />
          <L c={c.line} d="M30 62 H54" {...drawn(ph(t, 9, 29))} />
          <L
            c={c.line}
            d="M30 98 C46 98 42 62 54 62"
            {...drawn(ph(t, 18, 38))}
          />
          <circle cx={66} cy={62} r={9 * ph(t, 40, 54)} fill={c.hi} />
          <L c={c.hi} d="M79 62 H97" {...drawn(ph(t, 56, 76))} />
          <L c={c.hi} d="M93 56 L99 62 L93 68" opacity={ph(t, 78, 88)} />
        </>
      );

    /** 이어 붙이기 — 같은 토막을 옆으로 붙여 빈 길이를 채운다 */
    case "tile":
      return (
        <>
          <L c={c.line} d="M14 40 H106 M14 84 H106" opacity={F} />
          {(
            [
              [16, 8, 22, false],
              [47, 26, 40, false],
              [78, 44, 58, true],
            ] as [number, number, number, boolean][]
          ).map(([x, a, b, hi]) => {
            const p = ph(t, a, b);
            return (
              <rect
                key={x}
                x={x + 13 * (1 - p)}
                y={62 - 10 * p}
                width={26 * p}
                height={20 * p}
                rx={3}
                fill={hi ? c.hi : c.line}
              />
            );
          })}
        </>
      );

    /** 짧은 쪽에 맞춰 잘림 — 어디서 잘릴지 먼저 보여 주고 잘린다 */
    case "cut":
      return (
        <>
          <rect x={16} y={38} width={46} height={18} rx={3} fill={c.line} />
          <rect
            x={16}
            y={70}
            width={88 * (1 - 0.48 * ph(t, 38, 60))}
            height={18}
            rx={3}
            fill={c.hi}
          />
          <L
            c={c.ink}
            d="M62 30 V96"
            strokeDasharray="6 6"
            opacity={0.7 * ph(t, 22, 32)}
          />
        </>
      );

    /** 있어야 할 게 없음 — 테두리는 있는데 안이 비었다. 또렷하게 깜박인다 */
    case "missing": {
      const p = ph(t, 44, 54);
      const blink = [
        [54, 62, 1, 0.06],
        [62, 70, 0.06, 1],
        [70, 78, 1, 0.06],
        [78, 86, 0.06, 1],
      ].reduce((o, [a, b, from, to]) => {
        const q = ph(t, a, b, true);
        return q <= 0 ? o : from + (to - from) * q;
      }, p);
      return (
        <>
          <circle
            cx={60}
            cy={62}
            r={32}
            fill="none"
            stroke={c.line}
            strokeWidth={SW}
            {...drawn(ph(t, 6, 44))}
          />
          <circle
            cx={60}
            cy={62}
            r={15 * (0.6 + 0.4 * p)}
            fill="none"
            stroke={c.hi}
            strokeWidth={SW}
            strokeDasharray="5 8"
            opacity={blink}
          />
        </>
      );
    }

    /** 한 줄 때문에 전체가 — 회색 줄이 먼저 있고 그 위에 강조색이 덧그려진다 */
    case "oneline":
      return (
        <>
          <rect
            x={18}
            y={26}
            width={84}
            height={68}
            rx={5}
            fill="none"
            stroke={c.line}
            strokeWidth={SW}
            opacity={F}
          />
          <L
            c={c.line}
            d="M30 44 H90 M30 80 H72"
            opacity={1 - 0.8 * ph(t, 20, 44)}
          />
          <L c={c.line} d="M30 62 H90" />
          <L c={c.hi} d="M30 62 H90" {...drawn(ph(t, 24, 56))} />
          <L c={c.hi} d="M96 56 L104 62 L96 68" opacity={ph(t, 58, 68)} />
        </>
      );

    /** 옛 값으로 되돌아감 — 돌아갈 길이 먼저 보이고, 그제야 점이 되돌아간다 */
    case "fallback":
      return (
        <>
          <L c={c.line} d="M16 70 H104" opacity={F} />
          <circle
            cx={32}
            cy={70}
            r={10}
            fill="none"
            stroke={c.line}
            strokeWidth={SW}
          />
          <L
            c={c.ink}
            d="M86 38 H46"
            opacity={0.6}
            {...drawn(ph(t, 26, 44))}
          />
          <L
            c={c.ink}
            d="M52 32 L46 38 L52 44"
            opacity={0.6 * ph(t, 44, 52)}
          />
          <circle cx={88 - 56 * ph(t, 54, 78)} cy={70} r={5.5} fill={c.hi} />
        </>
      );

    /** 늦게 도착 — 셋이 제때 오고, **비는 구간**이 있어야 늦음이 읽힌다 */
    case "late":
      return (
        <>
          <L c={c.line} d="M16 62 H104" opacity={F} />
          {(
            [
              [32, 8, 18, false],
              [54, 20, 30, false],
              [76, 32, 42, false],
              [100, 66, 78, true],
            ] as [number, number, number, boolean][]
          ).map(([cx, a, b, hi]) => (
            <circle
              key={cx}
              cx={cx}
              cy={62}
              r={6 * ph(t, a, b)}
              fill={hi ? c.hi : c.line}
            />
          ))}
          <L
            c={c.hi}
            d="M90 84 H110"
            strokeDasharray="4 6"
            opacity={ph(t, 66, 76)}
          />
        </>
      );

    /** 표시 하나로 등록 — 표시를 달면 비어 있던 목록 자리로 들어간다 */
    case "tag": {
      const slide = ph(t, 34, 58);
      return (
        <>
          <rect
            x={64}
            y={40}
            width={44}
            height={44}
            rx={6}
            fill="none"
            stroke={c.line}
            strokeWidth={SW}
            strokeDasharray="6 6"
            opacity={F}
          />
          <g transform={`translate(${(56 * slide).toFixed(2)} 0)`}>
            <rect
              x={8}
              y={40}
              width={44}
              height={44}
              rx={6}
              fill="none"
              stroke={c.line}
              strokeWidth={SW}
            />
            <circle cx={50} cy={42} r={6 * ph(t, 14, 26)} fill={c.hi} />
          </g>
          <rect
            x={64}
            y={40}
            width={44}
            height={44}
            rx={6}
            fill="none"
            stroke={c.hi}
            strokeWidth={SW}
            opacity={ph(t, 60, 70)}
          />
        </>
      );
    }

    /** 목록을 훑기 — 훑개가 찾은 줄에서 멈추고, 그 줄이 켜지면 빠진다.
     *  훑개의 폭·두께는 줄과 똑같다 — 조금이라도 크면 겹치는 순간 선이 둘로 보인다 */
    case "scan": {
      const p = ph(t, 6, 58, true);
      const y = 22.4 - 46 + 96 * p;
      const fade =
        clamp01(ph(t, 6, 14, true)) * (1 - ph(t, 64, 74, true));
      return (
        <>
          <L c={c.line} d="M26 34 H94 M26 54 H94 M26 94 H80" opacity={F} />
          <L c={c.line} d="M26 74 H94" opacity={F} />
          <L c={c.hi} d="M26 74 H94" opacity={ph(t, 58, 68)} />
          <rect
            x={26}
            y={y.toFixed(2)}
            width={68}
            height={3.2}
            rx={1.6}
            fill={c.hi}
            opacity={fade}
          />
        </>
      );
    }

    /** 막은 줄 알았는데 샌다 — 흐름은 지나가는데 터진 자리로 한 방울 빠진다 */
    case "leak": {
      const run = ph(t, 6, 48, true);
      const io = clamp01(ph(t, 6, 14, true)) * (1 - ph(t, 40, 48, true));
      return (
        <>
          <L c={c.line} d="M16 44 H104" opacity={F} />
          <L c={c.line} d="M16 80 H52 M72 80 H104" opacity={F} />
          <circle cx={14 + 92 * run} cy={62} r={5.5} fill={c.line} opacity={io} />
          <circle
            cx={62}
            cy={74 + 30 * ph(t, 28, 64)}
            r={5.5}
            fill={c.hi}
            opacity={ph(t, 28, 38)}
          />
        </>
      );
    }

    /** 저쪽은 옛것 그대로 — 왼쪽만 새것이 되고, 건너가려던 연결은 못 간다.
     *  fallback(옛 값으로 되돌아감)과 다르다: 이건 갱신이 저쪽까지 안 간 것이다 */
    case "stale": {
      // 옛쪽은 연결이 실패한 **직후에** 한 번 또렷하게 깜박인다 — "저긴 그대로"
      const oldOp = 0.26 + 0.59 * (ph(t, 66, 76) - ph(t, 76, 88));
      const box = (x: number, op: number) => (
        <rect
          key={x}
          x={x}
          y={42}
          width={36}
          height={40}
          rx={5}
          fill="none"
          stroke={c.line}
          strokeWidth={SW}
          opacity={op}
        />
      );
      return (
        <>
          {box(14, F)}
          <rect x={24} y={54} width={16} height={16} rx={3} fill={c.line} />
          <rect
            x={24}
            y={54}
            width={16}
            height={16}
            rx={3}
            fill={c.hi}
            opacity={ph(t, 30, 42)}
          />
          {box(70, oldOp)}
          <rect x={80} y={54} width={16} height={16} rx={3} fill={c.line} />
          <L
            c={c.hi}
            d="M54 62 H66"
            strokeDasharray="3 4"
            opacity={ph(t, 42, 52) * (1 - ph(t, 62, 74))}
          />
        </>
      );
    }

    /** 하나가 다른 것이 된다 — 글이 영상이 되듯. vibelog가 하는 일 그 자체다 */
    case "convert": {
      const play = ph(t, 64, 74);
      return (
        <>
          <rect
            x={12}
            y={34}
            width={36}
            height={52}
            rx={4}
            fill="none"
            stroke={c.line}
            strokeWidth={SW}
            {...drawn(ph(t, 4, 22))}
          />
          <L
            c={c.line}
            d="M20 48 H40 M20 60 H40 M20 72 H33"
            {...drawn(ph(t, 20, 36))}
          />
          <L c={c.line} d="M54 60 H66" {...drawn(ph(t, 36, 48))} />
          <L c={c.hi} d="M64 55 L70 60 L64 65" opacity={ph(t, 48, 56)} />
          <rect
            x={76}
            y={40}
            width={32}
            height={40}
            rx={4}
            fill="none"
            stroke={c.hi}
            strokeWidth={SW}
            {...drawn(ph(t, 54, 66))}
          />
          <path
            d="M87 51 L101 60 L87 69 Z"
            fill={c.hi}
            transform={`translate(94 60) scale(${play.toFixed(3)}) translate(-94 -60)`}
          />
        </>
      );
    }

    /** 하나를 빼내고 **빈 자리가 남는다.** 남는 두 줄은 배경이 아니라 내용이므로
     *  흐리게 두지 않는다 — 흐리면 민트 점선 하나만 떠 있는 그림이 된다 */
    case "remove": {
      const dx = 86 * ph(t, 34, 64);
      return (
        <>
          <L c={c.line} d="M20 40 H100" />
          <L c={c.line} d="M20 84 H100" />
          <L
            c={c.hi}
            d="M20 62 H100"
            strokeDasharray="3 9"
            opacity={ph(t, 66, 78)}
          />
          <g transform={`translate(${dx.toFixed(2)} 0)`}>
            <L c={c.hi} d="M20 62 H100" opacity={1 - ph(t, 44, 64)} />
          </g>
        </>
      );
    }

    /** 확실하면 나머지는 안 본다 — 점이 벽 **앞에서** 멈추고 뒤가 흐려진다.
     *  벽 자리에는 회색 선이 먼저 있고 그 위에 강조색이 그려진다 (oneline과 같은 문법).
     *  흐림은 한 겹으로만 — faint에 그룹 투명도를 또 곱하면 밝은 테마에서 통째로 사라진다 */
    case "earlyout": {
      const rest = 0.26 - 0.14 * ph(t, 54, 70);
      return (
        <>
          <L c={c.line} d="M14 62 H62" opacity={F} />
          <L c={c.line} d="M30 55 V69 M44 55 V69" opacity={F} />
          <g opacity={rest}>
            <L c={c.line} d="M62 62 H106" />
            <L c={c.line} d="M78 55 V69 M96 55 V69" />
          </g>
          <L c={c.line} d="M62 44 V80" />
          <L c={c.hi} d="M62 44 V80" {...drawn(ph(t, 46, 62))} />
          <circle cx={14 + 38 * ph(t, 8, 46)} cy={62} r={6} fill={c.hi} />
        </>
      );
    }

    /** 하나가 전부에 퍼진다 — fanin의 짝. 선은 도착 상자 앞에서 멈춘다 */
    case "fanout": {
      const line = ph(t, 20, 44);
      const lit = [ph(t, 50, 60), ph(t, 56, 66), ph(t, 62, 72)];
      return (
        <>
          <circle cx={60} cy={26} r={8 * ph(t, 6, 20)} fill={c.hi} />
          <L c={c.line} d="M60 36 C60 56 32 52 26 68" {...drawn(line)} />
          <L c={c.line} d="M60 36 V68" {...drawn(line)} />
          <L c={c.line} d="M60 36 C60 56 88 52 94 68" {...drawn(line)} />
          {[12, 46, 80].map((x, i) => (
            <g key={x}>
              <rect
                x={x}
                y={72}
                width={28}
                height={24}
                rx={4}
                fill="none"
                stroke={c.line}
                strokeWidth={SW}
              />
              <rect
                x={x}
                y={72}
                width={28}
                height={24}
                rx={4}
                fill="none"
                stroke={c.hi}
                strokeWidth={SW}
                opacity={lit[i]}
              />
            </g>
          ))}
        </>
      );
    }
  }
}

export const MotifScene: React.FC<{
  name: MotifName;
  th: ShortsTheme;
  /** 장면이 시작되는 영상 시각(초) */
  fromSec: number;
}> = ({ name, th, fromSec }) => {
  const { fps } = useVideoConfig();
  const t = useCurrentFrame() / fps - fromSec;
  const c: C = { line: th.muted, hi: th.accent, ink: th.ink };
  // 장면 자체의 등장 — 다이어그램과 같은 결로 아래에서 위로
  const inP = easeOut(clamp01(t / 0.35));
  return (
    <div
      style={{
        position: "absolute",
        left: (1080 - SIZE) / 2,
        top: CY - SIZE / 2,
        width: SIZE,
        height: SIZE,
        opacity: inP,
        transform: `translateY(${(1 - inP) * 24}px)`,
      }}
    >
      <svg viewBox="0 0 120 120" width={SIZE} height={SIZE}>
        {body(name, t, c)}
      </svg>
    </div>
  );
};
