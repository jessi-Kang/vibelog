import Link from "next/link";
import type { Project } from "@/lib/content";
import StatusBadge from "./StatusBadge";

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group block rounded-2xl border border-line bg-panel p-5 transition-colors hover:border-accent/60"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black group-hover:text-accent">
          {project.name}
        </h2>
        <StatusBadge status={project.status} />
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {project.description}
      </p>
      {project.stack.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {project.stack.map((s) => (
            <span
              key={s}
              className="rounded-md border border-line px-2 py-0.5 font-mono text-[11px] text-muted"
            >
              {s}
            </span>
          ))}
        </div>
      )}
      <div className="mt-4 font-mono text-[11px] text-muted">
        last activity · {project.lastActivity.slice(0, 10)}
      </div>
    </Link>
  );
}
