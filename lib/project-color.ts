/**
 * 프로젝트 식별색 — "민트 하나" 규칙의 유일한 예외 (Jessi 지시: …
 * 프로젝트가 색으로 구분되게). 파이프라인이 projects.json에 적어 둔 색을 쓰므로
 * 어디서든 같은 프로젝트는 같은 색이다 (assignColors). vibelog 자신은 브랜드 민트 고정 — 민트가 라이브
 * 상태색과 겹치는 건 인지하고 수용한 결정이다 (Jessi). "고치지" 말 것.
 *
 * 팔레트 기준: 다크 배경 위 파스텔 밝기(본문 대비 AA 이상), 의미색과
 * 헷갈리지 않게 — 삽질 오렌지(#FFB454)·실패 레드(#FF6B6B)와 겹치는
 * 난색 계열은 뺐다.
 */
import projects from "../content/projects.json";

const MINT = "#5EE1C3";

/**
 * 9색 — 시안 docs/project-colors.html (10/11 Jessi 승인, B안). 처음 다섯 색에 초록·
 * 난초·바다·남보라를 더했다. 아홉 색 중 가장 비슷한 두 색(하늘·보라)의 차이는 다섯
 * 색일 때와 같다. 순서를 바꾸면 이름으로 고르는 기본 칸이 달라지니 끝에만 더한다.
 */
export const PALETTE = [
  "#E59FF6", // orchid
  "#81D584", // green
  "#8FB8FF", // periwinkle
  "#C9E579", // lime
  "#6FD3F2", // cyan
  "#B9A7FF", // violet
  "#3BACDA", // ocean
  "#968DFD", // indigo
  "#FF9EC7", // pink
];

function hashSlot(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h % PALETTE.length;
}

/**
 * 파이프라인이 projects.json에 적을 색을 정한다 (scripts/run.ts).
 *
 * 이름으로만 고르던 때는 프로젝트가 여섯이 되자 셋이 같은 보라가 됐다. 색 수를
 * 늘려도 이름으로 고르면 또 겹친다. 그래서 한 번 정한 색은 projects.json에 적어 두고
 * 다시 바꾸지 않으며, 새 프로젝트는 이름이 가리키는 칸부터 빈 색을 찾아 받는다.
 * 먼저 있던 프로젝트의 색은 새 프로젝트가 생겨도 바뀌지 않는다. 아홉 색이 다 차면
 * 그때부터는 이름이 가리키는 색을 같이 쓴다.
 */
export function assignColors(
  slugs: string[],
  kept: Record<string, string | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  const used = new Set<string>();
  const others = slugs.filter((s) => s !== "vibelog");
  for (const s of others) {
    const c = kept[s];
    if (c && PALETTE.includes(c) && !used.has(c)) {
      out[s] = c;
      used.add(c);
    }
  }
  for (const s of others) {
    if (out[s]) continue;
    const start = hashSlot(s);
    let pick = PALETTE[start];
    for (let k = 0; k < PALETTE.length; k++) {
      const c = PALETTE[(start + k) % PALETTE.length];
      if (!used.has(c)) {
        pick = c;
        break;
      }
    }
    out[s] = pick;
    used.add(pick);
  }
  return out;
}

const SAVED: Record<string, string> = Object.fromEntries(
  (projects as { slug: string; color?: string }[])
    .filter((p) => p.color)
    .map((p) => [p.slug, p.color as string]),
);

export function projectColor(slug: string): string {
  if (slug === "vibelog") return MINT;
  return SAVED[slug] ?? PALETTE[hashSlot(slug)];
}

/** rgba 파생 — soft 배경(.14)·line 테두리(.4) 등 accent-soft/line 패턴과 동일 */
export function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
