import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectView } from "@/components/project-view";
import { getDevlogs, getProject, getProjects } from "@/lib/content";
import { projectBlurb } from "@/lib/project-name";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p) return { title: slug };
  return {
    title: p.name,
    description: projectBlurb(p),
    alternates: { canonical: `/projects/${slug}` },
    openGraph: { url: `/projects/${slug}`, title: p.name, description: projectBlurb(p) },
    // 부모의 twitter 태그를 덮어쓴다 (안 적으면 프로젝트명 대신 사이트 이름이 뜬다)
    twitter: {
      card: "summary_large_image",
      title: p.name,
      description: projectBlurb(p),
    },
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();
  return <ProjectView project={project} logs={getDevlogs(project.slug)} />;
}
