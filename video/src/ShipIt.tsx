/**
 * ShipIt — 1080×1920, 30fps. 장면: 훅 카드 → 폰 프레임(데모) → 삽질 카드 → 폰 → 엔드카드.
 * 장면 경계는 timing.json의 문장 시작 시각에서 온다 — 자막·음성·장면이 한 시계를 쓴다.
 */
import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  coldOpenKind,
  type DiagramSpec,
  type ShortsScript,
  type ShortsTiming,
  type TimedSentence,
} from "../../scripts/shorts-types";
import { Captions } from "./Captions";
import { DiagramScene } from "./Diagram";
import {
  ArtCard,
  Background,
  ColdOpen,
  EndCard,
  FailCard,
  HookCard,
  PhoneFrame,
  StatPunch,
} from "./Scenes";
import {
  COLD_OPEN_SEC,
  FONT_MONO,
  getTheme,
  NARRATION_DELAY,
  SCENE_FADE,
  totalSeconds,
} from "./theme";

// Remotion Composition의 props 제약(Record<string, unknown>)을 만족시키기 위해 type으로 선언
export type ShipItProps = {
  script: ShortsScript;
  timing: ShortsTiming;
  lang: "ko" | "en";
  /** video/public/ 밑의 파일명 (예: "demo.webm"). 없으면 플레이스홀더 */
  videoFile: string | null;
  /** 소스 영상에서 로딩 화면을 건너뛰고 재생을 시작할 지점(초) */
  videoStartSec?: number;
  /** +알파 그래픽 — {scene: public/ 밑 파일명} (art.ts 산출물, 없으면 미사용) */
  artFiles?: Record<string, string> | null;
  /** 레포가 고른 테마 이름 (vibelog.json "theme") — 없으면 terminal */
  theme?: string | null;
  /** 화면별 녹화 구간 (readyAt 기준 초) — 문장의 screen과 매칭. 없으면 시간순 */
  segments?: { path: string; start: number; end: number }[] | null;
};

type Kind = "cold" | "hook" | "phone" | "fail" | "end" | "art" | "diagram";

interface Seg {
  kind: Kind;
  from: number;
  to: number;
  /** phone 장면: 소스 영상에서 몇 초 지점부터 재생할지 */
  sourceOffset: number;
  /** 이 블록이 보여줄 화면 경로 (대본 line.screen) — 구간 매칭용 */
  screen?: string;
  /** duo 샷의 보조 폰이 틀 다른 화면의 시작 시각 — 주 화면과 같은
   *  화면이 좌우에 반복되지 않게 (Jessi 지적). 녹화가 한 화면뿐이면 없음 */
  duoAltOffset?: number;
  /** diagram 장면이 그릴 그림 — 대본이 고른 종류와 라벨 */
  diagram?: DiagramSpec;
}

function kindOf(scene: string, hasNextArt: boolean): Kind {
  if (scene === "hook") return "hook";
  if (scene === "fail") return "fail";
  if (scene === "end") return "end";
  // "다음 할 것"은 데모 화면 대신 생성 일러스트 장면으로 — 그래픽이 있을 때만
  if (scene === "next" && hasNextArt) return "art";
  return "phone";
}

/** 이 문장의 stat 카운터가 시작되는 오디오 시각 (없으면 null) */
function statStartOf(
  script: ShortsScript,
  s: TimedSentence,
  lang: "ko" | "en",
): number | null {
  const line = script.lines[s.index];
  if (!line?.stat) return null;
  const stat = (lang === "en" ? (line.statEn ?? line.stat) : line.stat)!;
  // 콤마 표기 대응 — "2,889곳"에서 \d+는 "2"만 잡아 앵커가 흔들린다
  const digits = stat.replace(/,/g, "").match(/\d+/)?.[0];
  const w = digits
    ? s.words.find((x) => x.text.replace(/,/g, "").includes(digits))
    : undefined;
  return w?.start ?? s.start;
}

/** 카운터 인서트 길이 + 숨 고르기 — 엔드카드는 이게 끝난 뒤 들어온다 */
const STAT_PUNCH_SEC = 1.5;
const STAT_BREATH_SEC = 0.2;

export function buildSegments(
  script: ShortsScript,
  timing: ShortsTiming,
  total: number,
  hasNextArt: boolean,
  offset: number,
  coldOpen: number,
  lang: "ko" | "en",
  segMap?: Map<string, { start: number; end: number }>,
): Seg[] {
  const raw: { kind: Kind; from: number; screen?: string; diagram?: DiagramSpec }[] = [];
  // 커밋 콜드오픈 — 내레이션 전 무음 구간을 터미널 장면이 채운다
  if (coldOpen > 0) raw.push({ kind: "cold", from: 0 });
  for (const s of timing.sentences) {
    const line = script.lines[s.index];
    const kind = kindOf(line?.scene ?? "build", hasNextArt);
    let from = s.start + offset;
    // end 문장에 stat이 있으면 카운터가 먼저 박히고, 엔드카드는 그 뒤에
    // 들어온다 — 겹치면 마무리 화면이 어색하다 (Jessi 지시)
    if (kind === "end") {
      const statAt = statStartOf(script, s, lang);
      if (statAt != null) {
        from = Math.max(from, statAt + offset + STAT_PUNCH_SEC + STAT_BREATH_SEC);
      }
    }
    // 다이어그램이 붙은 문장은 화면 녹화 대신 그림이 뜬다 — 원리를 말하는
    // 문장이라 녹화로는 보여줄 게 없다 (Jessi 지시). 그림은 문장마다 달라서
    // 앞 블록과 합치지 않고 항상 제 블록을 갖는다.
    const dia = line?.diagram;
    if (dia) {
      raw.push({ kind: "diagram", from: raw.length === 0 ? 0 : from, diagram: dia });
    } else if (raw.length === 0) {
      raw.push({ kind, from: 0, screen: line?.screen }); // 첫 장면은 0초부터
    } else if (raw[raw.length - 1].kind !== kind || raw[raw.length - 1].diagram) {
      raw.push({ kind, from, screen: line?.screen });
    } else if (!raw[raw.length - 1].screen && line?.screen) {
      // 같은 phone 블록에서 화면 지정이 있는 첫 문장을 대표로 쓴다
      raw[raw.length - 1].screen = line.screen;
    }
  }
  if (raw.length === 0) raw.push({ kind: "end", from: 0 });
  if (raw[raw.length - 1].kind !== "end") {
    raw.push({ kind: "end", from: Math.max(0, total - 3) });
  }
  const segs: Seg[] = [];
  let phoneTime = 0;
  // 같은 화면을 여러 블록이 쓰면 구간 안에서 이어서 재생 — 같은 프레임 반복 방지
  const usedInScreen = new Map<string, number>();
  for (let i = 0; i < raw.length; i++) {
    const to = raw[i + 1]?.from ?? total;
    const seg: Seg = { ...raw[i], to, sourceOffset: phoneTime };
    if (seg.kind === "phone") {
      // 문장이 화면을 지정했고 녹화가 그 구간을 남겼으면 거기서 재생 —
      // 내레이션 내용과 화면이 맞는다. 아니면 기존 시간순 자르기.
      let key = seg.screen;
      let m = key ? segMap?.get(key) : undefined;
      if (!m && segMap?.size) {
        // 화면 미지정 블록: 아직 가장 덜 쓴 녹화 화면을 골라 앞 블록과
        // 같은 화면만 반복되는 것을 피한다 (Jessi: 같은 화면 두 번은 의미 없다)
        for (const [p, cand] of segMap) {
          if (!m || (usedInScreen.get(p) ?? 0) < (usedInScreen.get(key!) ?? 0)) {
            key = p;
            m = cand;
          }
        }
      }
      if (m && key) {
        const used = usedInScreen.get(key) ?? 0;
        // 블록이 녹화 구간보다 길면 시작점을 당겨 구간 밖(다른 화면)으로
        // 넘어가지 않게 한다 — 반복 프레임보다 엉뚱한 화면이 더 나쁘다
        const blockLen = to - seg.from;
        const segLen = m.end - m.start;
        seg.sourceOffset = m.start + Math.min(used, Math.max(0, segLen - blockLen));
        usedInScreen.set(key, used + blockLen);
      }
      // duo 샷의 보조 폰: 주 화면과 '다른' 화면의 구간 시작을 미리 골라 둔다
      // (내레이션 순서상 첫 번째 다른 화면 — 내용 관련 화면이 홈보다 먼저 잡힘)
      if (segMap?.size) {
        for (const [p, cand] of segMap) {
          if (p !== key) {
            seg.duoAltOffset = cand.start;
            break;
          }
        }
      }
      phoneTime += to - seg.from;
    }
    segs.push(seg);
  }
  return segs;
}

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export const ShipIt: React.FC<ShipItProps> = ({
  script,
  timing,
  lang,
  videoFile,
  videoStartSec = 0,
  artFiles = null,
  theme = null,
  segments = null,
}) => {
  const th = getTheme(theme);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cold = coldOpenKind(script); // 템플릿별 콜드오픈 문법 (없으면 null)
  const coldOpen = cold ? COLD_OPEN_SEC : 0;
  const offset = NARRATION_DELAY + coldOpen; // 화면 시간 = 오디오 시간 + offset
  const total = totalSeconds(timing.duration, coldOpen);
  const segMap = new Map(
    (segments ?? []).map((s) => [s.path, { start: s.start, end: s.end }]),
  );
  const segs = buildSegments(
    script, timing, total, Boolean(artFiles?.next), offset, coldOpen, lang, segMap,
  );
  // 데모 샷 로테이션 — day + 장면 순번. 한 편 안에서도, 에피소드 사이에서도
  // 같은 데모 연출이 연속되지 않는다 (Jessi 지시)
  const demoOrdinal = new Map<number, number>();
  segs.forEach((s, i) => {
    if (s.kind === "phone") demoOrdinal.set(i, demoOrdinal.size);
  });
  const shotOf = (i: number) =>
    (["phone", "band", "duo"] as const)[
      (Math.max(0, script.day - 1) + (demoOrdinal.get(i) ?? 0)) % 3
    ];

  // 순차 페이드 — 나가는 장면은 경계 전에 다 사라지고, 들어오는 장면은
  // 경계부터 뜬다. 크로스페이드는 레이아웃이 다른 장면끼리 애매하게
  // 겹쳐 보였다 (Jessi 지적).
  const opacityOf = (seg: Seg): number => {
    const fadeIn =
      seg.from === 0
        ? 1
        : interpolate(t, [seg.from, seg.from + SCENE_FADE], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
    const fadeOut =
      seg.to >= total
        ? 1
        : interpolate(t, [seg.to - SCENE_FADE, seg.to], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
    return fadeIn * fadeOut;
  };

  return (
    <AbsoluteFill style={{ background: th.bg }}>
      <Background th={th} />

      {segs.map((seg, i) => {
        const opacity = opacityOf(seg);
        if (opacity <= 0) return null;
        // 장면 입장 라이즈 — 페이드에 20px 상승을 더해 컷마다 방향감을 준다.
        // 폰 프레임은 자체 카메라워크(틸트·줌)가 있어 제외.
        const rise =
          seg.from > 0 && seg.kind !== "phone"
            ? interpolate(t, [seg.from, seg.from + SCENE_FADE + 0.1], [20, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.cubic),
              })
            : 0;
        return (
          <AbsoluteFill
            key={i}
            style={{ opacity, transform: `translateY(${rise}px)` }}
          >
            {seg.kind === "cold" && cold && (
              <ColdOpen
                variant={cold}
                // 영문 영상엔 번역된 커밋 메시지 (없으면 ko 폴백 — 구버전 대본)
                commits={
                  lang === "en" && script.commitsEn?.length
                    ? script.commitsEn
                    : script.commits
                }
                commitCount={script.commitCount ?? script.commits?.length ?? 0}
                day={script.day}
                before={
                  lang === "ko"
                    ? script.failCard?.before
                    : (script.failCard?.beforeEn ?? script.failCard?.before)
                }
                after={
                  lang === "ko"
                    ? script.failCard?.after
                    : (script.failCard?.afterEn ?? script.failCard?.after)
                }
                th={th}
              />
            )}
            {seg.kind === "hook" && (
              <HookCard
                script={script}
                lang={lang}
                timing={timing}
                th={th}
                offsetSec={offset}
              />
            )}
            {seg.kind === "diagram" && seg.diagram && (
              <DiagramScene
                spec={seg.diagram}
                th={th}
                lang={lang}
                fromSec={seg.from}
              />
            )}
            {seg.kind === "art" && artFiles?.next && (
              <ArtCard file={artFiles.next} th={th} />
            )}
            {seg.kind === "phone" && (
              <PhoneFrame
                videoFile={videoFile}
                sourceOffsetSec={videoStartSec + seg.sourceOffset}
                fromFrame={Math.floor(seg.from * fps)}
                durationInFrames={Math.ceil((seg.to - seg.from + SCENE_FADE) * fps)}
                th={th}
                fromSec={seg.from}
                toSec={seg.to}
                segIndex={i}
                shot={shotOf(i)}
                duoAltOffsetSec={
                  seg.duoAltOffset != null
                    ? videoStartSec + seg.duoAltOffset
                    : undefined
                }
              />
            )}
            {seg.kind === "fail" && (
              <FailCard
                script={script}
                lang={lang}
                sceneStartSec={seg.from}
                sceneEndSec={seg.to}
                th={th}
                split={script.template === "before-after"}
              />
            )}
            {seg.kind === "end" && (
              <EndCard script={script} th={th} sceneStartSec={seg.from} />
            )}
          </AbsoluteFill>
        );
      })}

      {/* eyebrow */}
      <div
        style={{
          position: "absolute",
          top: 88,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: FONT_MONO,
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: th.muted,
          textTransform: "uppercase",
        }}
      >
        <span>
          <span style={{ color: th.accent }}>vibelog</span> · day{" "}
          {String(script.day).padStart(2, "0")}
        </span>
        <span
          style={{
            border: `2px solid ${th.badgeFill ? th.accent : th.line}`,
            borderRadius: th.badgeRadius,
            padding: "10px 24px",
            color: th.badgeFill ? th.accentInk : th.ink,
            background: th.badgeFill ? th.accent : "transparent",
            fontWeight: 700,
          }}
        >
          {script.template.replace("-", " ")}
        </span>
      </div>

      {/* 숫자 모먼트 — 내레이션이 stat을 말하는 순간의 카운터 인서트.
          hook 장면에는 안 띄운다(헤드라인과 겹침). end 문장의 stat은
          카운터가 먼저 나오고 엔드카드가 그 뒤에 들어온다 (buildSegments).
          다이어그램이 붙은 문장에도 안 띄운다 — 그림이 이미 화면 가운데를
          쓰고 있어 카운터가 그 위에 겹쳐 찍힌다. 집합 다이어그램은 겹친
          값을 제 안에 크게 적기까지 해서 숫자가 두 번 나왔다 ("7"과 "개"가
          겹쳐 에러처럼 보임 — Jessi 지적). 숫자는 그림이 말하게 둔다. */}
      {script.lines.map((l, i) => {
        if (!l.stat || l.scene === "hook" || l.diagram) return null;
        const sent = timing.sentences.find((x) => x.index === i);
        if (!sent) return null;
        const statAt = statStartOf(script, sent, lang);
        if (statAt == null) return null;
        return (
          <StatPunch
            key={`stat-${i}`}
            stat={lang === "en" ? (l.statEn ?? l.stat) : l.stat}
            startSec={statAt + offset}
            th={th}
          />
        );
      })}

      <Captions
        script={script}
        timing={timing}
        lang={lang}
        th={th}
        offsetSec={offset}
      />

      {/* progress */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 110,
          height: 8,
          background: th.light ? th.panel2 : th.line,
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(100, (t / total) * 100)}%`,
            background: th.accent,
          }}
        />
      </div>

      {/* footer — 워터마크 없음, 카피라이트 한 줄 (스펙) */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 44,
          display: "flex",
          justifyContent: "space-between",
          fontFamily: FONT_MONO,
          fontSize: 24,
          color: th.muted,
          letterSpacing: "0.06em",
        }}
      >
        <span>© {new Date(script.date).getFullYear()} vibelog · Jessi</span>
        <span>
          {fmt(t)} / {fmt(total)}
        </span>
      </div>
    </AbsoluteFill>
  );
};
