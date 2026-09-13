/**
 * Lottie 후보가 이 채널에 쓸 수 있는 것인지 판정한다.
 *
 *   npx tsx scripts/check-lottie.ts <파일 또는 주소…>
 *
 * 스톡 Lottie가 다 같지 않다. 골라 놓고 나서 못 쓰는 것을 알면 늦으므로
 * 먼저 거른다. 거르는 기준은 이 채널의 규칙에서 그대로 나온다.
 *
 * ① **벡터만.** 이미지 자산(`assets[].p`)이 든 것은 래스터 애니메이션이다.
 *    다시 칠할 수 없고, 확대하면 뭉개지고, 외부 PNG를 참조하면 렌더 중에
 *    네트워크를 탄다. 실제로 처음 받아 본 파일이 이 부류였다 (이미지 14개,
 *    벡터 칠 0개).
 * ② **다시 칠할 수 있어야 한다.** 테마가 5종이고 팔레트만 바뀌는 것이 채널
 *    문법이다 (docs/03-shorts-spec.md "테마"). 색이 JSON 안의 fill/stroke로
 *    있어야 테마 색으로 바꿔 끼울 수 있다.
 * ③ **색이 적어야 한다.** 색이 여럿이면 테마 두세 색으로 옮길 때 원본 디자인이
 *    무너진다. 선 그림(line icon)이 이 조건을 자연히 만족한다.
 * ④ **짧아야 한다.** 한 문장 길이(2–6초)에 얹는 것이라 그보다 길면 잘린다.
 * ⑤ **표현식(expression)이 없어야 한다.** `lottie-web`이 실행 시점에 계산하는
 *    것이라 프레임 단위 결정론을 깨뜨릴 수 있다 — 렌더가 매번 같아야 한다.
 */
import fs from "node:fs";

export interface LottieVerdict {
  name: string;
  ok: boolean;
  size: [number, number];
  seconds: number;
  layers: number;
  images: number;
  colors: string[];
  expressions: number;
  reasons: string[];
}

const hex = (k: number[]): string =>
  "#" +
  k
    .slice(0, 3)
    .map((x) =>
      Math.round(x <= 1 ? x * 255 : x)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");

/** fill(fl)·stroke(st)의 색과 표현식을 훑는다 */
function scan(node: unknown, out: { colors: string[]; expr: number }): void {
  if (Array.isArray(node)) {
    for (const v of node) scan(v, out);
    return;
  }
  if (!node || typeof node !== "object") return;
  const o = node as Record<string, unknown>;
  if ((o.ty === "fl" || o.ty === "st") && o.c && typeof o.c === "object") {
    const k = (o.c as Record<string, unknown>).k;
    if (Array.isArray(k) && typeof k[0] === "number")
      out.colors.push(hex(k as number[]));
  }
  if (typeof o.x === "string" && o.x.length > 0) out.expr++; // 표현식
  for (const v of Object.values(o)) scan(v, out);
}

export function checkLottie(name: string, json: unknown): LottieVerdict {
  const d = json as Record<string, unknown>;
  const assets = (d.assets as Record<string, unknown>[]) ?? [];
  const images = assets.filter((a) => "p" in a && a.p).length;
  const out = { colors: [] as string[], expr: 0 };
  scan(d.layers, out);
  scan(assets, out);
  const uniq = [...new Set(out.colors)];
  const fr = Number(d.fr) || 30;
  const seconds = (Number(d.op) - Number(d.ip)) / fr;
  const reasons: string[] = [];
  if (images > 0)
    reasons.push(`이미지 자산 ${images}개 — 래스터라 다시 칠할 수 없다`);
  if (uniq.length === 0)
    reasons.push("칠한 색이 없다 — 테마 색으로 바꿀 자리가 없다");
  if (uniq.length > 4)
    reasons.push(
      `고유색 ${uniq.length}개 — 테마 팔레트로 옮기면 디자인이 무너진다`,
    );
  if (seconds > 8)
    reasons.push(`${seconds.toFixed(1)}초 — 한 문장(2~6초)보다 길다`);
  if (out.expr > 0)
    reasons.push(`표현식 ${out.expr}개 — 프레임 단위 결정론을 깨뜨릴 수 있다`);
  return {
    name,
    ok: reasons.length === 0,
    size: [Number(d.w), Number(d.h)],
    seconds: Number(seconds.toFixed(2)),
    layers: ((d.layers as unknown[]) ?? []).length,
    images,
    colors: uniq,
    expressions: out.expr,
    reasons,
  };
}

/** #rrggbb → HSL의 S, L (0~1). 포인트 색과 무채색을 가르는 데 쓴다 */
function sl(h: string): { s: number; l: number } {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  return { s: d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)), l };
}

export interface Palette {
  /** 포인트 색이 갈 곳 */
  accent: string;
  /** 진한 무채색(선·글자)이 갈 곳 */
  ink: string;
  /** 옅은 무채색(보조)이 갈 곳 */
  muted: string;
}

/**
 * **포인트 컬러만 테마 색으로 바꾼다.** 그림은 그대로 두고 색만 우리 것으로.
 *
 * 처음엔 "가장 많이 쓰인 색을 주색"으로 봤는데 그건 다른 이야기다 — 선 그림은
 * 회색 선이 제일 많고 포인트는 한 번만 찍히는 경우가 흔하다. 그러면 회색이
 * 민트가 되고 포인트가 회색이 된다. 뒤집힌다.
 *
 * 그래서 **채도로 가른다**: 채도가 있는 색이 포인트 색이고, 무채색은 선·배경이다.
 *
 * 무채색도 그냥 두면 안 된다. 테마 다섯 중 `paper`는 밝은 테마라(ink #171A1F)
 * 흰 선 그림은 거기서 사라진다. 밝기로 ink/muted에 나눠 옮긴다 — 어느 테마에
 * 올려도 보이게.
 */
export function recolor(json: unknown, palette: Palette): unknown {
  const seen = { colors: [] as string[], expr: 0 };
  scan((json as Record<string, unknown>).layers, seen);
  const uniq = [...new Set(seen.colors)];

  // 채도 0.25 이상이면 포인트 색으로 본다. 여럿이면 가장 채도 높은 것만
  // accent로 올리고 나머지 포인트는 muted로 — 테마는 강조색이 하나다
  const points = uniq
    .filter((c) => sl(c).s >= 0.25)
    .sort((a, b) => sl(b).s - sl(a).s);
  const map = new Map<string, string>();
  points.forEach((c, i) =>
    map.set(c, i === 0 ? palette.accent : palette.muted),
  );
  for (const c of uniq) {
    if (map.has(c)) continue;
    // 무채색 — 밝기로 나눈다. 어두운 테마에서는 밝은 선이 ink, 그 반대도 성립
    map.set(c, sl(c).l >= 0.5 ? palette.ink : palette.muted);
  }

  const rgb = (h: string): number[] => [
    parseInt(h.slice(1, 3), 16) / 255,
    parseInt(h.slice(3, 5), 16) / 255,
    parseInt(h.slice(5, 7), 16) / 255,
    1,
  ];
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== "object") return node;
    const o = { ...(node as Record<string, unknown>) };
    if ((o.ty === "fl" || o.ty === "st") && o.c && typeof o.c === "object") {
      const c = o.c as Record<string, unknown>;
      if (Array.isArray(c.k) && typeof c.k[0] === "number") {
        const to = map.get(hex(c.k as number[]));
        if (to) o.c = { ...c, k: rgb(to) };
      }
    }
    for (const [k, v] of Object.entries(o)) o[k] = walk(v);
    return o;
  };
  return walk(json);
}

if (process.argv[1]?.endsWith("check-lottie.ts")) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log("쓰기: npx tsx scripts/check-lottie.ts <파일 또는 주소…>");
    process.exit(0);
  }
  void (async () => {
    for (const a of args) {
      let json: unknown;
      try {
        json = a.startsWith("http")
          ? await (
              await fetch(a, { signal: AbortSignal.timeout(20000) })
            ).json()
          : JSON.parse(fs.readFileSync(a, "utf8"));
      } catch (e) {
        console.log(`✗ ${a}\n    못 읽음: ${String(e).slice(0, 80)}`);
        continue;
      }
      const v = checkLottie(a.split("/").pop() ?? a, json);
      console.log(
        `${v.ok ? "쓸 수 있음" : "쓸 수 없음"}  ${v.name}\n` +
          `    ${v.size[0]}×${v.size[1]} · ${v.seconds}초 · 레이어 ${v.layers} · 색 ${v.colors.length}개 ${v.colors.join(" ")}`,
      );
      for (const r of v.reasons) console.log(`    → ${r}`);
    }
  })();
}
