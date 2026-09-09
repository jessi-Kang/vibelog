/** 장면 컴포넌트 4종 — 프로토타입(docs/shorts-prototype.html)의 레이아웃을 그대로 옮김 */
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
import { COLORS, FONT_MONO, FONT_SANS, NARRATION_DELAY } from "./theme";

/**
 * hook 문장에서 키워드를 민트로 강조한 큰 타이틀. 타이포만 — 그래픽 금지 (Jessi 지시).
 * 훅 장면에서는 하단 자막을 끄므로(중복), 훅이 2문장이면 헤드라인이
 * 지금 말하는 문장으로 갱신된다 — 화면에 안 보이는 말이 없게.
 */
export const HookCard: React.FC<{
  script: ShortsScript;
  lang: "ko" | "en";
  timing?: ShortsTiming;
}> = ({ script, lang, timing }) => {
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
          lineHeight: 1.08,
          letterSpacing: "-0.01em",
          margin: 0,
          wordBreak: "keep-all",
          textWrap: "balance",
          color: COLORS.ink,
        }}
      >
        {words.map((w, i) => (
          <React.Fragment key={i}>
            <span style={{ color: keywords.has(w) ? COLORS.accent : undefined }}>
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
          color: COLORS.muted,
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
}> = ({ videoFile, sourceOffsetSec, fromFrame, durationInFrames }) => {
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: 260,
        transform: "translateX(-50%)",
        width: 760,
        height: 1250,
        borderRadius: 70,
        background: "#000",
        border: "6px solid #2A3442",
        boxShadow: "0 40px 120px rgba(0,0,0,.6), 0 0 0 2px #0A0E14",
      }}
    >
      {/* 노치 없음 — 화면 콘텐츠를 가리지 않는다 (Jessi 지시) */}
      <div
        style={{
          position: "absolute",
          inset: 14,
          borderRadius: 56,
          overflow: "hidden",
          background: COLORS.panel,
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
              color: COLORS.muted,
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

/** 삽질 카드 — before/after 비교. 장면 시작 후 순차 등장 */
export const FailCard: React.FC<{
  script: ShortsScript;
  lang: "ko" | "en";
  sceneStartSec: number;
  sceneEndSec: number;
}> = ({ script, lang, sceneStartSec, sceneEndSec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const card = script.failCard;
  if (!card) return null;
  const local = t - sceneStartSec;
  const afterAt = (sceneEndSec - sceneStartSec) * 0.45;

  const box = (visible: boolean, delay: number): React.CSSProperties => ({
    background: COLORS.panel,
    border: `2px solid ${COLORS.line}`,
    borderRadius: 28,
    padding: "34px 38px",
    opacity: visible ? Math.min(1, (local - delay) / 0.5) : 0,
    transform: visible
      ? `translateY(${Math.max(0, 20 - ((local - delay) / 0.5) * 20)}px)`
      : "translateY(20px)",
  });

  return (
    <div style={{ position: "absolute", left: 80, right: 80, top: 300 }}>
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 30,
          letterSpacing: "0.1em",
          color: COLORS.warn,
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
          color: COLORS.ink,
        }}
      >
        {lang === "ko" ? card.title : card.titleEn}
      </h2>
      <div style={{ display: "grid", gap: 28 }}>
        <div style={box(local > 0.3, 0.3)}>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 24,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: COLORS.muted,
              marginBottom: 16,
            }}
          >
            before
          </div>
          <div style={{ fontFamily: FONT_SANS, fontSize: 34, lineHeight: 1.5, color: COLORS.ink }}>
            {card.before}
          </div>
        </div>
        <div style={box(local > afterAt, afterAt)}>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 24,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: COLORS.accent,
              marginBottom: 16,
            }}
          >
            after
          </div>
          <div style={{ fontFamily: FONT_SANS, fontSize: 34, lineHeight: 1.5, color: COLORS.ink }}>
            {card.after}
          </div>
        </div>
      </div>
    </div>
  );
};

export const EndCard: React.FC<{ script: ShortsScript }> = ({ script }) => (
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
        color: COLORS.ink,
      }}
    >
      vibe<span style={{ color: COLORS.accent }}>log</span>
    </h1>
    <div
      style={{
        marginTop: 48,
        fontFamily: FONT_MONO,
        fontSize: 34,
        color: COLORS.muted,
        display: "flex",
        gap: 28,
        flexWrap: "wrap",
      }}
    >
      <span>{script.repo}</span>
      <span style={{ color: COLORS.accent, fontWeight: 700 }}>
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
        background: COLORS.accent,
        color: COLORS.accentInk,
        fontFamily: FONT_SANS,
        fontWeight: 900,
        fontSize: 40,
        padding: "22px 40px",
        borderRadius: 18,
      }}
    >
      {script.handle} →
    </div>
  </div>
);

/** +알파 그래픽 장면 — 생성 일러스트 하나가 화면을 차지한다. 문장은 자막이 말한다 */
export const ArtCard: React.FC<{ file: string }> = ({ file }) => (
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
      border: `2px solid ${COLORS.line}`,
      boxShadow: "0 40px 120px rgba(0,0,0,.6)",
      background: COLORS.panel,
    }}
  >
    <Img
      src={staticFile(file)}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  </div>
);

export const Background: React.FC = () => (
  <AbsoluteFill style={{ background: COLORS.bg }}>
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(60% 40% at 50% 0%, rgba(94,225,195,.10), transparent 70%)",
      }}
    />
  </AbsoluteFill>
);
