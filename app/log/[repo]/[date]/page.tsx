import { notFound, permanentRedirect } from "next/navigation";
import { getDevlog } from "@/lib/content";
import { postPath } from "@/lib/post-id";

/**
 * 옛 주소 — 레포·날짜가 그대로 읽히던 `/log/<repo>/<date>`.
 * 새 주소(`/p/<id>`)로 영구 이동한다. 이미 공유된 링크와 검색 결과가
 * 죽으면 안 되므로 라우트를 지우지 않고 리다이렉트만 남긴다.
 */
export default async function LegacyDevlogPost({
  params,
}: {
  params: Promise<{ repo: string; date: string }>;
}) {
  const { repo, date } = await params;
  const d = getDevlog(repo, date);
  if (!d) notFound();
  permanentRedirect(postPath(d));
}
