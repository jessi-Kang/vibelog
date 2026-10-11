/**
 * RemocnSheet — **검수용** 컴포지션. 발행 파이프라인은 쓰지 않는다.
 *
 * remocn(MIT, src/remocn/) 효과를 몇 가지 섞어 쇼츠 한 편처럼 이어 본 시안 (10/11).
 *   콜드오픈  terminal-simulator — 오늘의 실제 커밋이 터미널에 찍힌다
 *   훅        soft-blur-in — 글자가 흐림에서 또렷하게 한 자씩
 *   숫자      rolling-number — 자릿수마다 다른 속도로 굴러가는 계수기
 *   그림      drift(아주 느린 다가감) + marker-highlight 자막(강조어에 형광펜)
 *   모티프    기존 MotifScene + marker-highlight 자막
 *   전환      caret-wipe(타자 커서가 화면을 쓸며 바뀜) ↔ fade
 * 그림은 video/public/sheet/에 둔다 (커밋하지 않는다 — art-try 워크플로의 시안 그림).
 * 렌더: cd video && npx remotion render RemocnSheet out.mp4
 */
import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Background } from "./Scenes";
import { MotifScene } from "./Motif";
import { FONT_MONO, getTheme, type ShortsTheme } from "./theme";
import { TerminalSimulator } from "./remocn/terminal-simulator";
import { caretWipe } from "./remocn/caret-wipe";
import { SoftBlurIn } from "./remocn/soft-blur-in";
import { RollingNumber } from "./remocn/rolling-number";
import { Drift } from "./remocn/drift";
import { MarkerHighlight } from "./remocn/marker-highlight";

export interface RemocnSheetProps {
  theme?: string | null;
}

const T = 14;
const LEN = [110, 90, 80, 95, 85, 85];
export const REMOCN_SHEET_FRAMES = LEN.reduce((a, b) => a + b, 0) - (LEN.length - 1) * T;

/** 실제 쇼츠 자막 자리(아래 190px)에 형광펜 자막 */
const Cap: React.FC<{ th: ShortsTheme; a: string; k: string; b: string }> = ({ th, a, k, b }) => (
  <MarkerHighlight
    before={a}
    highlight={k}
    after={b}
    markerColor={th.accent}
    baseColor={th.ink}
    highlightedTextColor={th.accentInk}
    fontSize={52}
    fontWeight={900}
    delay={10}
    containerStyle={{ inset: "auto 70px 190px 70px", alignItems: "flex-end", lineHeight: 1.42 }}
  />
);

const Art: React.FC<{ file: string }> = ({ file }) => (
  <Drift grow={0.05}>
    <Img
      src={staticFile(file)}
      style={{
        position: "absolute",
        left: "50%",
        top: "46%",
        width: 820,
        height: 820,
        objectFit: "contain",
        transform: "translate(-50%, -50%)",
      }}
    />
  </Drift>
);

export const RemocnSheet: React.FC<RemocnSheetProps> = ({ theme }) => {
  const th = getTheme(theme);
  const wrap = (body: React.ReactNode) => (
    <AbsoluteFill>
      <Background th={th} />
      {body}
    </AbsoluteFill>
  );
  const scenes: React.ReactNode[] = [
    wrap(
      <TerminalSimulator
        title="~/vibelog"
        background={th.panel}
        chromeColor={th.panel2}
        fontSize={30}
        windowWidth={960}
        windowHeight={640}
        charsPerFrame={3}
        colors={{ command: th.ink, log: th.muted, success: th.accent, error: th.warn }}
        lines={[
          { text: "git log --oneline -4", type: "command", delay: 0 },
          { text: "a0d32b8 feat: 그림을 둥근 평면 한 색으로", type: "success", delay: 8 },
          { text: "a9b8859 feat: 둥근 평면 그림체 시안", type: "success", delay: 3 },
          { text: "8cec823 fix: 다른 색과 빛 효과를 막는다", type: "error", delay: 3 },
          { text: "b849b15 feat: 장면 전환 비교 영상", type: "success", delay: 3 },
        ]}
      />,
    ),
    wrap(
      <>
        {/* 두 줄은 각자 높이를 가진 칸에 놓는다 — SoftBlurIn은 부모를 가득 채워 가운데에 놓는다 */}
        <div style={{ position: "absolute", top: 700, left: 0, right: 0, textAlign: "center", fontFamily: FONT_MONO, fontSize: 30, letterSpacing: ".14em", color: th.muted }}>
          DAY 31 · VIBELOG
        </div>
        <div style={{ position: "absolute", top: 770, left: 60, right: 60, height: 130 }}>
          <SoftBlurIn text="그림 스타일을" fontSize={96} fontWeight={900} color={th.ink} />
        </div>
        <div style={{ position: "absolute", top: 900, left: 60, right: 60, height: 130 }}>
          <SoftBlurIn text="세 번 바꿨습니다" fontSize={96} fontWeight={900} color={th.accent} speed={0.8} />
        </div>
      </>,
    ),
    wrap(
      <>
        <AbsoluteFill style={{ top: -180 }}>
          <RollingNumber from={0} to={50} fontSize={300} color={th.accent} />
        </AbsoluteFill>
      </>,
    ),
    wrap(
      <>
        <Art file="sheet/flat-review.png" />
      </>,
    ),
    wrap(
      <>
        <MotifScene name="refine" th={th} fromSec={0} />
      </>,
    ),
    wrap(
      <>
        <Art file="sheet/flat-guard.png" />
      </>,
    ),
  ];
  // 자막은 장면 그림과 따로 간다 — 같이 전환하면 두 문장 자막이 겹쳐 보였다. 전환의 한가운데에서 바뀐다
  const CAPS: Record<number, [string, string, string]> = {
    2: ["오늘 그려 본 ", "그림 시안", "입니다."],
    3: ["결국 고른 건 ", "강조색 하나짜리", " 둥근 그림입니다."],
    4: ["밝은 테마는 회색을 ", "한 단계 진하게", " 다듬었습니다."],
    5: ["다음은 실제 쇼츠에 ", "그림을 켜는", " 일입니다."],
  };
  const startOf = (i: number) => LEN.slice(0, i).reduce((a, b) => a + b, 0) - i * T;
  // 터미널·숫자에서 넘어갈 때는 타자 커서가 화면을 쓸고, 그림 사이는 조용히 겹친다
  const caret = caretWipe({ caretColor: th.accent, caretWidth: 6, caretHeight: 0.42 });
  const pres = [caret, fade(), caret, fade(), fade()];
  return (
    <AbsoluteFill style={{ background: th.bg }}>
      <TransitionSeries>
        {scenes.flatMap((s, i) => {
          const seq = (
            <TransitionSeries.Sequence key={`s${i}`} durationInFrames={LEN[i]}>
              {s}
            </TransitionSeries.Sequence>
          );
          return i === 0
            ? [seq]
            : [
                <TransitionSeries.Transition
                  key={`t${i}`}
                  // 두 전환의 속성 타입이 달라 하나로 넓힌다
                  presentation={pres[i - 1] as ReturnType<typeof fade>}
                  timing={linearTiming({ durationInFrames: T })}
                />,
                seq,
              ];
        })}
      </TransitionSeries>
      {Object.entries(CAPS).map(([k, c]) => {
        const i = Number(k);
        const from = startOf(i) + Math.round(T / 2);
        const to = i === LEN.length - 1 ? REMOCN_SHEET_FRAMES : startOf(i + 1) + Math.round(T / 2);
        return (
          <Sequence key={`c${i}`} from={from} durationInFrames={to - from}>
            <Cap th={th} a={c[0]} k={c[1]} b={c[2]} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
