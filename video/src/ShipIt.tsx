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
  segments?:
    | {
        path: string;
        find?: string;
        start: number;
        end: number;
        /** 가리킨 요소의 세로 위치(0~1) — band 크롭이 이걸 기준으로 잡는다 */
        focusY?: number;
        /** 그림 한 장짜리 화면의 가로세로비 — 폰이 아니라 카드로 보여 준다 */
        aspect?: number;
      }[]
    | null;
};

type Kind =
  | "cold"
  | "hook"
  | "phone"
  | "fail"
  | "end"
  | "art"
  | "diagram"
  | "plain";

interface Seg {
  kind: Kind;
  from: number;
  to: number;
  /** phone 장면: 소스 영상에서 몇 초 지점부터 재생할지 */
  sourceOffset: number;
  /** 이 블록이 보여줄 화면 경로 (대본 line.screen) — 구간 매칭용 */
  screen?: string;
  /** 그 화면에서 가리킨 글자 (대본 line.find) — 정류장 매칭용 */
  find?: string;
  /** 이 블록의 연출 — 대본이 문장에서 고른 것 (없으면 find 유무로 유추) */
  shot?: "whole" | "focus" | "compare";
  /** 가리킨 요소가 녹화 화면에서 세로로 어디였는지 (0~1). band 크롭은
   *  가운데 띠만 보이므로 이 지점을 크롭의 기준으로 잡는다 — 안 그러면
   *  제대로 표시한 요소가 영상에서 잘린다 (Jessi: "스탬프를 제대로
   *  표시했는데 영상에서 보여줄 때 짤렸잖아") */
  focusY?: number;
  /** 그림 한 장짜리 화면(링크 미리보기 카드 등)의 가로세로비. 있으면 폰 프레임이
   *  아니라 그 비율의 카드로 보여 준다 — 가로로 긴 그림을 세로 폰에 cover로
   *  넣으면 억지로 늘어나고 잘린다 */
  aspect?: number;
  /** duo 샷의 보조 폰이 틀 다른 화면의 시작 시각 — 주 화면과 같은
   *  화면이 좌우에 반복되지 않게 (Jessi 지적). 녹화가 한 화면뿐이면 없음 */
  duoAltOffset?: number;
  /** diagram 장면이 그릴 그림 — 대본이 고른 종류와 라벨 */
  diagram?: DiagramSpec;
}

/** 이 문장이 가리킨 글자 (en은 findEn 우선) */
function findOf(
  line: { find?: string; findEn?: string } | undefined,
  lang: "ko" | "en",
): string | undefined {
  if (!line) return undefined;
  return (lang === "en" ? line.findEn || line.find : line.find) || undefined;
}

/**
 * hasScreen은 "이 문장이 볼 것을 골랐는가"다 — **screen과 find 둘 중 하나면
 * 참이다.** 경로(screen)는 힌트일 뿐이고 녹화기는 find만으로도 사이트를 돌며
 * 그 화면을 찾아낸다(scripts/record.ts). screen만 봤을 때는, find만 있는
 * 문장이 카드로 떨어져 정작 찾아 놓은 화면을 버렸다.
 */
function kindOf(scene: string, hasNextArt: boolean, hasScreen = false): Kind {
  if (scene === "hook") return "hook";
  // 삽질 문장도 화면을 지정했으면 폰을 보여준다. 카드·다이어그램만 띄우던
  // 탓에 "스탬프 이야기를 하는데 스탬프 화면이 하나도 안 나오는" 편이
  // 구조적으로 보장돼 있었다 (Jessi: 치명적인 문제). 화면을 안 고른 삽질
  // 문장은 그대로 카드다 — 원인 설명은 카드가 낫다.
  if (scene === "fail") return hasScreen ? "phone" : "fail";
  if (scene === "end") return "end";
  // "다음 할 것"은 데모 화면 대신 생성 일러스트 장면으로 — 그래픽이 있을 때만
  if (scene === "next" && hasNextArt) return "art";
  // 그래픽이 보류인 동안 next가 폰으로 떨어져, 아무 화면이나 붙어 돌았다
  // ("꼭 마지막엔 이 화면을 쓰기로 한 거야?" — Jessi). 대본이 화면을 고르지
  // 않았으면 화면을 쓰지 않는다.
  //
  // plain은 **마지막 수단**이다 — 자막만 뜬 빈 화면이 된다 (Jessi 지적).
  // 채울 것은 내용에서 나와야 하므로(콜드오픈 모양을 그대로 재사용하는 것은
  // 짜맞추기다) 대본이 그런 문장에 diagram을 붙이게 한다 — 그럼 이 분기까지
  // 오지 않는다. 그래도 비면 배경과 자막만 (엉뚱한 화면보다는 낫다).
  if (scene === "next" && !hasScreen) return "plain";
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
  segMap?: Map<
    string,
    {
      start: number;
      end: number;
      focusY?: number;
      aspect?: number;
    }
  >,
): Seg[] {
  const raw: {
    kind: Kind;
    from: number;
    screen?: string;
    find?: string;
    shot?: "whole" | "focus" | "compare";
    diagram?: DiagramSpec;
  }[] = [];
  // 커밋 콜드오픈 — 내레이션 전 무음 구간을 터미널 장면이 채운다
  if (coldOpen > 0) raw.push({ kind: "cold", from: 0 });
  for (const s of timing.sentences) {
    const line = script.lines[s.index];
    const kind = kindOf(
      line?.scene ?? "build",
      hasNextArt,
      !!(line?.screen || findOf(line, lang)),
    );
    let from = s.start + offset;
    // end 문장에 stat이 있으면 카운터가 먼저 박히고, 엔드카드는 그 뒤에
    // 들어온다 — 겹치면 마무리 화면이 어색하다 (Jessi 지시)
    if (kind === "end") {
      const statAt = statStartOf(script, s, lang);
      if (statAt != null) {
        from = Math.max(
          from,
          statAt + offset + STAT_PUNCH_SEC + STAT_BREATH_SEC,
        );
      }
    }
    // 다이어그램이 붙은 문장은 화면 녹화 대신 그림이 뜬다 — 원리를 말하는
    // 문장이라 녹화로는 보여줄 게 없다 (Jessi 지시). 그림은 문장마다 달라서
    // 앞 블록과 합치지 않고 항상 제 블록을 갖는다.
    const dia = line?.diagram;
    if (dia) {
      raw.push({
        kind: "diagram",
        from: raw.length === 0 ? 0 : from,
        diagram: dia,
      });
    } else if (raw.length === 0) {
      // 첫 장면은 0초부터
      raw.push({
        kind,
        from: 0,
        screen: line?.screen,
        find: findOf(line, lang),
      });
    } else if (
      raw[raw.length - 1].kind !== kind ||
      raw[raw.length - 1].diagram ||
      // 같은 장면이라도 **화면이 바뀌면 블록을 끊는다.** 합쳐 버리면 뒤
      // 문장이 고른 화면이 통째로 버려진다 — 9/12 vibelog 편에서 demo 두
      // 문장("첫 화면의 숫자" → /, "글 주소도 7자리" → /log)이 한 블록으로
      // 합쳐져 둘 다 홈만 돌았다. 대본이 문장마다 화면을 고르는 의미가 없어진다
      // (Jessi 지적: "이야기하는데 화면은 다른 데가 돌아간다")
      (kind === "phone" &&
        !!(line?.screen || findOf(line, lang)) &&
        !!(raw[raw.length - 1].screen || raw[raw.length - 1].find) &&
        (line?.screen !== raw[raw.length - 1].screen ||
          findOf(line, lang) !== raw[raw.length - 1].find))
    ) {
      raw.push({
        kind,
        from,
        screen: line?.screen,
        find: findOf(line, lang),
        shot: line?.shot,
      });
    } else if (
      !raw[raw.length - 1].screen &&
      !raw[raw.length - 1].find &&
      (line?.screen || findOf(line, lang))
    ) {
      // 화면 지정이 없던 블록은 뒤 문장의 지정을 받아 쓴다
      raw[raw.length - 1].screen = line?.screen;
      raw[raw.length - 1].find = findOf(line, lang);
      raw[raw.length - 1].shot = line?.shot;
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
      // 정류장 키(화면 + 가리킨 글자)로 먼저 찾고, 없으면 화면만으로
      let key = seg.screen
        ? seg.find
          ? `${seg.screen}\u0000${seg.find}`
          : seg.screen
        : undefined;
      let m = key ? segMap?.get(key) : undefined;
      // 경로 없이 find만 고른 문장 — 녹화기가 사이트를 돌며 찾아 놓은
      // 정류장이 있다. 가리킨 말이 같은 정류장을 키에서 찾아 쓴다
      if (!m && !seg.screen && seg.find && segMap?.size) {
        for (const [p, cand] of segMap) {
          if (p.split("\u0000")[1] === seg.find) {
            key = p;
            m = cand;
            break;
          }
        }
      }
      if (!m && seg.screen && segMap?.get(seg.screen)) {
        key = seg.screen;
        m = segMap.get(seg.screen);
      }
      if (!m && segMap?.size) {
        // 화면 미지정 블록: 아직 가장 덜 쓴 녹화 화면을 골라 앞 블록과
        // 같은 화면만 반복되는 것을 피한다 (Jessi: 같은 화면 두 번은 의미 없다)
        for (const [p, cand] of segMap) {
          if (
            !m ||
            (usedInScreen.get(p) ?? 0) < (usedInScreen.get(key!) ?? 0)
          ) {
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
        seg.sourceOffset =
          m.start + Math.min(used, Math.max(0, segLen - blockLen));
        usedInScreen.set(key, used + blockLen);
        // 그 정류장에서 가리킨 요소의 세로 위치 — 크롭이 이걸 기준으로 잡는다
        seg.focusY = m.focusY;
        seg.aspect = m.aspect;
      }
      // duo 샷의 보조 폰: 주 화면과 '다른' 화면의 구간 시작을 미리 골라 둔다
      // (내레이션 순서상 첫 번째 다른 화면 — 내용 관련 화면이 홈보다 먼저 잡힘)
      // 같은 페이지의 다른 위치는 duo 재료로 안 쓴다 — 두 폰이 거의 같아 보인다.
      // 경로 자체가 다른 정류장만 보조 폰에 올린다 (없으면 duo를 안 쓴다)
      if (segMap?.size) {
        const mainPath = (key ?? "").split("\u0000")[0];
        for (const [p, cand] of segMap) {
          if (p.split("\u0000")[0] !== mainPath) {
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
    (segments ?? []).map((s) => [
      s.find ? `${s.path}\u0000${s.find}` : s.path,
      { start: s.start, end: s.end, focusY: s.focusY, aspect: s.aspect },
    ]),
  );
  const segs = buildSegments(
    script,
    timing,
    total,
    Boolean(artFiles?.next),
    offset,
    coldOpen,
    lang,
    segMap,
  );
  // 데모 샷 로테이션 — day + 장면 순번. 한 편 안에서도, 에피소드 사이에서도
  // 같은 데모 연출이 연속되지 않는다 (Jessi 지시)
  /**
   * 이 데모 블록을 어떻게 보여줄지. **내용이 정한다** — 대본이 문장마다 고른
   * shot을 그대로 쓴다 (focus/whole/compare).
   *
   * 전에는 (day + 장면 순번) % 3으로 폰/밴드/듀오를 돌렸다. 내용과 무관한
   * 로테이션이라 격자를 가리키는 문장에 전체 화면이 붙고, 녹화 화면이 하나뿐인
   * 편에 두 폰이 겹쳐 나왔다 (Jessi: "정해놓은 걸 돌리거나 짜맞추는 게 아니라
   * 내용에 맞춘 구성"). 로테이션은 없앴다.
   *
   * 대본이 안 골랐으면 데이터로 유추한다 — 가리킨 것(find)이 있으면 그것을
   * 크게(focus), 없으면 화면 전체(whole).
   */
  const shotOf = (i: number): "phone" | "band" | "duo" | "card" => {
    const seg = segs[i];
    const want = seg?.shot ?? (seg?.find ? "focus" : "whole");
    // 견주려면 다른 화면이 실제로 녹화돼 있어야 한다 — 없으면 크게 보여준다
    // **그림 한 장짜리 화면은 폰이 아니다.** 링크 미리보기 카드처럼 가로로 긴
    // 그림을 세로 폰 프레임에 cover로 넣으면 억지로 늘어나고 잘린다. 녹화가
    // 남긴 비율(aspect)이 있으면 그 비율의 카드로 보여 준다 — 대본이 고른
    // shot보다 이게 앞선다. 무엇을 보여줄지가 아니라 그것이 무엇이냐의 문제다.
    if (seg?.aspect != null) return "card";
    if (want === "compare") return seg?.duoAltOffset != null ? "duo" : "band";
    return want === "focus" ? "band" : "phone";
  };

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
                durationInFrames={Math.ceil(
                  (seg.to - seg.from + SCENE_FADE) * fps,
                )}
                th={th}
                fromSec={seg.from}
                toSec={seg.to}
                segIndex={i}
                shot={shotOf(i)}
                // 붙잡은 것은 **한 곳을 이야기하는 문장**일 때만이다.
                // find가 있어도 화면 전체를 말하는 문장이면 녹화가 훑고
                // 있으므로, 프레임까지 멈추면 크롭이 엉뚱한 데서 굳는다
                held={!!seg.find && seg.shot !== "whole"}
                focusY={seg.focusY}
                aspect={seg.aspect}
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
