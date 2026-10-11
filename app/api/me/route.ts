/** 로그인한 사람의 화면용 정보(GET)와 답글 메일 켜고 끄기(POST { mailReplies }) — 메일 주소는 내보내지 않는다 */
import { setMailReplies, viewerInfo } from "@/lib/comments";
import { hasDb } from "@/lib/db";
import { sameOrigin, viewer } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const v = hasDb() ? await viewer() : null;
  return Response.json({ me: v ? await viewerInfo(v) : null }, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "잘못된 요청입니다" }, { status: 403 });
  const v = await viewer();
  if (!v) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
  const j = await req.json().catch(() => ({}));
  await setMailReplies(v, j.mailReplies === true);
  return Response.json({ ok: true });
}
