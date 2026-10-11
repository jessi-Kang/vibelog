/** 머리글 종 — 알림 목록(GET)과 읽음 표시(POST { ids } 또는 { all: true }) */
import { listNotes, markRead } from "@/lib/comments";
import { hasDb } from "@/lib/db";
import { sameOrigin, viewer } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const v = hasDb() ? await viewer() : null;
  if (!v) return Response.json({ unread: 0, items: [] }, { headers: { "cache-control": "private, no-store" } });
  return Response.json(await listNotes(v), { headers: { "cache-control": "private, no-store" } });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "잘못된 요청입니다" }, { status: 403 });
  const v = await viewer();
  if (!v) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
  const j = await req.json().catch(() => ({}));
  const ids = Array.isArray(j.ids) ? j.ids.filter((x: unknown) => Number.isInteger(x)).slice(0, 100) : [];
  await markRead(v, j.all === true ? "all" : ids);
  return Response.json({ ok: true });
}
