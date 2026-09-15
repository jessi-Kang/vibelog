/**
 * DiagramSheet — **검수용** 컴포지션. 발행 파이프라인은 쓰지 않는다.
 *
 * 다이어그램 다섯 종을 실제 영상 규격(1080×1920)·실제 테마 토큰으로 하나씩
 * 돌린다. MotifSheet과 같은 이유로 있다: 다이어그램을 고친 뒤 확인하려면
 * 그때까지는 밤 회차가 그 종류를 뽑아 주기를 기다려야 했다. 흐리기·대비처럼
 * 테마마다 다르게 나오는 것은 **그 테마로 돌려 봐야** 안다 — beforeafter의
 * '전' 줄이 paper에서만 사실상 안 보였던 것이 그랬다.
 *
 * 렌더: cd video && npx remotion render DiagramSheet <나갈 파일>.mp4 \
 *         --props='{"theme":"paper"}' --ignore-certificate-errors
 */
import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import {
  DIAGRAM_LABELS,
  type DiagramKind,
  type DiagramSpec,
} from "../../scripts/shorts-types";
import { DiagramScene } from "./Diagram";
import { FONT_MONO, FONT_SANS, getTheme } from "./theme";

/** 한 칸에 머무는 시간(초). 다이어그램 한 편(2.2초) + 읽을 틈 */
export const DIAGRAM_SLOT_SEC = 3.4;

/** 종류별 검수용 예시 — 라벨 수는 DIAGRAM_LABELS를 지킨다 */
const SAMPLES: { spec: DiagramSpec; said: string }[] = [
  {
    spec: {
      kind: "numberline",
      labels: ["하루 허용 범위", "20건", "계속 통과"],
    },
    said: "제한을 재려고 스무 번 넣었는데 전부 통과였습니다.",
  },
  {
    spec: {
      kind: "fork",
      labels: ["그림 목록", "첫 요청만 고침", "두 요청 다 고침"],
      pick: 2,
    },
    said: "한쪽 요청만 고치고 다른 쪽은 그대로 뒀습니다.",
  },
  {
    spec: {
      kind: "beforeafter",
      labels: [
        "숫자 붙은 이름",
        "세어지지 않음",
        "제대로 된 이름",
        "20건째 막힘",
      ],
    },
    said: "숫자가 붙은 이름은 세어지지도 않았습니다.",
  },
  {
    spec: {
      kind: "sets",
      labels: ["내 레포 전체", "topic vibelog", "2개"],
    },
    said: "표시를 달아 둔 레포만 골라 읽습니다.",
  },
  {
    spec: {
      kind: "pipeline",
      labels: ["이름을 짓고", "검수를 거쳐", "퀴즈 문제로"],
    },
    said: "지은 이름은 검수를 거쳐 남의 퀴즈로 나갑니다.",
  },
];

export interface DiagramSheetProps {
  theme?: string | null;
  lang?: "ko" | "en";
}

/** Root의 durationInFrames 계산이 참조한다 */
export const DIAGRAM_SHEET_SLOTS = SAMPLES.length;

export const DiagramSheet: React.FC<DiagramSheetProps> = ({ theme, lang }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const slot = Math.round(DIAGRAM_SLOT_SEC * fps);
  return (
    <AbsoluteFill style={{ background: th.bg }}>
      {SAMPLES.map(({ spec, said }, i) => {
        const kind = spec.kind as DiagramKind;
        const [lo, hi] = DIAGRAM_LABELS[kind];
        return (
          <Sequence key={kind} from={i * slot} durationInFrames={slot}>
            <AbsoluteFill>
              <div
                style={{
                  position: "absolute",
                  top: 88,
                  left: 80,
                  fontFamily: FONT_MONO,
                  fontSize: 30,
                  letterSpacing: ".14em",
                  color: th.accent,
                }}
              >
                {String(i + 1).padStart(2, "0")} · {kind} · 라벨 {lo}–{hi}
              </div>
              <DiagramScene
                spec={spec}
                th={th}
                lang={lang ?? "ko"}
                fromSec={0}
              />
              <div
                style={
                  {
                    position: "absolute",
                    left: 80,
                    right: 80,
                    bottom: 220,
                    fontFamily: FONT_SANS,
                    fontSize: 36,
                    lineHeight: 1.45,
                    color: th.muted,
                    wordBreak: "keep-all",
                    textWrap: "balance",
                  } as React.CSSProperties
                }
              >
                {said}
              </div>
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
