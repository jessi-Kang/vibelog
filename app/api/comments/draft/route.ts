/** Jessi의 답글 AI 초안 (POST { commentId, mode, current }) — Jessi만. 초안은 돌려주기만 하고 올리지 않는다 */
import { draftReply, type DraftMode } from "@/lib/comment-draft";
import { CommentError } from "@/lib/comments";
import { sameOrigin, viewer } from "@/lib/session";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "잘못된 요청입니다" }, { status: 403 });
  const v = await viewer();
  if (!v?.isAdmin) return Response.json({ error: "만든 사람만 쓸 수 있습니다" }, { status: 403 });
  const j = await req.json().catch(() => ({}));
  const mode: DraftMode = j.mode === "polish" || j.mode === "short" ? j.mode : "draft";
  if (!Number.isInteger(j.commentId)) return Response.json({ error: "없는 댓글입니다" }, { status: 404 });
  try {
    return Response.json(await draftReply(j.commentId, mode, typeof j.current === "string" ? j.current : ""));
  } catch (e) {
    if (e instanceof CommentError) return Response.json({ error: e.message }, { status: e.status });
    console.error(`[draft] 실패: ${(e as Error).message.slice(0, 120)}`);
    return Response.json({ error: "초안을 만들지 못했습니다. 잠시 뒤 다시 눌러 주세요" }, { status: 502 });
  }
}
