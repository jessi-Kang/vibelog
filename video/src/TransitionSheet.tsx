/**
 * TransitionSheet — **검수용** 컴포지션. 발행 파이프라인은 쓰지 않는다.
 *
 * 장면 전환을 고르려고 만든 비교 영상 (10/11). 실제 쇼츠에 나오는 장면 부품(모티프·종이 콜라주
 * 그림·아이콘 장면·다이어그램)을 그대로 이어 붙이고, 장면 사이만 바꿔 본다.
 *   cut   지금 쇼츠처럼 툭 끊긴다
 *   fade  @remotion/transitions fade
 *   slide @remotion/transitions slide (오른쪽에서)
 *   wipe  @remotion/transitions wipe (왼쪽에서)
 *   mix   fade + 그림이 들어올 때 @remotion/motion-blur
 *         (빛 번짐 @remotion/light-leaks도 넣어 봤다가 뺐다 — 번쩍하는 게 이상했다, 10/11)
 *
 * 그림은 video/public/sheet/에 넣어 둔다 (커밋하지 않는다 — art-try 워크플로의 시안 그림).
 * 렌더: cd video && npx remotion render TransitionSheet out.mp4 --props='{"variant":"fade"}'
 */
import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  TransitionSeries,
  linearTiming,
  springTiming,
  type TransitionPresentation,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { CameraMotionBlur } from "@remotion/motion-blur";
import type { ProjectIcon } from "../../lib/project-icon";
import { MotifScene } from "./Motif";
import { IconScene } from "./IconScene";
import { DiagramScene } from "./Diagram";
import { Background } from "./Scenes";
import { FONT_MONO, FONT_SANS, getTheme, type ShortsTheme } from "./theme";

export type TransitionVariant = "cut" | "fade" | "slide" | "wipe" | "mix";

export interface TransitionSheetProps {
  variant?: TransitionVariant;
  theme?: string | null;
}

/** 한 장면 길이(프레임). 실제 쇼츠 문장 하나가 2–3초다 */
export const SCENE_FRAMES = 75;
const SCENE_COUNT = 6;

/** 전환 길이(프레임) — 변형마다. cut은 0 */
export function transitionFrames(v: TransitionVariant): number {
  return v === "cut" ? 0 : v === "slide" ? 16 : 12;
}

export function sheetFrames(v: TransitionVariant): number {
  return SCENE_COUNT * SCENE_FRAMES - (SCENE_COUNT - 1) * transitionFrames(v);
}

/** vibelog 소개 글이 고른 아이콘 (tabler:notebook) — projects.json과 같은 좌표 */
const NOTEBOOK: ProjectIcon = {
  name: "tabler:notebook",
  paths: [{ d: "M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1m3 0v18m4-14h2m-2 4h2" }],
};

/** 자막 — 실제 쇼츠와 같은 자리·크기. 비교용이라 낱말별 흐림 없이 장면과 같이 나타난다 */
const Caption: React.FC<{ th: ShortsTheme; before: string; key_: string; after: string }> = ({
  th,
  before,
  key_,
  after,
}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        bottom: 190,
        textAlign: "center",
        fontFamily: FONT_SANS,
        fontSize: 52,
        fontWeight: 900,
        lineHeight: 1.3,
        wordBreak: "keep-all",
        textWrap: "balance",
        color: th.ink,
        opacity: o,
      }}
    >
      {before}
      <span style={{ color: th.accent }}>{key_}</span>
      {after}
    </div>
  );
};

/** 생성 그림 장면 — 판 없이 바탕 위에. mix에서는 아래에서 올라오며 모션 블러 */
const ArtScene: React.FC<{ file: string; rich: boolean }> = ({ file, rich }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const img = (y: number, s: number) => (
    <Img
      src={staticFile(file)}
      style={{
        position: "absolute",
        left: "50%",
        top: "46%",
        width: 820,
        height: 820,
        objectFit: "contain",
        transform: `translate(-50%, calc(-50% + ${y}px)) scale(${s})`,
      }}
    />
  );
  if (!rich) {
    const o = interpolate(f, [0, 9], [0, 1], { extrapolateRight: "clamp" });
    return <div style={{ opacity: o }}>{img(0, 1)}</div>;
  }
  const p = spring({ frame: f, fps, config: { damping: 18, stiffness: 120 } });
  // 들어온 뒤에는 아주 천천히 다가온다 — 정지 그림이 2초를 못 버틴다
  const push = interpolate(f, [12, 75], [1, 1.04], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      <CameraMotionBlur shutterAngle={180} samples={8}>
        <AbsoluteFill>{img((1 - p) * 260, push)}</AbsoluteFill>
      </CameraMotionBlur>
    </>
  );
};

const Mark: React.FC<{ th: ShortsTheme; label: string }> = ({ th, label }) => (
  <div
    style={{
      position: "absolute",
      top: 88,
      left: 80,
      fontFamily: FONT_MONO,
      fontSize: 30,
      letterSpacing: ".14em",
      color: th.muted,
    }}
  >
    {label}
  </div>
);

export const TransitionSheet: React.FC<TransitionSheetProps> = ({ variant = "cut", theme }) => {
  const th = getTheme(theme);
  const rich = variant === "mix";
  const label = { cut: "지금 · 끊김", fade: "fade", slide: "slide", wipe: "wipe", mix: "추천 조합" }[variant];
  // 자막은 장면 그림과 따로 간다 — 실제 쇼츠도 자막이 장면 위 한 겹이라, 전환은 그림에만 걸린다.
  // 전환 중에 두 문장 자막이 겹쳐 보이던 것을 막는다
  const caps: [string, string, string][] = [];
  const scene = (body: React.ReactNode, cap: [string, string, string]) => {
    caps.push(cap);
    return (
      <AbsoluteFill>
        <Background th={th} />
        {body}
      </AbsoluteFill>
    );
  };
  const scenes: React.ReactNode[] = [
    scene(<MotifScene name="loop" th={th} fromSec={0} />, ["이제 밤마다 그날의 글이 ", "저절로", " 올라옵니다."]),
    scene(<ArtScene file="sheet/art-review.png" rich={rich} />, ["실제 단지 자료는 ", "사람이 검토한 뒤에만", " 문제로 올립니다."]),
    scene(<IconScene icon={NOTEBOOK} th={th} fromSec={0} />, ["바이브 로그는 ", "커밋이 글이 되는", " 블로그입니다."]),
    scene(
      <DiagramScene
        spec={{ kind: "pipeline", labels: ["커밋", "데브로그", "쇼츠"] }}
        th={th}
        lang="ko"
        fromSec={0}
      />,
      ["그 글은 ", "30초짜리 세로 영상", "까지 됩니다."],
    ),
    scene(<ArtScene file="sheet/art-guard.png" rich={rich} />, ["공개 순위표 전에, ", "점수를 서버에서", " 검사합니다."]),
    scene(<MotifScene name="watch" th={th} fromSec={0} />, ["밤새 ", "끝까지 도는지", " 지켜보겠습니다."]),
  ];
  const T = transitionFrames(variant);
  // 세 전환의 속성 타입이 달라 하나로 묶을 때는 넓힌다
  const presentation = (
    variant === "slide" ? slide({ direction: "from-right" }) : variant === "wipe" ? wipe({ direction: "from-left" }) : fade()
  ) as TransitionPresentation<Record<string, unknown>>;
  const timing = variant === "slide" ? springTiming({ config: { damping: 200 }, durationInFrames: T }) : linearTiming({ durationInFrames: T });
  return (
    <AbsoluteFill style={{ background: th.bg }}>
      <TransitionSeries>
        {scenes.flatMap((s, i) => {
          const seq = (
            <TransitionSeries.Sequence key={`s${i}`} durationInFrames={SCENE_FRAMES}>
              {s}
            </TransitionSeries.Sequence>
          );
          if (i === 0 || T === 0) return [seq];
          return [
            <TransitionSeries.Transition key={`t${i}`} presentation={presentation} timing={timing} />,
            seq,
          ];
        })}
      </TransitionSeries>
      {caps.map((c, i) => {
        // 장면 i는 i × (장면 − 전환)에서 시작한다. 자막은 전환의 한가운데에서 바뀐다
        const start = i * (SCENE_FRAMES - T) + (i === 0 ? 0 : Math.round(T / 2));
        const end = i === caps.length - 1 ? sheetFrames(variant) : (i + 1) * (SCENE_FRAMES - T) + Math.round(T / 2);
        return (
          <Sequence key={`c${i}`} from={start} durationInFrames={end - start}>
            <Caption th={th} before={c[0]} key_={c[1]} after={c[2]} />
          </Sequence>
        );
      })}
      <Mark th={th} label={label} />
    </AbsoluteFill>
  );
};
