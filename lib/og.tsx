import { ImageResponse } from "next/og";

/**
 * 링크 미리보기 카드(OG 이미지)를 글마다 하나씩 그린다.
 *
 * 예전엔 고정 이미지 하나(`/og.png`)를 사이트 전체가 같이 썼는데, Next는
 * 자식 라우트가 openGraph를 정의하면 부모의 images를 물려주지 않아서 글·프로젝트
 * 페이지에는 og:image가 아예 빠져 있었다 — 링크를 붙이면 이미지 없는 카드가
 * 나갔다 (Jessi 지적). 여기서 라우트별로 그려 그 문제를 없애고, 덤으로 카드에
 * 그 글의 제목이 보이게 한다.
 *
 * 폰트는 Google Fonts의 `text=` 서브셋을 받는다. 한글 전체 폰트는 5MB라
 * ImageResponse에 실을 수 없지만, 카드에 실제로 쓰이는 글자만 잘라 받으면 몇 KB다.
 *
 * 그 받아 오기가 배포를 세 번 깼다 — 카드가 아홉 장이라 빌드 한 번에 폰트
 * 요청이 스무 번 가까이 나가고, 그 중 하나가 ETIMEDOUT이면 프리렌더가 실패해
 * **배포 전체가 죽었다** (ce39829·0d689d7 두 커밋이 이렇게 라이브에 못 나갔다).
 * 그래서 세 겹으로 막는다: 같은 URL은 한 번만 받고(모노는 고정 글자라 빌드당
 * 한 번), 실패하면 짧은 시간 안에 다시 시도하고, 끝내 못 받으면 그 폰트 없이
 * 그린다. 카드 한 장의 모양이 아쉬운 것이 배포가 멈추는 것보다 낫다.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// 사이트 토큰과 같은 값 (app/globals.css). 여기선 CSS 변수를 못 쓴다.
const BG = "#0A0E14";
const INK = "#F3EFE6";
const MUTED = "#8C98A8";
const ACCENT = "#5EE1C3";
const LINE = "#26313F";

/** 모노는 라틴만 쓴다 — 글자를 고정해 두면 서브셋을 빌드당 한 번만 받는다 */
const MONO_CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ._-/:\u00b7";

/** 같은 서브셋을 두 번 받지 않는다 (한 빌드 안에서) */
const fontCache = new Map<string, Promise<ArrayBuffer>>();

/** 네트워크가 한 번 튄다고 배포가 죽으면 안 된다 — 짧게 끊고 다시 시도한다 */
async function fetchRetry(url: string, init?: RequestInit): Promise<Response> {
  let last: unknown;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

async function loadSubset(cssUrl: string): Promise<ArrayBuffer> {
  // 최신 브라우저 UA를 보내면 woff2를 주는데 satori가 못 읽는다 — 낡은 UA로 ttf를 받는다
  const css = await fetchRetry(cssUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "force-cache",
  }).then((r) => r.text());
  const src = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
  if (!src) throw new Error(`폰트 서브셋 실패: ${cssUrl}`);
  return fetchRetry(src, { cache: "force-cache" }).then((r) => r.arrayBuffer());
}

/** 필요한 글자만 잘라 받은 폰트 바이너리. 못 받으면 null — 던지지 않는다 */
async function subset(
  family: string,
  weight: number,
  text: string,
): Promise<ArrayBuffer | null> {
  const url =
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}` +
    `:wght@${weight}&text=${encodeURIComponent(text)}`;
  let pending = fontCache.get(url);
  if (!pending) {
    pending = loadSubset(url);
    fontCache.set(url, pending);
  }
  try {
    return await pending;
  } catch {
    fontCache.delete(url); // 다음 카드는 다시 시도해 본다
    return null;
  }
}

/** 너무 긴 제목은 카드 밖으로 흘러넘친다 — 줄 수 기준으로 자른다 */
function clamp(text: string, max: number): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

export async function ogCard({
  eyebrow,
  title,
  sub,
  meta,
}: {
  /** 위쪽 라벨 — 라틴만 (모노 폰트에 한글이 없다) */
  eyebrow: string;
  title: string;
  sub?: string;
  /** 아래쪽 좌측 — 라틴만 */
  meta: string;
}): Promise<ImageResponse> {
  const head = clamp(title, 58);
  const line = sub ? clamp(sub, 96) : "";
  const [bold, regular, mono] = await Promise.all([
    subset("Noto Sans KR", 700, head || "vibelog"),
    subset("Noto Sans KR", 400, line || "vibelog"),
    subset("JetBrains Mono", 500, MONO_CHARS),
  ]);
  // 못 받은 폰트는 빼고 그린다 (다 빠지면 ImageResponse 기본 폰트로 나간다)
  const fonts = [
    { name: "sans", data: bold, weight: 700 as const },
    { name: "sans", data: regular, weight: 400 as const },
    { name: "mono", data: mono, weight: 500 as const },
  ]
    .filter(
      (f): f is { name: string; data: ArrayBuffer; weight: 700 | 400 | 500 } =>
        f.data !== null,
    )
    .map((f) => ({ ...f, style: "normal" as const }));

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "76px 88px",
        background: BG,
        backgroundImage: `radial-gradient(900px 460px at 88% -12%, rgba(94,225,195,0.18), rgba(10,14,20,0) 62%)`,
      }}
    >
      {/* 본문 블록 — 남는 공간을 위아래로 나눠 갖는다. 예전엔 위에 붙여 두고
            아래를 전부 빈 칸으로 뒀더니 카드 가운데가 텅 비어 보였다 (Jessi) */}
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "mono",
            fontSize: 26,
            letterSpacing: "0.09em",
            color: ACCENT,
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 26,
            fontFamily: "sans",
            fontWeight: 700,
            fontSize: head.length > 34 ? 60 : 72,
            lineHeight: 1.22,
            letterSpacing: "-0.015em",
            // 한글은 낱말 안에서 끊으면 안 된다 ("이유 / 를"처럼 조사가 떨어진다)
            wordBreak: "keep-all",
            color: INK,
          }}
        >
          {head}
        </div>
        {line ? (
          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontFamily: "sans",
              fontSize: 30,
              lineHeight: 1.45,
              wordBreak: "keep-all",
              color: MUTED,
            }}
          >
            {line}
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", height: 1, background: LINE }} />
      <div
        style={{
          display: "flex",
          marginTop: 26,
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: "mono",
          fontSize: 24,
          color: MUTED,
        }}
      >
        <div style={{ display: "flex" }}>{meta}</div>
        <div style={{ display: "flex", color: INK, fontWeight: 500 }}>
          vibelog<span style={{ color: ACCENT }}>_</span>
        </div>
      </div>
    </div>,
    {
      ...OG_SIZE,
      fonts: fonts.length > 0 ? fonts : undefined,
    },
  );
}
