/** 장면 컴포넌트 — 프로토타입 레이아웃 + 테마 토큰(팔레트·형태·키워드 규칙) */
import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { ShortsScript, ShortsTiming } from "../../scripts/shorts-types";
import {
  FONT_MONO,
  FONT_SANS,
  keywordStyle,
  NARRATION_DELAY,
  type ShortsTheme,
} from "./theme";

/**
 * hook 문장에서 키워드를 강조한 큰 타이틀. 타이포만 — 그래픽 금지 (Jessi 지시).
 * 훅 장면에서는 하단 자막을 끄므로(중복), 훅이 2문장이면 헤드라인이
 * 지금 말하는 문장으로 갱신된다 — 화면에 안 보이는 말이 없게.
 */
export const HookCard: React.FC<{
  script: ShortsScript;
  lang: "ko" | "en";
  timing?: ShortsTiming;
  th: ShortsTheme;
}> = ({ script, lang, timing, th }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hookLines = script.lines
    .map((l, i) => ({ l, i }))
    .filter((x) => x.l.scene === "hook");
  let hook = hookLines[0]?.l;
  if (!hook) return null;
  if (timing) {
    const t = frame / fps - NARRATION_DELAY;
    for (const s of timing.sentences) {
      const x = hookLines.find((h) => h.i === s.index);
      if (x && t >= s.start) hook = x.l;
    }
  }
  const keywords = new Set(lang === "ko" ? hook.keywords : hook.keywordsEn);
  const words = hook[lang].split(/\s+/);
  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        right: 80,
        top: "50%",
        transform: "translateY(-52%)",
      }}
    >
      <h1
        style={{
          fontFamily: FONT_SANS,
          fontWeight: 900,
          fontSize: 132,
          // 마커칠 키워드는 배경 상자가 글자 박스만큼 높다 — 줄간이 좁으면
          // 이웃 줄 글자를 덮는다 (Jessi 지적). 마커 테마만 줄간을 벌린다.
          lineHeight: th.keyword === "marker" ? 1.3 : 1.14,
          letterSpacing: "-0.01em",
          margin: 0,
          wordBreak: "keep-all",
          textWrap: "balance",
          color: th.ink,
        }}
      >
        {words.map((w, i) => (
          <React.Fragment key={i}>
            <span style={keywords.has(w) ? keywordStyle(th, 1) : undefined}>
              {w}
            </span>
            {i < words.length - 1 ? " " : null}
          </React.Fragment>
        ))}
      </h1>
      <p
        style={{
          margin: "56px 0 0",
          fontFamily: FONT_SANS,
          fontSize: 40,
          fontWeight: 500,
          color: th.muted,
        }}
      >
        {script.repo} · devlog day {String(script.day).padStart(2, "0")}
      </p>
    </div>
  );
};

/** 폰 프레임 + 데모 녹화. videoFile이 없으면 플레이스홀더 패널 */
export const PhoneFrame: React.FC<{
  videoFile: string | null;
  /** 이 장면이 시작될 때 소스 영상에서 몇 초 지점부터 틀지 */
  sourceOffsetSec: number;
  fromFrame: number;
  durationInFrames: number;
  th: ShortsTheme;
}> = ({ videoFile, sourceOffsetSec, fromFrame, durationInFrames, th }) => {
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        // 자막 구역(하단 ~1530부터)과 안 겹치게 프레임을 줄였다 — 폰 하단 1370
        position: "absolute",
        left: "50%",
        top: 240,
        transform: "translateX(-50%)",
        width: 690,
        height: 1130,
        borderRadius: Math.max(24, th.radius * 2.3),
        background: th.light ? "#fff" : "#000",
        border: `6px solid ${th.light ? "#D5DAE0" : th.line}`,
        boxShadow: th.light
          ? "0 30px 90px rgba(23,26,31,.18)"
          : `0 40px 120px rgba(0,0,0,.6), 0 0 0 2px ${th.bg}`,
      }}
    >
      {/* 노치 없음 — 화면 콘텐츠를 가리지 않는다 (Jessi 지시) */}
      <div
        style={{
          position: "absolute",
          inset: 14,
          borderRadius: Math.max(16, th.radius * 1.8),
          overflow: "hidden",
          background: th.panel,
        }}
      >
        {videoFile ? (
          <Sequence from={fromFrame} durationInFrames={durationInFrames} layout="none">
            <OffthreadVideo
              src={staticFile(videoFile)}
              muted
              startFrom={Math.round(sourceOffsetSec * fps)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Sequence>
        ) : (
          <div
            style={{
              padding: "120px 40px",
              fontFamily: FONT_MONO,
              fontSize: 28,
              color: th.muted,
              lineHeight: 1.7,
            }}
          >
            demo recording
            <br />
            not available
          </div>
        )}
      </div>
    </div>
  );
};

/** 삽질 카드 — before/after 비교. 테마별 변형 5종. 장면 시작 후 순차 등장 */
export const FailCard: React.FC<{
  script: ShortsScript;
  lang: "ko" | "en";
  sceneStartSec: number;
  sceneEndSec: number;
  th: ShortsTheme;
}> = ({ script, lang, sceneStartSec, sceneEndSec, th }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const card = script.failCard;
  if (!card) return null;
  const local = t - sceneStartSec;
  const afterAt = (sceneEndSec - sceneStartSec) * 0.45;
  const before = lang === "ko" ? card.before : (card.beforeEn ?? card.before);
  const after = lang === "ko" ? card.after : (card.afterEn ?? card.after);

  const appear = (visible: boolean, delay: number): React.CSSProperties => ({
    opacity: visible ? Math.min(1, (local - delay) / 0.5) : 0,
    transform: visible
      ? `translateY(${Math.max(0, 20 - ((local - delay) / 0.5) * 20)}px)`
      : "translateY(20px)",
  });

  // 테마별 박스 스타일
  const boxBase: React.CSSProperties =
    th.fail === "marker"
      ? { padding: "8px 0" } // 패널 없이 텍스트만
      : th.fail === "paper"
        ? {
            background: th.panel,
            border: `2px solid ${th.line}`,
            borderRadius: th.radius,
            padding: "34px 38px",
            boxShadow: "0 10px 44px rgba(23,26,31,.10)",
          }
        : {
            background: th.panel,
            border: `2px solid ${th.line}`,
            borderRadius: th.radius,
            padding: "34px 38px",
          };
  const afterBox: React.CSSProperties =
    th.fail === "annotation"
      ? { borderColor: th.accent }
      : th.fail === "strike"
        ? { background: th.panel2 }
        : {};

  const bodyStyle = (isAfter: boolean): React.CSSProperties => {
    const base: React.CSSProperties = {
      fontFamily: FONT_SANS,
      fontSize: 34,
      lineHeight: 1.5,
      color: th.ink,
    };
    if (th.fail === "strike" && !isAfter) {
      return {
        ...base,
        color: th.muted,
        textDecoration: "line-through",
        textDecorationColor: th.accent,
        textDecorationThickness: 4,
      };
    }
    if (th.fail === "marker") {
      if (isAfter) {
        return {
          ...base,
          fontWeight: 700,
          color: th.accentInk,
          background: th.accent,
          padding: "2px 10px",
          borderRadius: 6,
          boxDecorationBreak: "clone",
          WebkitBoxDecorationBreak: "clone",
        } as React.CSSProperties;
      }
      return { ...base, color: th.muted };
    }
    return base;
  };

  return (
    <div style={{ position: "absolute", left: 80, right: 80, top: 300 }}>
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 30,
          letterSpacing: "0.1em",
          color: th.warn,
          textTransform: "uppercase",
        }}
      >
        {lang === "ko" ? "오늘의 삽질" : "rabbit hole"}
      </div>
      <h2
        style={{
          fontFamily: FONT_SANS,
          fontWeight: 900,
          letterSpacing: "-0.02em",
          fontSize: 110,
          lineHeight: 1.05,
          margin: "20px 0 60px",
          wordBreak: "keep-all",
          textWrap: "balance",
          color: th.ink,
        }}
      >
        {lang === "ko" ? card.title : card.titleEn}
      </h2>
      <div style={{ display: "grid", gap: 28 }}>
        <div style={{ ...boxBase, ...appear(local > 0.3, 0.3) }}>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 24,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: th.muted,
              marginBottom: 16,
            }}
          >
            before
          </div>
          <div style={{ fontFamily: FONT_SANS, fontSize: 34, lineHeight: 1.5 }}>
            <span style={bodyStyle(false)}>{before}</span>
          </div>
        </div>
        <div style={{ ...boxBase, ...afterBox, ...appear(local > afterAt, afterAt) }}>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 24,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: th.accent,
              marginBottom: 16,
            }}
          >
            after
          </div>
          <div style={{ fontFamily: FONT_SANS, fontSize: 34, lineHeight: 1.5 }}>
            <span style={bodyStyle(true)}>{after}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const EndCard: React.FC<{ script: ShortsScript; th: ShortsTheme }> = ({
  script,
  th,
}) => (
  <div
    style={{
      position: "absolute",
      left: 80,
      right: 80,
      top: "50%",
      transform: "translateY(-52%)",
    }}
  >
    <h1
      style={{
        fontFamily: FONT_SANS,
        fontWeight: 900,
        fontSize: 120,
        lineHeight: 1.05,
        margin: 0,
        color: th.ink,
      }}
    >
      vibe<span style={{ color: th.accent }}>log</span>
    </h1>
    <div
      style={{
        marginTop: 48,
        fontFamily: FONT_MONO,
        fontSize: 34,
        color: th.muted,
        display: "flex",
        gap: 28,
        flexWrap: "wrap",
      }}
    >
      <span>{script.repo}</span>
      <span style={{ color: th.accent, fontWeight: 700 }}>
        day {String(script.day).padStart(2, "0")}
      </span>
      <span>{script.template.replace("-", " ")}</span>
    </div>
    <div
      style={{
        marginTop: 120,
        display: "inline-flex",
        alignItems: "center",
        gap: 20,
        background: th.accent,
        color: th.accentInk,
        fontFamily: FONT_SANS,
        fontWeight: 900,
        fontSize: 40,
        padding: "22px 40px",
        borderRadius: Math.min(18, th.radius),
      }}
    >
      {script.handle} →
    </div>
  </div>
);

/** +알파 그래픽 장면 — 생성 일러스트 (현재 보류, 레퍼런스 확정 시 재개) */
export const ArtCard: React.FC<{ file: string; th: ShortsTheme }> = ({ file, th }) => (
  <div
    style={{
      position: "absolute",
      left: "50%",
      top: "46%",
      transform: "translate(-50%, -50%)",
      width: 860,
      height: 860,
      borderRadius: 70,
      overflow: "hidden",
      border: `2px solid ${th.line}`,
      boxShadow: "0 40px 120px rgba(0,0,0,.6)",
      background: th.panel,
    }}
  >
    <Img
      src={staticFile(file)}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  </div>
);

/** 배경 — 테마의 backdrop 변형: 글로우 / 격자 / 상단 엣지 / 무지 */
export const Background: React.FC<{ th: ShortsTheme }> = ({ th }) => (
  <AbsoluteFill style={{ background: th.bg }}>
    {th.backdrop === "glow" && (
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 40% at 50% 0%, ${th.accent}1a, transparent 70%)`,
        }}
      />
    )}
    {th.backdrop === "grid" && (
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${th.accent}0d 2px, transparent 2px), linear-gradient(90deg, ${th.accent}0d 2px, transparent 2px)`,
          backgroundSize: "108px 108px",
        }}
      />
    )}
    {th.backdrop === "edge" && (
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 20,
          background: th.accent,
        }}
      />
    )}
  </AbsoluteFill>
);
