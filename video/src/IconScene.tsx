/**
 * 대상 아이콘 장면 — 화면도 그림도 없는 문장이 말하는 "무엇"을 Tabler 선 아이콘 하나로
 * (docs/shorts-icons.html A안). 머리글의 프로젝트 아이콘과 같은 세트·같은 강조색이다.
 *
 * 크기에 주의한다 — 작은 아이콘을 화면 가득 키우면 선만 굵어지고 무엇인지 오히려 안
 * 읽힌다 (10/11). 그래서 아이콘은 220px로 두고, 그 둘레에 테마의 판(panel)을 깔아
 * 하나의 물건으로 읽히게 한다. 선은 그려지듯 나타난다 — 모티프와 같은 결이고, 감출 때
 * dasharray는 "1 2", 시작 offset은 1.06이다 (1이면 선 끝에 점이 미리 찍힌다, Motif.tsx 참고).
 */
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { ProjectIcon } from "../../lib/project-icon";
import type { ShortsTheme } from "./theme";

const CY = 1020;
const TILE = 420;
const ICON = 220;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

export const IconScene: React.FC<{
  icon: ProjectIcon;
  th: ShortsTheme;
  /** 장면이 시작되는 영상 시각(초) */
  fromSec: number;
}> = ({ icon, th, fromSec }) => {
  const { fps } = useVideoConfig();
  const t = useCurrentFrame() / fps - fromSec;
  const inP = easeOut(clamp01(t / 0.35));
  const draw = easeOut(clamp01((t - 0.15) / 0.9));
  const fill = clamp01((t - 0.9) / 0.3);
  return (
    <div
      style={{
        position: "absolute",
        left: (1080 - TILE) / 2,
        top: CY - TILE / 2,
        width: TILE,
        height: TILE,
        display: "grid",
        placeItems: "center",
        background: th.panel,
        border: `4px solid ${th.line}`,
        borderRadius: th.radius,
        opacity: inP,
        transform: `translateY(${(1 - inP) * 24}px)`,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width={ICON}
        height={ICON}
        fill="none"
        stroke={th.accent}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {icon.paths.map((p, i) =>
          p.filled ? (
            <path key={i} d={p.d} fill={th.accent} stroke="none" opacity={fill} />
          ) : (
            <path
              key={i}
              d={p.d}
              pathLength={1}
              strokeDasharray="1 2"
              strokeDashoffset={1.06 - 1.06 * draw}
              opacity={draw > 0 ? 1 : 0}
            />
          ),
        )}
      </svg>
    </div>
  );
};

/** 다이어그램 칸 안에 얹는 작은 아이콘 — 라벨 앞에 둔다 */
export const BoxIcon: React.FC<{ icon?: ProjectIcon | null; color: string; size?: number }> = ({
  icon,
  color,
  size = 44,
}) =>
  icon ? (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: "none", marginRight: 14 }}
    >
      {icon.paths.map((p, i) => (
        <path key={i} d={p.d} {...(p.filled ? { fill: color } : {})} />
      ))}
    </svg>
  ) : null;
