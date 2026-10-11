/**
 * 메일에 넣는 아이콘 그림(PNG) — 메일 앱은 SVG를 지우므로 그림으로 구워 보낸다.
 * 사람 아이콘(`?i=cat&c=8FB8FF`)과 프로젝트 아이콘(`?p=lie-detective`) 두 가지.
 * 밝은 판 위에서 경계가 흐리지 않게 같은 색의 얇은 테를 두른다 (시안 docs/post-comments.html).
 * 정해진 아이콘·색만 받는다 — 아무 그림이나 만들어 주는 통로가 되지 않게.
 */
import { ImageResponse } from "next/og";
import { AVATAR_PATHS } from "@/lib/avatar-icons";
import { getProjects } from "@/lib/content";
import { PALETTE } from "@/lib/project-color";
import { iconOrDefault } from "@/lib/project-icon";

const ALLOWED = new Set([...PALETTE, "#5EE1C3", "#8C98A8"].map((c) => c.slice(1).toUpperCase()));

function mix(hex: string, with_: number, amount: number): string {
  const n = parseInt(hex, 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * amount + with_ * (1 - amount)));
  return `rgb(${ch.join(",")})`;
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  let paths: string[] | undefined;
  let color = (q.get("c") ?? "").toUpperCase();
  let shape: "circle" | "square" = "circle";
  const slug = q.get("p");
  if (slug) {
    const p = getProjects().find((x) => x.slug === slug);
    paths = p ? iconOrDefault(p.icon).paths.map((x) => x.d) : undefined;
    color = (p?.color ?? "").replace("#", "").toUpperCase();
    shape = "square";
  } else {
    paths = AVATAR_PATHS[q.get("i") ?? ""];
  }
  if (!paths || !ALLOWED.has(color)) return new Response("not found", { status: 404 });
  const S = 96;
  return new ImageResponse(
    (
      <div
        style={{
          width: S,
          height: S,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: shape === "circle" ? S / 2 : S * 0.28,
          background: mix(color, 255, 0.22),
          border: `3px solid ${mix(color, 255, 0.55)}`,
        }}
      >
        <svg width={S * 0.56} height={S * 0.56} viewBox="0 0 24 24" fill="none" stroke={mix(color, 0, 0.72)} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          {paths.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </svg>
      </div>
    ),
    { width: S, height: S, headers: { "cache-control": "public, max-age=31536000, immutable" } },
  );
}
