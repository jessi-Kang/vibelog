import type { ProjectStatus } from "@/lib/content";

const STYLES: Record<ProjectStatus, string> = {
  live: "bg-accent/15 text-accent",
  building: "bg-warn/15 text-warn",
  paused: "bg-muted/15 text-muted",
  idea: "border border-dashed border-line text-muted",
};

const LABELS: Record<ProjectStatus, string> = {
  live: "live",
  building: "building",
  paused: "paused",
  idea: "idea",
};

export default function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
