import React from "react";
import { Composition } from "remotion";
import { coldOpenKind } from "../../scripts/shorts-types";
import {
  DiagramSheet,
  type DiagramSheetProps,
  DIAGRAM_SHEET_SLOTS,
  DIAGRAM_SLOT_SEC,
} from "./DiagramSheet";
import { MotifIconTry, MotifSheet, type MotifSheetProps, SHEET_SLOT_SEC } from "./MotifSheet";
import { CaptionSheet } from "./CaptionSheet";
import { RemocnSheet, type RemocnSheetProps, REMOCN_SHEET_FRAMES } from "./RemocnSheet";
import { ShipIt, type ShipItProps } from "./ShipIt";
import {
  TransitionSheet,
  type TransitionSheetProps,
  sheetFrames,
} from "./TransitionSheet";
import { COLD_OPEN_SEC, totalSeconds } from "./theme";
import { MOTIFS } from "../../scripts/shorts-types";
import sampleScript from "../fixtures/sample.json";
import sampleTiming from "../fixtures/sample.ko.timing.json";

const FPS = 30;

export const RemotionRoot: React.FC = () => {
  const defaults: ShipItProps = {
    script: sampleScript as ShipItProps["script"],
    timing: sampleTiming as ShipItProps["timing"],
    lang: "ko",
    videoFile: null,
  };
  return (
    <>
    <Composition
      id="ShipIt"
      component={ShipIt}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={Math.ceil(totalSeconds(defaults.timing.duration) * FPS)}
      defaultProps={defaults}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.ceil(
          totalSeconds(
            props.timing.duration,
            coldOpenKind(props.script) ? COLD_OPEN_SEC : 0,
          ) * FPS,
        ),
      })}
    />
    {/* 검수용 — 어휘 전체를 실제 규격으로 돌려 본다. 발행에는 안 쓴다.
        개수를 문장에 적어 두면 어휘가 늘 때마다 갈라지므로 MOTIFS에서 센다 */}
    <Composition
      id="MotifSheet"
      component={MotifSheet}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={Math.ceil(MOTIFS.length * SHEET_SLOT_SEC * FPS)}
      defaultProps={{ theme: "terminal" } as MotifSheetProps}
    />
    {/* 검수용 — 모티프 + 아이콘 시안 */}
    <Composition
      id="MotifIconTry"
      component={MotifIconTry}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={90}
      defaultProps={{ name: "loop", icon: { name: "tabler:code", paths: [{ d: "m7 8l-4 4l4 4m10-8l4 4l-4 4M14 4l-4 16" }] }, mode: "focus", theme: "terminal" }}
    />
    {/* 검수용 — 다이어그램 다섯 종. 테마마다 다르게 나오는 흐리기·대비를
        그 테마로 돌려 본다 (paper에서만 '전' 줄이 안 보였던 자리) */}
    <Composition
      id="DiagramSheet"
      component={DiagramSheet}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={Math.ceil(DIAGRAM_SHEET_SLOTS * DIAGRAM_SLOT_SEC * FPS)}
      defaultProps={{ theme: "paper", lang: "ko" } as DiagramSheetProps}
    />
    {/* 검수용 — 장면 전환 비교 (cut·fade·slide·wipe·mix). 길이는 전환만큼 겹쳐 변형마다 다르다 */}
    <Composition
      id="TransitionSheet"
      component={TransitionSheet}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={sheetFrames("cut")}
      defaultProps={{ variant: "cut", theme: "terminal" } as TransitionSheetProps}
      calculateMetadata={({ props }) => ({
        durationInFrames: sheetFrames((props as TransitionSheetProps).variant ?? "cut"),
      })}
    />
    {/* 검수용 — remocn 효과를 섞은 쇼츠 시안 */}
    <Composition
      id="RemocnSheet"
      component={RemocnSheet}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={REMOCN_SHEET_FRAMES}
      defaultProps={{ theme: "terminal" } as RemocnSheetProps}
    />
    {/* 검수용 — 자막 표시 방식 시안. 실제 대본·타이밍을 props로 넘긴다 */}
    <Composition
      id="CaptionSheet"
      component={CaptionSheet as unknown as React.FC<Record<string, unknown>>}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={14 * FPS}
      defaultProps={{ ...defaults, style: "now" } as unknown as Record<string, unknown>}
    />
    </>
  );
};
