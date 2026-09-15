import React from "react";
import { Composition } from "remotion";
import { coldOpenKind } from "../../scripts/shorts-types";
import {
  DiagramSheet,
  type DiagramSheetProps,
  DIAGRAM_SHEET_SLOTS,
  DIAGRAM_SLOT_SEC,
} from "./DiagramSheet";
import { MotifSheet, type MotifSheetProps, SHEET_SLOT_SEC } from "./MotifSheet";
import { ShipIt, type ShipItProps } from "./ShipIt";
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
    </>
  );
};
