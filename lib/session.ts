/** 라우트에서 쓰는 로그인 정보 — 없으면 null */
import { auth } from "@/auth";
import type { Viewer } from "./comments";

export async function viewer(): Promise<Viewer | null> {
  const s = await auth();
  return s?.user?.id ? { id: s.user.id, name: s.user.name, isAdmin: s.user.isAdmin } : null;
}

/** 다른 사이트에서 보낸 쓰기 요청을 막는다 — 같은 주소에서 온 것만 받는다 */
export function sameOrigin(req: Request): boolean {
  const o = req.headers.get("origin");
  if (!o) return false;
  return o === new URL(req.url).origin;
}
