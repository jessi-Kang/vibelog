import React from "react";
import { Composition } from "remotion";
import { coldOpenKind } from "../../scripts/shorts-types";
import { ShipIt, type ShipItProps } from "./ShipIt";
import { COLD_OPEN_SEC, totalSeconds } from "./theme";
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
  );
};
