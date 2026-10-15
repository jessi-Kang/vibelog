/**
 * 코어 UI — .claude/skills/vibelog-design/components/{core,navigation,feedback} 재구현.
 * 값(색·크기·간격·라운드)은 핸드오프 그대로, 표현만 Tailwind로.
 */
import Link from "next/link";
import type { ReactNode, CSSProperties } from "react";

export function Wordmark({ size = 18 }: { size?: number }) {
  // 헤더 로고는 모노 — 터미널 톤과 맞춘다 (Jessi 지시)
  return (
    <span
      className="font-mono font-bold leading-none tracking-[.01em] text-ink"
      style={{ fontSize: size }}
    >
      vibelog
    </span>
  );
}

export function Card({
  stripe,
  inset,
  dim,
  interactive,
  className = "",
  style,
  children,
}: {
  stripe?: string; // 상단 3px 상태 띠 색
  inset?: boolean;
  dim?: boolean;
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border border-line ${inset ? "bg-bg" : "bg-panel"} ${
        dim ? "opacity-80" : ""
      } ${interactive ? "transition-colors duration-150 hover:border-line-strong" : ""} ${className}`}
      style={{
        ...(stripe ? { borderTop: `3px solid ${stripe}` } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  aside,
  href,
}: {
  title: ReactNode;
  aside?: ReactNode;
  href?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-1">
      {/* 섹션 제목은 이름표 — 내용보다 약하게 (10/11, 전부 굵어서 문제라는 Jessi의 지적, 시안 2안) */}
      <h2 className="text-base font-medium text-muted">{title}</h2>
      {aside &&
        (href ? (
          <Link
            href={href}
            className="font-sans text-xs text-accent transition-opacity duration-150 hover:opacity-85"
          >
            {aside}
          </Link>
        ) : (
          <span className="font-sans text-xs tabular-nums text-muted">{aside}</span>
        ))}
    </div>
  );
}

export function EmptyState({
  title,
  titleAs: TitleTag = "div",
  body,
  hint,
  action,
  compact,
}: {
  title: ReactNode;
  /** 이 상태가 페이지의 본문 전부일 때는 h1으로 — 페이지에 제목이 하나는 있어야 한다 */
  titleAs?: "div" | "h1";
  body?: ReactNode;
  hint?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      className={`flex flex-col items-start gap-2 rounded-lg border border-dashed border-line-strong ${
        compact ? "px-[18px] py-4" : "px-[22px] py-7"
      }`}
    >
      <TitleTag className="m-0 text-md font-bold leading-snug">{title}</TitleTag>
      {body && (
        <p className="m-0 max-w-[48ch] text-base leading-relaxed text-muted [text-wrap:pretty]">
          {body}
        </p>
      )}
      {hint && (
        <code className="mt-0.5 rounded-sm bg-panel2 px-2 py-1 font-mono text-xs text-ink-soft">
          {hint}
        </code>
      )}
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}

const STATUS_META: Record<
  string,
  { label: string; text: string; stripe: string }
> = {
  idea: { label: "idea", text: "text-ink-soft", stripe: "#c9cfd8" },
  building: { label: "building", text: "text-warn", stripe: "#ffb454" },
  // 배포는 됐지만 아직 릴리즈 선언 전 — live(민트)와 구분되는 블루
  preview: { label: "preview", text: "text-[#7fb0ff]", stripe: "#7fb0ff" },
  live: { label: "live", text: "text-accent", stripe: "#5ee1c3" },
  paused: { label: "paused", text: "text-muted", stripe: "#3a4656" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_META[status] ?? STATUS_META.building;
  return (
    <span
      className={`whitespace-nowrap font-mono text-2xs font-medium uppercase tracking-[.08em] ${s.text}`}
    >
      ● {s.label}
    </span>
  );
}

/**
 * 쇼츠가 있는 글 표시 — 글자("쇼츠 ▶") 대신 Tabler `movie` 아이콘 (시안 docs/post-short-icon.html D안, Jessi).
 * 쇼츠가 없는 글에는 아무것도 붙이지 않는다. SVG의 <title>은 React 19 SSR에서 비므로
 * 이름은 aria-label, 마우스를 올렸을 때 뜨는 설명은 바깥 span의 title로 남긴다.
 */
export function ShortMark({ label, size = 12, inRow = false }: { label: string; size?: number; inRow?: boolean }) {
  return (
    // inRow: 글 목록의 메타 줄(MonoMeta)은 줄 상자 가운데에 맞추는데, 옆 글자의 잉크가 줄 상자 가운데보다
    // 아래에 앉아 아이콘이 1.9px 떠 보였다 (4배 화면에서 잰 값, Jessi). 그만큼 내린다
    <span className={`inline-flex text-accent${inRow ? " translate-y-[2px]" : ""}`} title={label}>
      <svg
        role="img"
        aria-label={label}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="block shrink-0"
      >
        <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm4-2v16m8-16v16M4 8h4m-4 8h4m-4-4h16m-4-4h4m-4 8h4" />
      </svg>
    </span>
  );
}

export function MonoMeta({
  items,
  className = "",
}: {
  items: (string | { text: ReactNode; tone?: "warn" | "accent" | "soft" })[];
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-2.5 font-sans text-2xs tabular-nums text-muted ${className}`}
    >
      {items.map((m, i) => {
        const t = typeof m === "string" ? { text: m } : m;
        const tone =
          t.tone === "warn"
            ? "text-warn"
            : t.tone === "accent"
              ? "text-accent"
              : t.tone === "soft"
                ? "text-ink-soft"
                : "";
        return (
          <span key={i} className={tone}>
            {t.text}
          </span>
        );
      })}
    </div>
  );
}
