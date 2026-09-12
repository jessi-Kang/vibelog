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
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// 사이트 토큰과 같은 값 (app/globals.css). 여기선 CSS 변수를 못 쓴다.
const BG = "#0A0E14";
const INK = "#F3EFE6";
const MUTED = "#8C98A8";
const ACCENT = "#5EE1C3";
const LINE = "#26313F";

/** 필요한 글자만 잘라 받은 폰트 바이너리 */
async function subset(
  family: string,
  weight: number,
  text: string,
): Promise<ArrayBuffer> {
  const url =
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}` +
    `:wght@${weight}&text=${encodeURIComponent(text)}`;
  // 최신 브라우저 UA를 보내면 woff2를 주는데 satori가 못 읽는다 — 낡은 UA로 ttf를 받는다
  const css = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "force-cache",
  }).then((r) => r.text());
  const src = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
  if (!src) throw new Error(`폰트 서브셋 실패: ${family} ${weight}`);
  return fetch(src, { cache: "force-cache" }).then((r) => r.arrayBuffer());
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
  const monoText = `${eyebrow}${meta}vibelog_ ·`;
  const [bold, regular, mono] = await Promise.all([
    subset("Noto Sans KR", 700, head || "vibelog"),
    subset("Noto Sans KR", 400, line || "vibelog"),
    subset("JetBrains Mono", 500, monoText),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "72px 76px",
          background: BG,
          backgroundImage: `radial-gradient(900px 460px at 88% -12%, rgba(94,225,195,0.18), rgba(10,14,20,0) 62%)`,
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
        <div style={{ display: "flex", flex: 1 }} />
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
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "sans", data: bold, weight: 700, style: "normal" },
        { name: "sans", data: regular, weight: 400, style: "normal" },
        { name: "mono", data: mono, weight: 500, style: "normal" },
      ],
    },
  );
}
