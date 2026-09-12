/**
 * 밤 회차를 띄운다. 시각은 vercel.json의 crons가 쥔다 (23:00 KST 정시 +
 * 백업 세 번). `guard: true`로 넣으므로 먼저 돈 회차가 이미 발행했으면
 * 워크플로가 조용히 끝난다 — 이중 발행·TTS 중복 비용이 없다.
 */
import { dispatch, fromCron } from "@/lib/dispatch";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!fromCron(req)) return new Response("forbidden", { status: 403 });
  return dispatch("devlog.yml", { guard: "true" });
}
