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
import type {
  ShortsScript,
  ShortsTiming,
  TimedSentence,
} from "../../scripts/shorts-types";
import { interpolate, Easing } from "remotion";
import {
  FONT_MONO,
  FONT_SANS,
  keywordIndices,
  keywordStyle,
  NARRATION_DELAY,
  visualLen,
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
  /** 화면 시간 → 오디오 시간 변환 오프셋 (콜드오픈 포함) */
  offsetSec?: number;
}> = ({ script, lang, timing, th, offsetSec = NARRATION_DELAY }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps - offsetSec; // 오디오 시간
  const hookLines = script.lines
    .map((l, i) => ({ l, i }))
    .filter((x) => x.l.scene === "hook");
  let hook = hookLines[0]?.l;
  let sent: TimedSentence | undefined;
  if (!hook) return null;
  if (timing) {
    for (const s of timing.sentences) {
      const x = hookLines.find((h) => h.i === s.index);
      if (x && t >= s.start) {
        hook = x.l;
        sent = s;
      }
    }
    sent ??= timing.sentences.find((s) => s.index === hookLines[0].i);
  }
  const words = hook[lang].split(/\s+/);
  // "두 번" 같은 여러 단어 구 키워드도 통째로 켜진다
  const kwOn = keywordIndices(
    words,
    lang === "ko" ? hook.keywords : hook.keywordsEn,
  );
  // 단어별 발화 시각 — ElevenLabs 토큰 수가 표기 단어 수와 같을 때만
  // (다르면 정적 표시 폴백). 말하는 순간 떠오르는 모션의 기준.
  const starts =
    sent && sent.words.length === words.length
      ? sent.words.map((w) => w.start)
      : null;
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
          // 긴 훅은 줄여서 — 132px 고정이면 25자 넘는 문장이 글자 벽이 된다
          // (Jessi 지적). 대본 규칙은 20자 안팎이지만 렌더도 방어한다.
          // 기준은 시각 폭(한글 1·영문 0.5) — 영어가 억울하게 줄지 않게.
          fontSize: visualLen(hook[lang]) > 24 ? 104 : 132,
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
        {words.map((w, i) => {
          // 말하는 순간 14px 아래서 떠오르며 켜진다 — 자막과 같은 문법
          const at = starts ? starts[i] : -Infinity;
          const p = Math.min(1, Math.max(0, (t - at) / 0.3));
          const isKw = kwOn.has(i);
          // 키워드 점화 팝 — 켜지는 순간 살짝 튀었다 자리잡는다.
          // 켜지기 전엔 1 — clamp가 시작값(1.12)을 미리 적용하면 아직 안
          // 말한 키워드가 커진 채 이웃 단어 간격을 먹는다 (영문 검증에서 발견)
          const pop =
            isKw && starts && t >= at
              ? interpolate(t, [at, at + 0.32], [1.12, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.out(Easing.back(1.4)),
                })
              : 1;
          return (
            <React.Fragment key={i}>
              <span
                style={{
                  display: "inline-block",
                  opacity: 0.25 + 0.75 * p,
                  transform: `translateY(${14 * (1 - p)}px) scale(${pop})`,
                  transformOrigin: "50% 80%",
                  ...(isKw && p > 0 ? keywordStyle(th, 1) : {}),
                }}
              >
                {w}
              </span>
              {i < words.length - 1 ? " " : null}
            </React.Fragment>
          );
        })}
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

/** 데모 샷 종류 — 매 데모 장면이 같은 폰 컷이면 중반이 늘어진다 (Jessi 지시).
 *  phone(베젤+켄 번스) / band(와이드 밴드 크롭+세로 팬) / duo(두 시점 겹치기).
 *  녹화가 390×844라 1080 풀블리드는 화질이 무너진다 — 셋 다 업스케일 ~2배 이내. */
export type DemoShot = "phone" | "band" | "duo" | "card";

/** 폰 프레임 + 데모 녹화. videoFile이 없으면 플레이스홀더 패널 */
export const PhoneFrame: React.FC<{
  videoFile: string | null;
  /** 이 장면이 시작될 때 소스 영상에서 몇 초 지점부터 틀지 */
  sourceOffsetSec: number;
  fromFrame: number;
  durationInFrames: number;
  th: ShortsTheme;
  /** 카메라워크(느린 줌 + 입장 틸트)용 장면 구간(초)과 순번 */
  fromSec?: number;
  toSec?: number;
  segIndex?: number;
  /** 데모 연출 — day+장면 순번으로 로테이션. 녹화 없으면 phone 플레이스홀더 */
  shot?: DemoShot;
  /** 이 블록이 화면의 한 곳을 붙잡고 있는지 (대본 find) — 프레임 팬을 끈다 */
  held?: boolean;
  /** 붙잡은 요소가 녹화 화면에서 세로로 어디였는지 (0~1) — band 크롭의 기준 */
  focusY?: number;
  /** 그림 한 장짜리 화면의 가로세로비 — 있으면 card 샷으로 그 비율대로 */
  aspect?: number;
  /** duo 보조 폰이 틀 다른 화면의 소스 시각 — 없으면 같은 화면 +3초 폴백 */
  duoAltOffsetSec?: number;
}> = ({
  videoFile,
  sourceOffsetSec,
  fromFrame,
  durationInFrames,
  th,
  fromSec,
  toSec,
  segIndex = 0,
  shot = "phone",
  held = false,
  focusY,
  aspect,
  duoAltOffsetSec,
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const t = frame / fps;
  const clamp0 = {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  } as const;
  const span =
    fromSec != null && toSec != null && toSec > fromSec
      ? ([fromSec, toSec] as const)
      : null;

  if (videoFile && shot === "card" && aspect) {
    // **그림 한 장은 그 비율대로 보여 준다.** 링크 미리보기 카드(og:image)는
    // 앱 화면이 아니라 가로로 긴 그림이다. 폰 프레임(세로)에 cover로 넣으면
    // 억지로 늘어나고 양옆이 잘린다 — 공유 카드가 실제로 그렇게 나갔다.
    //
    // 녹화기가 그림을 화면 **폭에 맞춰** 띄워 뒀으므로(scripts/record.ts),
    // 폭을 채우는 이 카드에 같은 비율을 주고 세로 기준만 그림의 가운데
    // (focusY)로 잡으면 소스의 그림 띠와 정확히 맞아떨어진다. 늘어나지도,
    // 잘리지도 않는다.
    const W = 940;
    const H = Math.round(W / aspect);
    const panY = focusY != null ? Math.min(95, Math.max(5, focusY * 100)) : 50;
    const zoom = span ? interpolate(t, [...span], [1.0, 1.04], clamp0) : 1;
    return (
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 960 - H / 2,
          transform: `translateX(-50%) scale(${zoom})`,
          width: W,
          height: H,
          borderRadius: Math.max(18, th.radius),
          overflow: "hidden",
          border: `2px solid ${th.line}`,
          background: th.panel,
          boxShadow: th.light
            ? "0 24px 70px rgba(23,26,31,.18)"
            : "0 30px 90px rgba(0,0,0,.5)",
        }}
      >
        <Sequence
          from={fromFrame}
          durationInFrames={durationInFrames}
          layout="none"
        >
          <OffthreadVideo
            src={staticFile(videoFile)}
            muted
            startFrom={Math.round(sourceOffsetSec * fps)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: `50% ${panY}%`,
            }}
          />
        </Sequence>
      </div>
    );
  }

  if (videoFile && shot === "band") {
    // 와이드 밴드 크롭 — 베젤 없이 화면 중앙을 크게.
    // **가리킨 것이 있으면 프레임 안에서도 팬하지 않는다** — 녹화가 그 자리에
    // 머물러 있는데 크롭이 위아래로 움직이면 결국 요소가 프레임에서 빠져나간다
    // (Jessi: "보여줘야 할 부분을 휙 넘겨버려"). 움직임은 미세한 줌만 남긴다.
    // 붙잡은 요소가 있으면 그 세로 위치를 크롭의 기준점으로 삼는다. 가운데
    // (50%)로 고정하면 화면 위쪽·아래쪽에 있는 요소가 띠 밖으로 잘려 나간다
    // (Jessi: "제대로 표시했는데 영상에서 보여줄 때 짤렸잖아").
    const panY = held
      ? focusY != null
        ? Math.min(88, Math.max(12, focusY * 100))
        : 50
      : span
        ? interpolate(t, [...span], [18, 46], clamp0)
        : 30;
    const zoom = span ? interpolate(t, [...span], [1.0, 1.07], clamp0) : 1;
    return (
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 460,
          transform: `translateX(-50%) scale(${zoom})`,
          width: 830,
          height: 740,
          borderRadius: Math.max(20, th.radius),
          overflow: "hidden",
          border: `2px solid ${th.line}`,
          background: th.panel,
          boxShadow: th.light
            ? "0 30px 90px rgba(23,26,31,.16)"
            : "0 40px 120px rgba(0,0,0,.55)",
        }}
      >
        <Sequence
          from={fromFrame}
          durationInFrames={durationInFrames}
          layout="none"
        >
          <OffthreadVideo
            src={staticFile(videoFile)}
            muted
            startFrom={Math.round(sourceOffsetSec * fps)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: `50% ${panY}%`,
            }}
          />
        </Sequence>
      </div>
    );
  }

  if (videoFile && shot === "duo") {
    // 두 시점 겹치기 — 폰 두 대. 앞(왼쪽) 폰은 내레이션과 매칭된 주 화면,
    // 뒤(오른쪽) 폰은 녹화된 '다른' 화면(duoAltOffsetSec) — 같은 화면이
    // 좌우에 반복되면 의미가 없다 (Jessi 지적). 다른 화면 녹화가 없는
    // 옛 영상만 같은 화면 +3초 폴백. 작게 그려서 오히려 선명하다 (~1.2배)
    const lift = span ? interpolate(t, [...span], [8, -8], clamp0) : 0;
    const altStart = duoAltOffsetSec ?? sourceOffsetSec + 3;
    const phones: {
      left?: number;
      right?: number;
      top: number;
      rot: number;
      start: number;
      dy: number;
      z: number;
    }[] = [
      { right: 108, top: 420, rot: 2.5, start: altStart, dy: -lift, z: 1 },
      {
        left: 108,
        top: 300,
        rot: -2.5,
        start: sourceOffsetSec,
        dy: lift,
        z: 2,
      },
    ];
    return (
      <>
        {phones.map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.left,
              right: p.right,
              top: p.top,
              zIndex: p.z,
              transform: `translateY(${p.dy}px) rotate(${p.rot}deg)`,
              width: 470,
              height: 800,
              borderRadius: Math.max(20, th.radius * 1.8),
              background: th.light ? "#fff" : "#000",
              border: `4px solid ${th.light ? "#D5DAE0" : th.line}`,
              boxShadow: th.light
                ? "0 24px 70px rgba(23,26,31,.18)"
                : `0 30px 90px rgba(0,0,0,.6), 0 0 0 2px ${th.bg}`,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 10,
                borderRadius: Math.max(14, th.radius * 1.4),
                overflow: "hidden",
                background: th.panel,
              }}
            >
              <Sequence
                from={fromFrame}
                durationInFrames={durationInFrames}
                layout="none"
              >
                <OffthreadVideo
                  src={staticFile(videoFile)}
                  muted
                  startFrom={Math.round(p.start * fps)}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </Sequence>
            </div>
          </div>
        ))}
      </>
    );
  }
  // 정지된 폰은 3초만 지나도 밋밋하다 — 장면마다 방향을 바꾸는 느린 줌
  // (1.0↔1.12)에 수직 드리프트를 겹쳐 켄 번스식 촬영감을 준다.
  // 1.05는 전혀 안 느껴졌다 (Jessi 지적) — 줌 폭과 틸트를 키웠다.
  const clamp = {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  } as const;
  const zoom =
    fromSec != null && toSec != null && toSec > fromSec
      ? interpolate(
          t,
          [fromSec, toSec],
          segIndex % 2 === 0 ? [1.0, 1.12] : [1.12, 1.0],
          clamp,
        )
      : 1;
  const drift =
    fromSec != null && toSec != null && toSec > fromSec
      ? interpolate(
          t,
          [fromSec, toSec],
          segIndex % 2 === 0 ? [10, -10] : [-10, 10],
          clamp,
        )
      : 0;
  const tilt =
    fromSec != null
      ? interpolate(t, [fromSec, fromSec + 1.1], [5, 0], {
          ...clamp,
          easing: Easing.out(Easing.cubic),
        })
      : 0;
  return (
    <div
      style={{
        // 자막 구역(하단 ~1530부터)과 안 겹치게 프레임을 줄였다 — 폰 하단 1370
        position: "absolute",
        left: "50%",
        top: 240,
        transformOrigin: "50% 42%",
        transform: `translateX(-50%) translateY(${drift}px) perspective(1400px) rotateY(${tilt}deg) scale(${zoom})`,
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
          <Sequence
            from={fromFrame}
            durationInFrames={durationInFrames}
            layout="none"
          >
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
  /** before-after 템플릿: 상하 나열 대신 좌우 대비 2열 */
  split?: boolean;
}> = ({ script, lang, sceneStartSec, sceneEndSec, th, split = false }) => {
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
      // split 2열처럼 좁은 칸에서 음절 중간이 잘리지 않게
      wordBreak: "keep-all",
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

  const title = lang === "ko" ? card.title : card.titleEn;
  return (
    // 세로 중앙 정렬 — top 고정이면 내용이 짧을 때(특히 split 2열) 화면
    // 하단이 통째로 비어 보인다 (Jessi 지적)
    <div
      style={{
        position: "absolute",
        left: 80,
        right: 80,
        top: "46%",
        transform: "translateY(-50%)",
      }}
    >
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
          // 긴 제목은 줄여서 — 110px 고정이면 "두 번" 같은 의미 단위
          // 한가운데서 줄이 꺾인다 (Jessi 지적). 작아지면 쉼표·어절
          // 경계에서 자연스럽게 나뉜다. 기준은 시각 폭(한글 1·영문 0.5).
          fontSize: visualLen(title) > 10 ? 88 : 110,
          lineHeight: 1.08,
          margin: "20px 0 60px",
          wordBreak: "keep-all",
          textWrap: "balance",
          color: th.ink,
        }}
      >
        {title}
      </h2>
      <div
        style={{
          display: "grid",
          gap: 28,
          ...(split
            ? { gridTemplateColumns: "1fr 1fr", alignItems: "stretch" }
            : {}),
        }}
      >
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
        <div
          style={{
            ...boxBase,
            ...afterBox,
            ...appear(local > afterAt, afterAt),
          }}
        >
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

export const EndCard: React.FC<{
  script: ShortsScript;
  th: ShortsTheme;
  /** 장면 시작(화면 시간) — 스태거 등장의 기준. 없으면 정적 표시 */
  sceneStartSec?: number;
}> = ({ script, th, sceneStartSec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const clamp = {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  } as const;
  // 타이틀 → 메타 → CTA 순서로 떠오른다. 마지막 장면이 정지화면이 되지 않게.
  const rise = (delay: number): React.CSSProperties => {
    if (sceneStartSec == null) return {};
    const at = sceneStartSec + delay;
    const p = interpolate(t, [at, at + 0.5], [0, 1], {
      ...clamp,
      easing: Easing.out(Easing.cubic),
    });
    return { opacity: p, transform: `translateY(${24 * (1 - p)}px)` };
  };
  // CTA 화살표가 주기적으로 까딱인다 — "여기로 오라"는 유일한 반복 모션
  const nudge =
    sceneStartSec == null
      ? 0
      : Math.max(0, Math.sin((t - sceneStartSec) * Math.PI * 1.25)) * 8;
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
          fontSize: 120,
          lineHeight: 1.05,
          margin: 0,
          color: th.ink,
          ...rise(0.05),
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
          ...rise(0.28),
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
          ...rise(0.5),
        }}
      >
        {script.handle}{" "}
        <span
          style={{
            display: "inline-block",
            transform: `translateX(${nudge}px)`,
          }}
        >
          →
        </span>
      </div>
    </div>
  );
};

/** +알파 그래픽 장면 — 생성 일러스트 (현재 보류, 레퍼런스 확정 시 재개) */
export const ArtCard: React.FC<{ file: string; th: ShortsTheme }> = ({
  file,
  th,
}) => (
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

/**
 * 배경 — 테마의 backdrop 변형: 글로우 / 격자 / 상단 엣지 / 무지.
 * 정지 배경은 30초를 못 버틴다 — 글로우는 숨쉬듯 밝기가 순환하고(7초 주기),
 * 격자는 아주 느리게 흐른다. 눈에 겨우 걸리는 앰비언트 모션.
 */
export const Background: React.FC<{ th: ShortsTheme }> = ({ th }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill style={{ background: th.bg }}>
      {th.backdrop === "glow" && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(60% 40% at 50% 0%, ${th.accent}1a, transparent 70%)`,
            opacity: 0.72 + 0.28 * Math.sin((t / 7) * Math.PI * 2),
          }}
        />
      )}
      {th.backdrop === "grid" && (
        <AbsoluteFill
          style={{
            backgroundImage: `linear-gradient(${th.accent}0d 2px, transparent 2px), linear-gradient(90deg, ${th.accent}0d 2px, transparent 2px)`,
            backgroundSize: "108px 108px",
            backgroundPosition: `${t * 3.5}px ${t * 3.5}px`,
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
};

/**
 * 콜드오픈 — 내레이션 전 2초를 템플릿의 문법으로 연다 (Jessi 승인 A안 + 템플릿 3종).
 *   log(ship-it): 그날의 실제 커밋 로그가 터미널에 촤르륵 — "커밋이 곧 콘텐츠"
 *   error(fail): ✗ 와 사고 한 줄이 탁 박힌다 — 사고 리포트의 첫 컷
 *   diff(before-after): git diff의 -어제 +오늘 두 줄 — 변화 대비의 첫 컷
 * 재료는 전부 실물(frontmatter shas / failCard) — 지어내지 않는다.
 */
export const ColdOpen: React.FC<{
  variant: "log" | "error" | "diff";
  commits?: [string, string][];
  /** 그날 커밋 수 — ×N 카운터. shas는 일부만 실리므로 별도 값 */
  commitCount?: number;
  before?: string;
  after?: string;
  /** DAY NN — log 스타일 로테이션의 시드. 에피소드마다 다른 오프닝이 나온다 */
  day?: number;
  th: ShortsTheme;
}> = ({
  variant,
  commits = [],
  commitCount = 0,
  before = "",
  after = "",
  day = 1,
  th,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const clamp = {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  } as const;
  const panel: React.CSSProperties = {
    position: "absolute",
    left: 80,
    right: 80,
    top: "50%",
    transform: "translateY(-50%)",
    background: th.panel,
    border: `2px solid ${th.line}`,
    borderRadius: th.radius,
    padding: "52px 56px",
    fontFamily: FONT_MONO,
    fontSize: 33,
    lineHeight: 1.9,
    color: th.muted,
    boxShadow: th.light
      ? "0 20px 70px rgba(23,26,31,.12)"
      : "0 30px 100px rgba(0,0,0,.5)",
  };
  const typed = (cmd: string): string => {
    const len = Math.floor(interpolate(t, [0.08, 0.6], [0, cmd.length], clamp));
    return (
      cmd.slice(0, len) + (t < 0.7 && Math.floor(t * 3) % 2 === 0 ? "▍" : "")
    );
  };
  const appearAt = (at: number): React.CSSProperties => ({
    opacity: t >= at ? Math.min(1, (t - at) / 0.2) : 0,
  });

  if (variant === "error") {
    // 사고 리포트 컷 — ✗가 튀어오르고 사고 한 줄이 박힌다
    const pop = interpolate(t, [0.12, 0.5], [0.5, 1], {
      ...clamp,
      easing: Easing.out(Easing.back(1.8)),
    });
    return (
      <div style={{ ...panel, lineHeight: 1.5 }}>
        <div
          style={{
            fontSize: 26,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: th.warn,
            ...appearAt(0.1),
          }}
        >
          fail
        </div>
        <div
          style={{
            display: "flex",
            gap: 28,
            marginTop: 24,
            alignItems: "flex-start",
          }}
        >
          <span
            style={{
              color: th.warn,
              fontWeight: 700,
              fontSize: 76,
              lineHeight: 1,
              opacity: t >= 0.12 ? 1 : 0,
              transform: `scale(${pop})`,
              transformOrigin: "50% 50%",
            }}
          >
            ✗
          </span>
          <span
            style={{
              fontFamily: FONT_SANS,
              fontSize: 44,
              fontWeight: 700,
              lineHeight: 1.4,
              color: th.ink,
              wordBreak: "keep-all",
              ...appearAt(0.55),
            }}
          >
            {before}
          </span>
        </div>
      </div>
    );
  }

  if (variant === "diff") {
    // 변화 대비 컷 — -어제 +오늘. before는 muted, after는 accent로
    return (
      <div style={{ ...panel, lineHeight: 1.6 }}>
        <div style={{ color: th.ink, fontWeight: 700 }}>
          {typed("$ git diff")}
        </div>
        <div
          style={{
            marginTop: 20,
            color: th.warn,
            wordBreak: "keep-all",
            ...appearAt(0.75),
          }}
        >
          <span style={{ fontWeight: 700 }}>-</span>{" "}
          <span style={{ opacity: 0.75 }}>{before}</span>
        </div>
        <div
          style={{
            marginTop: 12,
            color: th.accent,
            fontWeight: 700,
            wordBreak: "keep-all",
            ...appearAt(1.15),
          }}
        >
          + {after}
        </div>
      </div>
    );
  }

  // log 변형 — 같은 오프닝이 연속되면 안 된다 (Jessi 지시). 스타일 3종을
  // day로 돌린다: graph(커밋 레일) / list(텍스트 나열) / count(대형 카운터).
  // 재료는 전부 실물 — 타입(feat/fix)은 실제 커밋 메시지 prefix에서 파싱,
  // 색은 테마 토큰이라 5테마에 자동으로 맞는다.
  const rows = commits.slice(0, 5);
  const typeColor = (msg: string): string => {
    const prefix = msg.match(/^(\w+):/)?.[1];
    if (prefix === "feat") return th.accent;
    if (prefix === "fix") return th.warn;
    return th.muted;
  };
  const shown = Math.round(
    interpolate(t, [0.65, 1.5], [0, commitCount], clamp),
  );
  const logStyle = (["graph", "list", "count"] as const)[
    Math.max(0, day - 1) % 3
  ];

  const header = (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
      }}
    >
      <span style={{ color: th.ink, fontWeight: 700 }}>
        {typed("$ git log --oneline")}
      </span>
      {commitCount > 0 && logStyle !== "count" && (
        <span
          style={{
            color: th.accent,
            fontWeight: 700,
            fontSize: 54,
            lineHeight: 1,
            ...appearAt(0.65),
          }}
        >
          ×{shown}
        </span>
      )}
    </div>
  );

  if (logStyle === "count") {
    // 대형 카운터 컷 — 그날의 양을 숫자 하나로. 아래 점 줄은 커밋 타입들
    const pop = interpolate(t, [0.65, 1.0], [0.8, 1], {
      ...clamp,
      easing: Easing.out(Easing.back(1.6)),
    });
    return (
      <div style={{ ...panel, paddingBottom: 64 }}>
        {header}
        <div style={{ textAlign: "center", marginTop: 30 }}>
          <span
            style={{
              display: "inline-block",
              color: th.accent,
              fontWeight: 700,
              fontSize: 190,
              lineHeight: 1.1,
              transform: `scale(${pop})`,
              ...appearAt(0.65),
            }}
          >
            ×{shown}
          </span>
          <div
            style={{
              marginTop: 26,
              display: "flex",
              justifyContent: "center",
              gap: 18,
            }}
          >
            {rows.map(([sha, msg], i) => (
              <div
                key={sha}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  background: typeColor(msg),
                  ...appearAt(1.1 + i * 0.1),
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (logStyle === "list") {
    // 텍스트 나열 컷 — 터미널에 커밋이 촤르륵 (원형)
    return (
      <div style={panel}>
        {header}
        {rows.map(([sha, msg], i) => {
          const at = 0.72 + i * 0.16;
          return (
            <div
              key={sha}
              style={{
                ...appearAt(at),
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              <span style={{ color: th.accent, fontWeight: 700 }}>{sha}</span>{" "}
              {msg}
            </div>
          );
        })}
      </div>
    );
  }

  // 커밋 레일 그래프 컷 — git log --graph 은유. 레일이 아래로 자라며 노드가 팝
  const ROW_H = 76;
  const lastOn = rows.reduce((n, _, i) => (t >= 0.72 + i * 0.16 ? i : n), 0);
  const railH = interpolate(
    t,
    [0.72, 0.72 + Math.max(1, rows.length - 1) * 0.16],
    [0, lastOn * ROW_H],
    clamp,
  );
  return (
    <div style={panel}>
      {header}
      <div style={{ position: "relative", marginTop: 34, paddingLeft: 58 }}>
        <div
          style={{
            position: "absolute",
            left: 13,
            top: 20,
            width: 4,
            height: railH,
            background: th.line,
            borderRadius: 2,
          }}
        />
        {rows.map(([sha, msg], i) => {
          const at = 0.72 + i * 0.16;
          const pop = interpolate(t, [at, at + 0.3], [0.3, 1], {
            ...clamp,
            easing: Easing.out(Easing.back(2)),
          });
          const color = typeColor(msg);
          const m = msg.match(/^(\w+:)\s*(.*)$/);
          return (
            <div
              key={sha}
              style={{
                position: "relative",
                height: ROW_H,
                display: "flex",
                alignItems: "center",
                gap: 20,
                ...appearAt(at),
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: -58 + 4,
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  background: color,
                  transform: `scale(${t >= at ? pop : 0})`,
                }}
              />
              <span style={{ color: th.accent, fontWeight: 700, fontSize: 28 }}>
                {sha}
              </span>
              <span
                style={{
                  flex: 1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontSize: 30,
                }}
              >
                {m ? (
                  <>
                    <span style={{ color, fontWeight: 700 }}>{m[1]}</span>{" "}
                    <span style={{ color: th.muted }}>{m[2]}</span>
                  </>
                ) : (
                  <span style={{ color: th.muted }}>{msg}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * 숫자 모먼트 — 내레이션이 숫자를 말하는 순간, 카운터가 탁 박히는 1.5초
 * 인서트 (Jessi 승인 B안). stat은 대본이 마킹한 "숫자+단위" 문자열.
 */
export const StatPunch: React.FC<{
  stat: string;
  startSec: number;
  th: ShortsTheme;
}> = ({ stat, startSec, th }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const END = startSec + 1.5;
  if (t < startSec || t > END) return null;
  const clamp = {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  } as const;
  // 콤마 표기("2,889곳")는 콤마를 걷어내고 숫자를 읽는다 — \d+만 잡으면
  // 콤마 앞 "2"에서 끊겨 카운터가 2에서 멈추던 버그
  const num = Number(stat.replace(/,/g, "").match(/\d+/)?.[0] ?? 0);
  const suffix = stat.replace(/^[\d,.]+/, "");
  const shown = Math.round(
    interpolate(t, [startSec + 0.05, startSec + 0.6], [0, num], clamp),
  );
  const scale = interpolate(t, [startSec, startSec + 0.35], [0.72, 1], {
    ...clamp,
    easing: Easing.out(Easing.back(1.6)),
  });
  const fade =
    interpolate(t, [startSec, startSec + 0.15], [0, 1], clamp) *
    interpolate(t, [END - 0.25, END], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      {/* 잠깐 화면을 가져가는 인서트 — 옅은 스크림으로 초점 이동 */}
      <AbsoluteFill style={{ background: `${th.bg}b3` }} />
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: "50%",
          transform: `translateY(-54%) scale(${scale})`,
          textAlign: "center",
          fontFamily: FONT_SANS,
          fontWeight: 900,
          color: th.ink,
        }}
      >
        <span
          style={{ fontSize: 240, letterSpacing: "-0.02em", color: th.accent }}
        >
          {
            shown.toLocaleString(
              "en-US",
            ) /* 천 단위 콤마 — 렌더 환경 로케일에 안 흔들리게 고정 */
          }
        </span>
        <span style={{ fontSize: 100 }}>{suffix}</span>
      </div>
    </AbsoluteFill>
  );
};
