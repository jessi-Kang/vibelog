/**
 * 댓글 목록(GET ?post=)과 쓰기(POST). 규칙은 lib/comments.ts.
 * 쓰기는 안전 검사(비밀 키·개인 연락처·AI에게 끼워 넣은 지시)를 지나야 올라간다 —
 * 관리자의 AI 초안이 댓글을 읽으므로 끼워 넣은 지시도 막는다.
 */
import { after } from "next/server";
import { checkSafety, fmtSafety } from "@/scripts/safety";
import { mailAfterComment } from "@/lib/comment-mail";
import { addComment, CommentError, findPost, listComments, MAX_BODY, viewerInfo } from "@/lib/comments";
import { hasDb } from "@/lib/db";
import { sameOrigin, viewer } from "@/lib/session";

export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "private, no-store" };

export async function GET(req: Request) {
  const post = new URL(req.url).searchParams.get("post") ?? "";
  if (!hasDb()) return Response.json({ enabled: false, me: null, comments: [] }, { headers: NO_STORE });
  if (!findPost(post)) return Response.json({ error: "없는 글입니다" }, { status: 404, headers: NO_STORE });
  const v = await viewer();
  const [comments, me] = await Promise.all([listComments(post, v), v ? viewerInfo(v) : null]);
  return Response.json({ enabled: true, me, comments }, { headers: NO_STORE });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "잘못된 요청입니다" }, { status: 403 });
  const v = await viewer();
  if (!v) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
  let j: { post?: unknown; body?: unknown; parentId?: unknown };
  try {
    j = await req.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }
  const body = typeof j.body === "string" ? j.body.slice(0, MAX_BODY * 2) : "";
  const parentId = typeof j.parentId === "number" && Number.isInteger(j.parentId) ? j.parentId : null;
  const safety = await checkSafety(body);
  if (safety.flags.length)
    return Response.json({ error: `올릴 수 없는 내용이 있습니다 (${fmtSafety(safety.flags)})` }, { status: 422 });
  try {
    const r = await addComment(v, String(j.post ?? ""), body, parentId);
    after(() => mailAfterComment(r.notify.kind, r.id));
    return Response.json({ id: r.id });
  } catch (e) {
    if (e instanceof CommentError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
