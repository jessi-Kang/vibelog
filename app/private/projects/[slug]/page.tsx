/**
 * 숨긴 프로젝트의 페이지 — 로그인한 관리자에게만 열린다 (topic vibelog-hidden, lib/hidden-projects.ts).
 * 볼 때마다 로그인을 확인하므로 미리 만들어 두지 않는다. 관리자가 아니거나 공개된 프로젝트면 404.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectView } from "@/components/project-view";
import { getDevlogs, getProject } from "@/lib/content";
import { hasDb } from "@/lib/db";
import { isHiddenProject } from "@/lib/hidden-projects";
import { viewer } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "숨긴 프로젝트", robots: { index: false, follow: false } };

export default async function PrivateProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const v = hasDb() ? await viewer() : null;
  if (!v?.isAdmin) notFound();
  const { slug } = await params;
  if (!isHiddenProject(slug)) notFound();
  const project = getProject(slug, { all: true });
  if (!project) notFound();
  return <ProjectView project={project} logs={getDevlogs(slug, { all: true })} hidden />;
}
