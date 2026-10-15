/** 댓글 숨기기·다시 보이기(PATCH, 관리자만)와 지우기(DELETE, 관리자와 쓴 사람) */
import { CommentError, removeComment, setHidden } from "@/lib/comments";
import { sameOrigin, viewer } from "@/lib/session";

async function run(req: Request, id: string, fn: (v: NonNullable<Awaited<ReturnType<typeof viewer>>>, n: number) => Promise<void>) {
  if (!sameOrigin(req)) return Response.json({ error: "잘못된 요청입니다" }, { status: 403 });
  const v = await viewer();
  if (!v) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
  const n = Number(id);
  if (!Number.isInteger(n)) return Response.json({ error: "없는 댓글입니다" }, { status: 404 });
  try {
    await fn(v, n);
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof CommentError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let hidden = false;
  try {
    hidden = (await req.json()).hidden === true;
  } catch {
    return Response.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }
  return run(req, id, (v, n) => setHidden(v, n, hidden));
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return run(req, id, (v, n) => removeComment(v, n));
}
