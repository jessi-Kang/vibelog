import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DevlogBody from "@/components/DevlogBody";
import StatusBadge from "@/components/StatusBadge";
import { getDevlogs, getProject, getProjects } from "@/lib/content";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  return { title: project?.name ?? slug };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const devlogs = getDevlogs(project.slug);

  return (
    <div>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-black">{project.name}</h1>
        <StatusBadge status={project.status} />
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {project.description}
      </p>
      <div className="mt-4 flex flex-wrap gap-4 font-mono text-xs">
        {project.homepage && (
          <a
            href={project.homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-4"
          >
            live ↗
          </a>
        )}
        <a
          href={project.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted underline underline-offset-4 hover:text-ink"
        >
          github ↗
        </a>
      </div>

      <h2 className="mt-12 mb-6 font-mono text-xs font-bold uppercase tracking-widest text-muted">
        devlog
      </h2>
      {devlogs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-8 text-center font-mono text-sm text-muted">
          아직 데브로그가 없습니다.
        </p>
      ) : (
        <ol className="relative space-y-10 border-l border-line pl-6">
          {devlogs.map((d) => (
            <li key={d.date} className="relative">
              <span
                aria-hidden
                className="absolute top-1.5 -left-[30px] h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-panel"
              />
              <div className="font-mono text-xs font-bold text-accent">
                {d.date}
              </div>
              <h3 className="mt-1 text-lg font-black">{d.title}</h3>
              <div className="mt-3">
                <DevlogBody markdown={d.body} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
