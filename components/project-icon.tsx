import { iconOrDefault, type ProjectIcon as Icon } from "@/lib/project-icon";

/** 프로젝트 아이콘 (Tabler outline, lib/project-icon.ts) — 색은 부모의 글자색을 따른다. 없으면 기본 아이콘(코드 꺾쇠) */
export function ProjectIcon({
  icon,
  size = 28,
  className = "",
  style,
}: {
  icon?: Icon | null;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ok = iconOrDefault(icon);
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      className={`flex-none ${className}`}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ok.paths.map((p, i) => (
        <path key={i} d={p.d} {...(p.filled ? { fill: "currentColor" } : {})} />
      ))}
    </svg>
  );
}
