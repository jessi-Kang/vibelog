/**
 * Diagram — 화면 녹화로는 보여줄 수 없는 "원리"를 그리는 장면 (Jessi 지시).
 *
 * 자유 작도가 아니라 다섯 종류 고정: 숫자선 · 갈림길 · 전후 · 집합 · 파이프라인.
 * 대본은 종류와 라벨만 고르고, 그림은 여기서 테마 토큰으로 그린다 — 매번
 * 같은 품질이 나오게 하기 위해서다.
 *
 * 그리기 규칙 (샘플 검수에서 확정):
 * - 선은 방향을 가지고 그려진다: 가로 왼→오, 세로 위→아래, 원은 12시부터 시계방향
 * - 화살표는 도착 도형 앞에서 멈춘다 (겹쳐 깔리면 지저분하다)
 * - 박스 배경은 불투명 — 반투명이면 뒤 선이 비친다
 */
import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { DiagramSpec } from "../../scripts/shorts-types";
import { FONT_MONO, FONT_SANS, visualLen, type ShortsTheme } from "./theme";

/** 무대 — 자막 위, 헤드라인 아래의 가운데 띠 */
const CY = 1020;
/** 숫자선 값 라벨의 아랫변과 축 사이 간격 — 점(r=34)을 덮지 않을 만큼 */
const VALUE_GAP = 62;
const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (p: number): number => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
/** 장면 시작 s초부터 d초 동안 0→1 */
const seg = (t: number, s: number, d: number): number => ease((t - s) / d);

/** 민트 틴트를 배경색에 미리 섞은 불투명 색 — 반투명 금지 규칙 때문 */
function tint(th: ShortsTheme, ratio = 0.14): string {
  const hex = (c: string): [number, number, number] => [
    parseInt(c.slice(1, 3), 16),
    parseInt(c.slice(3, 5), 16),
    parseInt(c.slice(5, 7), 16),
  ];
  const [br, bg, bb] = hex(th.bg);
  const [ar, ag, ab] = hex(th.accent);
  const mix = (b: number, a: number) => Math.round(b + (a - b) * ratio);
  return `rgb(${mix(br, ar)}, ${mix(bg, ag)}, ${mix(bb, ab)})`;
}

/**
 * 두 줄을 넘길 만큼 긴 라벨은 글자를 줄인다 — "범위 밖의 큰 수"가 마지막
 * 한 글자만 떨어져 나가 원 위에 얹히던 문제 (Jessi 지적). 줄바꿈 자체는
 * wrap 규칙(아래 balance·keep-all)이 고르게 나누고, 그래도 넘칠 때만 줄인다.
 */
function fitFont(text: string, base: number, width: number, lines = 2): number {
  const len = visualLen(text);
  const perLine = width / base; // 한 줄에 들어가는 전각 글자 수(근사)
  if (len <= perLine * lines) return base;
  return Math.max(Math.round(base * 0.6), Math.floor((width * lines) / len));
}

/** 줄바꿈은 두 줄로 고르게 — 단어 중간에서 끊지 않고, 한 글자 고아를 막는다 */
const WRAP: React.CSSProperties = {
  wordBreak: "keep-all",
  textWrap: "balance",
  lineHeight: 1.2,
} as React.CSSProperties;

const boxStyle = (
  th: ShortsTheme,
  on: boolean,
  text = "",
  width = 400,
): React.CSSProperties => ({
  ...WRAP,
  position: "absolute",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: "0 18px",
  // 모서리는 테마를 따른다 — 카드·배지가 테마마다 둥글기가 다른데(터미널 28,
  // 블루프린트 8, 하이라이터 4) 다이어그램만 20으로 고정이라 혼자 다른 형태로
  // 보였다 ("템플릿마다 달라지는데 같이 적용되어야 해" — Jessi).
  borderRadius: th.radius,
  // 본문 폰트로 — JetBrains Mono에는 한글이 없어 대체 글꼴로 떨어졌다
  // (다이어그램만 딴 폰트로 놀던 문제, Jessi 지적). 삽질 카드 본문과 같은 계열.
  fontFamily: FONT_SANS,
  fontWeight: 700,
  fontSize: fitFont(text, 38, width),
  background: on ? tint(th) : th.panel,
  border: `4px solid ${on ? th.accent : th.line}`,
  color: on ? th.accent : th.ink,
});

const labelStyle = (th: ShortsTheme, color?: string): React.CSSProperties => ({
  ...WRAP,
  position: "absolute",
  fontFamily: FONT_SANS,
  fontWeight: 700,
  fontSize: 30,
  color: color ?? th.muted,
});

/** 등장 — 아래에서 위로 */
const rise = (p: number, dy = 28): React.CSSProperties => ({
  opacity: p,
  transform: `translateY(${(1 - p) * dy}px)`,
});
const popIn = (p: number): React.CSSProperties => ({
  opacity: p,
  transform: `scale(${0.9 + 0.1 * p})`,
});

function Arrow({
  x0,
  x1,
  y,
  p,
  color,
}: {
  x0: number;
  x1: number;
  y: number;
  p: number;
  color: string;
}) {
  // 가로 화살표 — 왼→오로 뻗고, 화살촉이 선 끝을 따라간다
  const head = 38;
  const end = x0 + (x1 - x0) * p;
  return (
    <g style={{ opacity: p > 0 ? 1 : 0 }}>
      <path
        d={`M${x0} ${y} H${Math.max(x0 + 0.01, end)}`}
        stroke={color}
        strokeWidth={7}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M${end} ${y - 22} L${end + head} ${y} L${end} ${y + 22} Z`}
        fill={color}
      />
    </g>
  );
}

export const DiagramScene: React.FC<{
  spec: DiagramSpec;
  th: ShortsTheme;
  lang: "ko" | "en";
  /** 장면이 시작되는 영상 시각(초) */
  fromSec: number;
}> = ({ spec, th, lang, fromSec }) => {
  const { fps } = useVideoConfig();
  const t = useCurrentFrame() / fps - fromSec;
  const L =
    lang === "en" && spec.labelsEn?.length ? spec.labelsEn : spec.labels;
  const l = (i: number): string => L[i] ?? "";

  if (spec.kind === "numberline") {
    // [범위 이름, 문제였던 값, 고친 값] — 범위 밖으로 옮겨 해결했다는 그림
    const axis = seg(t, 0.1, 0.5);
    const band = seg(t, 0.5, 0.45);
    const bad = seg(t, 1.0, 0.5);
    const arrow = seg(t, 1.7, 0.6);
    const good = seg(t, 2.2, 0.45);
    return (
      <>
        <svg style={{ position: "absolute", inset: 0 }} width={1080} height={1920}>
          <line
            x1={120}
            y1={CY}
            x2={120 + 840 * axis}
            y2={CY}
            stroke={th.line}
            strokeWidth={8}
            strokeLinecap="round"
          />
          <rect
            x={120}
            y={CY - 74}
            width={420 * band}
            height={148}
            rx={th.radius}
            fill={tint(th, 0.1)}
            stroke={th.accent}
            strokeWidth={5}
            strokeDasharray="16 12"
            opacity={band}
          />
          <circle
            cx={330}
            cy={CY - 70 * (1 - bad)}
            r={34}
            fill={th.ink}
            opacity={bad}
          />
          <Arrow x0={394} x1={700} y={CY} p={arrow} color={th.ink} />
          <circle cx={790} cy={CY} r={34 * (0.6 + 0.4 * good)} fill={th.accent} opacity={good} />
        </svg>
        <div
          style={{
            ...labelStyle(th, th.accent),
            left: 120,
            width: 420,
            top: CY + 96,
            textAlign: "center",
            fontWeight: 700,
            fontSize: fitFont(l(0), 30, 420),
            ...rise(seg(t, 0.7, 0.4), 16),
          }}
        >
          {l(0)}
        </div>
        {/* 값 라벨은 아래를 축에 맞춘다 — 위로 자라야 두 줄이 되어도 점을
            덮지 않는다 (한 글자가 원 위에 얹히던 문제, Jessi 지적) */}
        <div
          style={{
            ...labelStyle(th, th.ink),
            left: 130,
            width: 400,
            bottom: 1920 - (CY - VALUE_GAP),
            textAlign: "center",
            fontWeight: 700,
            fontSize: fitFont(l(1), 42, 400),
            ...rise(seg(t, 1.45, 0.4), 16),
          }}
        >
          {l(1)}
        </div>
        <div
          style={{
            ...labelStyle(th, th.accent),
            left: 590,
            width: 400,
            bottom: 1920 - (CY - VALUE_GAP),
            textAlign: "center",
            fontWeight: 700,
            fontSize: fitFont(l(2), 42, 400),
            ...rise(seg(t, 2.3, 0.4), 16),
          }}
        >
          {l(2)}
        </div>
      </>
    );
  }

  if (spec.kind === "fork") {
    // [출발, 왼쪽 결과, 오른쪽 결과, 왼쪽 이름, 오른쪽 이름]
    const src = seg(t, 0.2, 0.45);
    const path = seg(t, 0.7, 0.8);
    const arrow = seg(t, 1.4, 0.3);
    const b1 = seg(t, 1.55, 0.4);
    const b2 = seg(t, 1.75, 0.4);
    // pathLength=1로 길이를 정규화해 dashoffset을 0~1로 쓴다 — 경로 길이를
    // 손으로 적어 넣으면 실제 길이와 어긋나 선이 토막 난다 (검수에서 발견)
    const draw = (p: number): React.CSSProperties => ({
      strokeDasharray: 1,
      strokeDashoffset: 1 - p,
      opacity: p > 0 ? 1 : 0,
    });
    return (
      <>
        <svg style={{ position: "absolute", inset: 0 }} width={1080} height={1920}>
          <path
            d="M540 800 V880 Q540 916 496 916 H324 Q280 916 280 952 V1090"
            stroke={th.accent}
            strokeWidth={7}
            fill="none"
            strokeLinecap="round"
            pathLength={1}
            style={draw(path)}
          />
          <path
            d="M540 800 V880 Q540 916 584 916 H756 Q800 916 800 952 V1090"
            stroke={th.line}
            strokeWidth={7}
            fill="none"
            strokeLinecap="round"
            pathLength={1}
            style={draw(path)}
          />
          <path d="M256 1078 L280 1122 L304 1078 Z" fill={th.accent} opacity={arrow} />
          <path d="M776 1078 L800 1122 L824 1078 Z" fill={th.line} opacity={arrow} />
        </svg>
        <div style={{ ...boxStyle(th, false, l(0), 400), left: 340, top: 696, width: 400, height: 104, ...popIn(src) }}>
          {l(0)}
        </div>
        <div style={{ ...boxStyle(th, true, l(1), 440), left: 60, top: 1140, width: 440, height: 120, ...popIn(b1) }}>
          {l(1)}
        </div>
        <div style={{ ...boxStyle(th, false, l(2), 420), left: 600, top: 1140, width: 420, height: 120, ...popIn(b2) }}>
          {l(2)}
        </div>
        <div style={{ ...labelStyle(th), left: 60, width: 440, top: 1284, textAlign: "center", fontSize: fitFont(l(3), 30, 440), opacity: b1 }}>
          {l(3)}
        </div>
        <div style={{ ...labelStyle(th), left: 600, width: 420, top: 1284, textAlign: "center", fontSize: fitFont(l(4), 30, 420), opacity: b2 }}>
          {l(4)}
        </div>
      </>
    );
  }

  if (spec.kind === "beforeafter") {
    // [전-시작, 전-결과, 후-시작, 후-결과] — 전이 흐려지고 후가 들어온다
    const a = seg(t, 0.2, 0.4);
    const ar1 = seg(t, 0.45, 0.5);
    const b = seg(t, 1.3, 0.45);
    const ar2 = seg(t, 1.6, 0.5);
    const dim = 1 - 0.5 * seg(t, 1.4, 0.5);
    const TOP = 800;
    const BOT = 1120;
    return (
      <>
        <svg style={{ position: "absolute", inset: 0 }} width={1080} height={1920}>
          <g opacity={dim}>
            <Arrow x0={452} x1={556} y={TOP + 55} p={ar1} color={th.line} />
          </g>
          <Arrow x0={452} x1={556} y={BOT + 55} p={ar2} color={th.accent} />
        </svg>
        <div
          style={{
            ...labelStyle(th),
            fontFamily: FONT_MONO,
            fontWeight: 500,
            fontSize: 26,
            letterSpacing: "0.1em",
            left: 96,
            top: TOP - 44,
            opacity: a * dim,
          }}
        >
          {lang === "en" ? "BEFORE" : "전"}
        </div>
        <div style={{ ...boxStyle(th, false, l(0), 340), left: 96, top: TOP, width: 340, height: 110, color: th.muted, ...rise(a), opacity: a * dim }}>
          {l(0)}
        </div>
        <div style={{ ...boxStyle(th, false, l(1), 374), left: 610, top: TOP, width: 374, height: 110, color: th.muted, ...rise(a), opacity: a * dim }}>
          {l(1)}
        </div>
        <div
          style={{
            ...labelStyle(th, th.accent),
            fontFamily: FONT_MONO,
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: "0.1em",
            left: 96,
            top: BOT - 44,
            opacity: b,
          }}
        >
          {lang === "en" ? "AFTER" : "후"}
        </div>
        <div style={{ ...boxStyle(th, false, l(2), 340), left: 96, top: BOT, width: 340, height: 110, borderColor: th.accent, ...rise(b) }}>
          {l(2)}
        </div>
        <div style={{ ...boxStyle(th, true, l(3), 374), left: 610, top: BOT, width: 374, height: 110, ...rise(b) }}>
          {l(3)}
        </div>
      </>
    );
  }

  if (spec.kind === "sets") {
    // [왼쪽 집합, 오른쪽 집합, 겹친 값] — 원은 12시부터 시계방향으로 그려진다
    const R = 230;
    const a = seg(t, 0.2, 0.5);
    const b = seg(t, 0.6, 0.5);
    const inter = seg(t, 1.3, 0.5);
    const num = seg(t, 1.5, 0.45);
    const ring = (p: number): React.CSSProperties => ({
      strokeDasharray: 1,
      strokeDashoffset: 1 - p,
      opacity: p > 0 ? 1 : 0,
    });
    return (
      <>
        <svg style={{ position: "absolute", inset: 0 }} width={1080} height={1920}>
          <circle cx={420} cy={CY} r={R} fill={th.panel} opacity={a * a} />
          <circle cx={700} cy={CY} r={R} fill={tint(th, 0.1)} opacity={b * b} />
          <path
            d={`M560 ${CY - 190} A${R} ${R} 0 0 1 560 ${CY + 190} A${R} ${R} 0 0 1 560 ${CY - 190} Z`}
            fill={th.accent}
            opacity={inter * 0.38}
          />
          <circle cx={420} cy={CY} r={R} fill="none" stroke={th.ink} strokeWidth={5}
            pathLength={1} transform={`rotate(-90 420 ${CY})`} style={ring(a)} />
          <circle cx={700} cy={CY} r={R} fill="none" stroke={th.accent} strokeWidth={5}
            pathLength={1} transform={`rotate(-90 700 ${CY})`} style={ring(b)} />
        </svg>
        <div style={{ ...labelStyle(th, th.ink), left: 96, width: 520, top: CY - 316, fontWeight: 700, fontSize: fitFont(l(0), 30, 520), ...rise(seg(t, 0.5, 0.4), 16) }}>
          {l(0)}
        </div>
        <div style={{ ...labelStyle(th, th.accent), right: 96, width: 520, top: CY + 270, fontWeight: 700, textAlign: "right", fontSize: fitFont(l(1), 30, 520), ...rise(seg(t, 0.9, 0.4), 16) }}>
          {l(1)}
        </div>
        <div
          style={{
            position: "absolute",
            left: 470,
            width: 180,
            top: CY - 70,
            textAlign: "center",
            fontFamily: FONT_SANS,
            fontWeight: 900,
            fontSize: fitFont(l(2), 86, 180, 1),
            color: th.accent,
            ...popIn(num),
          }}
        >
          {l(2)}
        </div>
      </>
    );
  }

  // pipeline — 세로 레일이 위에서 아래로 자라고, 단계가 차례로 얹힌다.
  // 레일은 마지막 박스 앞에서 멈춘다 (박스 밑으로 비치면 지저분하다)
  const steps = L.slice(0, 5);
  const H = 110;
  const PITCH = H + 60; // 박스 높이 + 레일이 보이는 간격
  const top = CY - ((steps.length - 1) * PITCH + H) / 2;
  const ys = steps.map((_, i) => top + i * PITCH);
  const railEnd = ys.length ? ys[ys.length - 1] : top;
  const rail = seg(t, 0.3, 0.9);
  return (
    <>
      <svg style={{ position: "absolute", inset: 0 }} width={1080} height={1920}>
        <path
          d={`M540 ${top + H} V${top + H + (railEnd - top - H) * rail}`}
          stroke={th.line}
          strokeWidth={6}
          strokeLinecap="round"
          fill="none"
          opacity={rail}
        />
      </svg>
      {steps.map((label, i) => {
        const last = i === steps.length - 1;
        return (
          <div
            key={i}
            style={{
              ...boxStyle(th, last, label, 540),
              left: 270,
              top: ys[i],
              width: 540,
              height: H,
              ...popIn(seg(t, 0.4 + i * 0.35, 0.4)),
            }}
          >
            {label}
          </div>
        );
      })}
    </>
  );
};
