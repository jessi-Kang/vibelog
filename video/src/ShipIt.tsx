/**
 * ShipIt — 1080×1920, 30fps. 장면: 훅 카드 → 폰 프레임(데모) → 삽질 카드 → 폰 → 엔드카드.
 * 장면 경계는 timing.json의 문장 시작 시각에서 온다 — 자막·음성·장면이 한 시계를 쓴다.
 */
import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { ShortsScript, ShortsTiming } from "../../scripts/shorts-types";
import { Captions } from "./Captions";
import {
  ArtCard,
  Background,
  EndCard,
  FailCard,
  HookCard,
  PhoneFrame,
} from "./Scenes";
import {
  COLORS,
  FONT_MONO,
  NARRATION_DELAY,
  SCENE_FADE,
  totalSeconds,
} from "./theme";

// Remotion Composition의 props 제약(Record<string, unknown>)을 만족시키기 위해 type으로 선언
export type ShipItProps = {
  script: ShortsScript;
  timing: ShortsTiming;
  lang: "ko" | "en";
  /** video/public/ 밑의 파일명 (예: "demo.webm"). 없으면 플레이스홀더 */
  videoFile: string | null;
  /** 소스 영상에서 로딩 화면을 건너뛰고 재생을 시작할 지점(초) */
  videoStartSec?: number;
  /** +알파 그래픽 — {scene: public/ 밑 파일명} (art.ts 산출물, 없으면 미사용) */
  artFiles?: Record<string, string> | null;
};

type Kind = "hook" | "phone" | "fail" | "end" | "art";

interface Seg {
  kind: Kind;
  from: number;
  to: number;
  /** phone 장면: 소스 영상에서 몇 초 지점부터 재생할지 */
  sourceOffset: number;
}

function kindOf(scene: string, hasNextArt: boolean): Kind {
  if (scene === "hook") return "hook";
  if (scene === "fail") return "fail";
  if (scene === "end") return "end";
  // "다음 할 것"은 데모 화면 대신 생성 일러스트 장면으로 — 그래픽이 있을 때만
  if (scene === "next" && hasNextArt) return "art";
  return "phone";
}

function buildSegments(
  script: ShortsScript,
  timing: ShortsTiming,
  total: number,
  hasNextArt: boolean,
): Seg[] {
  const raw: { kind: Kind; from: number }[] = [];
  for (const s of timing.sentences) {
    const kind = kindOf(script.lines[s.index]?.scene ?? "build", hasNextArt);
    const from = s.start + NARRATION_DELAY;
    if (raw.length === 0) {
      raw.push({ kind, from: 0 }); // 첫 장면은 0초부터
    } else if (raw[raw.length - 1].kind !== kind) {
      raw.push({ kind, from });
    }
  }
  if (raw.length === 0) raw.push({ kind: "end", from: 0 });
  if (raw[raw.length - 1].kind !== "end") {
    raw.push({ kind: "end", from: Math.max(0, total - 3) });
  }
  const segs: Seg[] = [];
  let phoneTime = 0;
  for (let i = 0; i < raw.length; i++) {
    const to = raw[i + 1]?.from ?? total;
    const seg: Seg = { ...raw[i], to, sourceOffset: phoneTime };
    if (seg.kind === "phone") phoneTime += to - seg.from;
    segs.push(seg);
  }
  return segs;
}

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export const ShipIt: React.FC<ShipItProps> = ({
  script,
  timing,
  lang,
  videoFile,
  videoStartSec = 0,
  artFiles = null,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const total = totalSeconds(timing.duration);
  const segs = buildSegments(script, timing, total, Boolean(artFiles?.next));

  const opacityOf = (seg: Seg): number => {
    const fadeIn =
      seg.from === 0
        ? 1
        : interpolate(t, [seg.from, seg.from + SCENE_FADE], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
    const fadeOut =
      seg.to >= total
        ? 1
        : interpolate(t, [seg.to, seg.to + SCENE_FADE], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
    return fadeIn * fadeOut;
  };

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <Background />

      {segs.map((seg, i) => {
        const opacity = opacityOf(seg);
        if (opacity <= 0) return null;
        return (
          <AbsoluteFill key={i} style={{ opacity }}>
            {seg.kind === "hook" && (
              <HookCard script={script} lang={lang} artFile={artFiles?.hook} />
            )}
            {seg.kind === "art" && artFiles?.next && (
              <ArtCard file={artFiles.next} />
            )}
            {seg.kind === "phone" && (
              <PhoneFrame
                videoFile={videoFile}
                sourceOffsetSec={videoStartSec + seg.sourceOffset}
                fromFrame={Math.floor(seg.from * fps)}
                durationInFrames={Math.ceil((seg.to - seg.from + SCENE_FADE) * fps)}
              />
            )}
            {seg.kind === "fail" && (
              <FailCard
                script={script}
                lang={lang}
                sceneStartSec={seg.from}
                sceneEndSec={seg.to}
              />
            )}
            {seg.kind === "end" && <EndCard script={script} />}
          </AbsoluteFill>
        );
      })}

      {/* eyebrow */}
      <div
        style={{
          position: "absolute",
          top: 88,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: FONT_MONO,
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: COLORS.muted,
          textTransform: "uppercase",
        }}
      >
        <span>
          <span style={{ color: COLORS.accent }}>vibelog</span> · day{" "}
          {String(script.day).padStart(2, "0")}
        </span>
        <span
          style={{
            border: `2px solid ${COLORS.line}`,
            borderRadius: 999,
            padding: "10px 24px",
            color: COLORS.ink,
          }}
        >
          {script.template.replace("-", " ")}
        </span>
      </div>

      <Captions script={script} timing={timing} lang={lang} />

      {/* progress */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 110,
          height: 8,
          background: COLORS.line,
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(100, (t / total) * 100)}%`,
            background: COLORS.accent,
          }}
        />
      </div>

      {/* footer — 워터마크 없음, 카피라이트 한 줄 (스펙) */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 44,
          display: "flex",
          justifyContent: "space-between",
          fontFamily: FONT_MONO,
          fontSize: 24,
          color: COLORS.muted,
          letterSpacing: "0.06em",
        }}
      >
        <span>© {new Date(script.date).getFullYear()} vibelog · Jessi</span>
        <span>
          {fmt(t)} / {fmt(total)}
        </span>
      </div>
    </AbsoluteFill>
  );
};
