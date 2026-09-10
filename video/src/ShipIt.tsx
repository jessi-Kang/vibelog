/**
 * ShipIt — 1080×1920, 30fps. 장면: 훅 카드 → 폰 프레임(데모) → 삽질 카드 → 폰 → 엔드카드.
 * 장면 경계는 timing.json의 문장 시작 시각에서 온다 — 자막·음성·장면이 한 시계를 쓴다.
 */
import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  coldOpenKind,
  type ShortsScript,
  type ShortsTiming,
} from "../../scripts/shorts-types";
import { Captions } from "./Captions";
import {
  ArtCard,
  Background,
  ColdOpen,
  EndCard,
  FailCard,
  HookCard,
  PhoneFrame,
  StatPunch,
} from "./Scenes";
import {
  COLD_OPEN_SEC,
  FONT_MONO,
  getTheme,
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
  /** 레포가 고른 테마 이름 (vibelog.json "theme") — 없으면 terminal */
  theme?: string | null;
};

type Kind = "cold" | "hook" | "phone" | "fail" | "end" | "art";

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
  offset: number,
  coldOpen: number,
): Seg[] {
  const raw: { kind: Kind; from: number }[] = [];
  // 커밋 콜드오픈 — 내레이션 전 무음 구간을 터미널 장면이 채운다
  if (coldOpen > 0) raw.push({ kind: "cold", from: 0 });
  for (const s of timing.sentences) {
    const kind = kindOf(script.lines[s.index]?.scene ?? "build", hasNextArt);
    const from = s.start + offset;
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
  theme = null,
}) => {
  const th = getTheme(theme);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cold = coldOpenKind(script); // 템플릿별 콜드오픈 문법 (없으면 null)
  const coldOpen = cold ? COLD_OPEN_SEC : 0;
  const offset = NARRATION_DELAY + coldOpen; // 화면 시간 = 오디오 시간 + offset
  // fail 템플릿은 사고 리포트 톤 — 훅 키워드가 accent 대신 warn으로 켜진다
  const hookTh =
    script.template === "fail" && th.warn !== th.accent
      ? { ...th, accent: th.warn }
      : th;
  const total = totalSeconds(timing.duration, coldOpen);
  const segs = buildSegments(
    script, timing, total, Boolean(artFiles?.next), offset, coldOpen,
  );

  // 순차 페이드 — 나가는 장면은 경계 전에 다 사라지고, 들어오는 장면은
  // 경계부터 뜬다. 크로스페이드는 레이아웃이 다른 장면끼리 애매하게
  // 겹쳐 보였다 (Jessi 지적).
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
        : interpolate(t, [seg.to - SCENE_FADE, seg.to], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
    return fadeIn * fadeOut;
  };

  return (
    <AbsoluteFill style={{ background: th.bg }}>
      <Background th={th} />

      {segs.map((seg, i) => {
        const opacity = opacityOf(seg);
        if (opacity <= 0) return null;
        // 장면 입장 라이즈 — 페이드에 20px 상승을 더해 컷마다 방향감을 준다.
        // 폰 프레임은 자체 카메라워크(틸트·줌)가 있어 제외.
        const rise =
          seg.from > 0 && seg.kind !== "phone"
            ? interpolate(t, [seg.from, seg.from + SCENE_FADE + 0.1], [20, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.cubic),
              })
            : 0;
        return (
          <AbsoluteFill
            key={i}
            style={{ opacity, transform: `translateY(${rise}px)` }}
          >
            {seg.kind === "cold" && cold && (
              <ColdOpen
                variant={cold}
                // 영문 영상엔 번역된 커밋 메시지 (없으면 ko 폴백 — 구버전 대본)
                commits={
                  lang === "en" && script.commitsEn?.length
                    ? script.commitsEn
                    : script.commits
                }
                commitCount={script.commitCount ?? script.commits?.length ?? 0}
                day={script.day}
                before={
                  lang === "ko"
                    ? script.failCard?.before
                    : (script.failCard?.beforeEn ?? script.failCard?.before)
                }
                after={
                  lang === "ko"
                    ? script.failCard?.after
                    : (script.failCard?.afterEn ?? script.failCard?.after)
                }
                th={th}
              />
            )}
            {seg.kind === "hook" && (
              <HookCard
                script={script}
                lang={lang}
                timing={timing}
                th={hookTh}
                offsetSec={offset}
              />
            )}
            {seg.kind === "art" && artFiles?.next && (
              <ArtCard file={artFiles.next} th={th} />
            )}
            {seg.kind === "phone" && (
              <PhoneFrame
                videoFile={videoFile}
                sourceOffsetSec={videoStartSec + seg.sourceOffset}
                fromFrame={Math.floor(seg.from * fps)}
                durationInFrames={Math.ceil((seg.to - seg.from + SCENE_FADE) * fps)}
                th={th}
                fromSec={seg.from}
                toSec={seg.to}
                segIndex={i}
              />
            )}
            {seg.kind === "fail" && (
              <FailCard
                script={script}
                lang={lang}
                sceneStartSec={seg.from}
                sceneEndSec={seg.to}
                th={th}
                split={script.template === "before-after"}
              />
            )}
            {seg.kind === "end" && (
              <EndCard script={script} th={th} sceneStartSec={seg.from} />
            )}
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
          color: th.muted,
          textTransform: "uppercase",
        }}
      >
        <span>
          <span style={{ color: th.accent }}>vibelog</span> · day{" "}
          {String(script.day).padStart(2, "0")}
        </span>
        <span
          style={{
            border: `2px solid ${th.badgeFill ? th.accent : th.line}`,
            borderRadius: th.badgeRadius,
            padding: "10px 24px",
            color: th.badgeFill ? th.accentInk : th.ink,
            background: th.badgeFill ? th.accent : "transparent",
            fontWeight: 700,
          }}
        >
          {script.template.replace("-", " ")}
        </span>
      </div>

      {/* 숫자 모먼트 — 내레이션이 stat을 말하는 순간의 카운터 인서트 */}
      {script.lines.map((l, i) => {
        if (!l.stat) return null;
        const sent = timing.sentences.find((x) => x.index === i);
        if (!sent) return null;
        const digits = l.stat.match(/\d+/)?.[0];
        const w = digits
          ? sent.words.find((x) => x.text.includes(digits))
          : undefined;
        return (
          <StatPunch
            key={`stat-${i}`}
            stat={l.stat}
            startSec={(w?.start ?? sent.start) + offset}
            th={th}
          />
        );
      })}

      <Captions
        script={script}
        timing={timing}
        lang={lang}
        th={th}
        offsetSec={offset}
      />

      {/* progress */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 110,
          height: 8,
          background: th.light ? th.panel2 : th.line,
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(100, (t / total) * 100)}%`,
            background: th.accent,
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
          color: th.muted,
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
