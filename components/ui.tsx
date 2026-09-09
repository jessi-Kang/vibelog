/**
 * 코어 UI — .claude/skills/vibelog-design/components/{core,navigation,feedback} 재구현.
 * 값(색·크기·간격·라운드)은 핸드오프 그대로, 표현만 Tailwind로.
 */
import Link from "next/link";
import type { ReactNode, CSSProperties } from "react";

export function Wordmark({ size = 18 }: { size?: number }) {
  return (
    <span
      className="font-sans font-black leading-none tracking-[.01em] text-ink"
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
  title: string;
  aside?: string;
  href?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-1">
      <h2 className="text-md font-bold text-ink">{title}</h2>
      {aside &&
        (href ? (
          <Link
            href={href}
            className="font-mono text-2xs text-accent transition-opacity duration-150 hover:opacity-85"
          >
            {aside}
          </Link>
        ) : (
          <span className="font-mono text-2xs text-muted">{aside}</span>
        ))}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  hint,
  action,
  compact,
}: {
  title: string;
  body?: string;
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
      <div className="text-md font-bold leading-snug">{title}</div>
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
  live: { label: "live", text: "text-accent", stripe: "#5ee1c3" },
  paused: { label: "paused", text: "text-muted", stripe: "#3a4656" },
};

export function statusStripe(status: string): string {
  return (STATUS_META[status] ?? STATUS_META.building).stripe;
}

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_META[status] ?? STATUS_META.building;
  return (
    <span
      className={`whitespace-nowrap font-mono text-2xs font-bold uppercase tracking-[.08em] ${s.text}`}
    >
      ● {s.label}
    </span>
  );
}

export function MonoMeta({
  items,
  className = "",
}: {
  items: (string | { text: string; tone?: "warn" | "accent" | "soft" })[];
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap gap-x-2.5 font-mono text-2xs text-muted ${className}`}
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
