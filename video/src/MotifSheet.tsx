/**
 * MotifSheet — **검수용** 컴포지션. 발행 파이프라인은 쓰지 않는다.
 *
 * 모티프 열여섯을 실제 영상 규격(1080×1920)·실제 테마 토큰으로 하나씩 돌린다.
 * 브라우저 시안(CSS 키프레임)과 렌더(프레임 단위)는 그리는 방식이 다르므로,
 * 승인받은 박자가 렌더에서도 같은지 여기서 눈으로 확인한다.
 *
 * 렌더: cd video && npx remotion render MotifSheet <나갈 파일>.mp4 --props='{"theme":"terminal"}'
 */
import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import {
  MOTIF_GLOSS,
  MOTIFS,
  type MotifName,
} from "../../scripts/shorts-types";
import { MotifScene } from "./Motif";
import { FONT_MONO, FONT_SANS, getTheme } from "./theme";

/** 한 칸에 머무는 시간(초). 한 편(2.2초) + 읽을 틈 */
export const SHEET_SLOT_SEC = 2.8;

/** 근거가 된 실제 문장 — 어느 문장에 걸리는 모양인지 같이 본다.
 *  모양 설명(한 줄)은 shorts-types의 MOTIF_GLOSS가 단일 진실이다 */
const SAID: Record<MotifName, string> = {
  loop: "이제 밤마다 그날의 글이 저절로 올라옵니다.",
  watch: "밤새 끝까지 도는지 지켜보겠습니다.",
  gate: "실제 단지 자료는 사람이 검토한 뒤에만 문제로 올립니다.",
  stack: "낮에는 블로그 화면 3개를 만들어 뒀습니다.",
  refine: "숫자 읽는 방식도 계속 다듬겠습니다.",
  merge: "주소를 하나로 합쳤더니 바로 풀렸습니다.",
  fanin: "방문자가 늘어도 요청은 한 번입니다.",
  limit: "1시간에 60번만 답해 주는 한도에 걸렸습니다.",
  tile: "이제 음악을 필요한 만큼 반복해 이어 붙입니다.",
  cut: "소리와 화면 중 짧은 쪽에 맞춰 잘리고 있었습니다.",
  missing: "처음엔 글자 없는 동그라미만 번졌습니다.",
  oneline: "그 한 줄 때문에 파일 전체가 무시됐습니다.",
  fallback: "그래서 어젯밤 값으로 조용히 돌아갔습니다.",
  late: "방금 만든 프로젝트는 검색에 늦게 뜹니다.",
  tag: "표시만 달아 두면 30분 안에 올라옵니다.",
  scan: "이제 제 프로젝트 목록을 직접 훑습니다.",
  leak: "로그인 없이 기록을 지우면 아직 답이 샙니다.",
  stale: "먼저 설치한 앱은 옛 주소를 붙잡고 있었습니다.",
  convert: "그 글은 30초짜리 세로 영상까지 됩니다.",
  remove: "그 줄을 지우고 확인 방식을 바꿨습니다.",
  earlyout: "이름 차이를 세는 계산은 확실히 다르면 일찍 멈춥니다.",
  fanout: "페이지마다 붙는 안전 설정 5개도 넣었습니다.",
};

export interface MotifSheetProps {
  theme?: string | null;
}

export const MotifSheet: React.FC<MotifSheetProps> = ({ theme }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const slot = Math.round(SHEET_SLOT_SEC * fps);
  return (
    <AbsoluteFill style={{ background: th.bg }}>
      {MOTIFS.map((name, i) => {
        const what = MOTIF_GLOSS[name];
        const said = SAID[name];
        return (
          <Sequence key={name} from={i * slot} durationInFrames={slot}>
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
                {String(i + 1).padStart(2, "0")} · {name}
              </div>
              <MotifScene name={name} th={th} fromSec={0} />
              <div
                style={{
                  position: "absolute",
                  left: 80,
                  right: 80,
                  bottom: 260,
                  fontFamily: FONT_SANS,
                  wordBreak: "keep-all",
                  textWrap: "balance",
                } as React.CSSProperties}
              >
                <div style={{ fontSize: 56, fontWeight: 700, color: th.ink }}>
                  {what}
                </div>
                <div
                  style={{
                    marginTop: 18,
                    fontSize: 36,
                    lineHeight: 1.45,
                    color: th.muted,
                  }}
                >
                  {said}
                </div>
              </div>
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
