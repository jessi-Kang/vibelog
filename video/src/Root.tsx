import React from "react";
import { Composition } from "remotion";
import { coldOpenKind } from "../../scripts/shorts-types";
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
    {/* 검수용 — 모티프 열여섯을 실제 규격으로 돌려 본다. 발행에는 안 쓴다 */}
    <Composition
      id="MotifSheet"
      component={MotifSheet}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={Math.ceil(MOTIFS.length * SHEET_SLOT_SEC * FPS)}
      defaultProps={{ theme: "terminal" } as MotifSheetProps}
    />
    </>
  );
};
