/**
 * 프로젝트 식별색 — "민트 하나" 규칙의 유일한 예외 (Jessi 지시: 피드에서
 * 프로젝트가 색으로 구분되게). 레포 이름 해시로 결정되어 어디서든 같은
 * 프로젝트는 같은 색이다. vibelog 자신은 브랜드 민트 고정 — 민트가 라이브
 * 상태색과 겹치는 건 인지하고 수용한 결정이다 (Jessi). "고치지" 말 것.
 *
 * 팔레트 기준: 다크 배경 위 파스텔 밝기(본문 대비 AA 이상), 의미색과
 * 헷갈리지 않게 — 삽질 오렌지(#FFB454)·실패 레드(#FF6B6B)와 겹치는
 * 난색 계열은 뺐다.
 */
const MINT = "#5EE1C3";

const PALETTE = [
  "#6FD3F2", // cyan
  "#B9A7FF", // violet
  "#FF9EC7", // pink
  "#C9E579", // lime
  "#8FB8FF", // periwinkle
];

export function projectColor(slug: string): string {
  if (slug === "vibelog") return MINT;
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** rgba 파생 — soft 배경(.14)·line 테두리(.4) 등 accent-soft/line 패턴과 동일 */
export function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
