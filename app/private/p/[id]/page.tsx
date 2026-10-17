/**
 * 숨긴 프로젝트의 글 — 로그인한 관리자에게만 열린다 (topic vibelog-hidden, lib/hidden-projects.ts).
 * 볼 때마다 로그인을 확인하므로 미리 만들어 두지 않는다. 관리자가 아니거나 공개된 글이면 404 —
 * 숨긴 글이 있는지조차 알리지 않는다.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/page-container";
import { PostView } from "@/components/post-view";
import { getDevlogs } from "@/lib/content";
import { hasDb } from "@/lib/db";
import { isHiddenProject } from "@/lib/hidden-projects";
import { findByPostId } from "@/lib/post-id";
import { viewer } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "숨긴 글", robots: { index: false, follow: false } };

export default async function PrivatePostPage({ params }: { params: Promise<{ id: string }> }) {
  const v = hasDb() ? await viewer() : null;
  if (!v?.isAdmin) notFound();
  const { id } = await params;
  const all = getDevlogs(undefined, { all: true });
  const d = findByPostId(all, id);
  if (!d || !isHiddenProject(d.repo)) notFound();
  return (
    <PageContainer>
      <PostView d={d} all={all} hidden />
    </PageContainer>
  );
}
