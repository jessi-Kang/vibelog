/**
 * Vercel Cron → GitHub Actions. 진짜 시계를 Vercel이 쥔다.
 *
 * GitHub의 예약(cron)을 못 믿는다. 30분 주기인 projects.yml이 실제로는 4시간
 * 간격으로 돌았고(9/12 실측: 22:21 → 00:26 → 04:51 → 08:59 → 12:47Z),
 * devlog의 23:00 KST 회차는 통째로 안 떴다 — Jessi가 "오늘도 안 돈 거 같은데"로
 * 두 번 잡았다. 백업 회차를 더 깔아도 같이 밀리므로 슬롯으로는 못 이긴다.
 *
 * 그래서 시각은 Vercel Cron이 재고(제때 돈다), 실행은 그대로 Actions에서 한다 —
 * ffmpeg·Playwright·Remotion을 45분까지 돌리는 일이라 서버리스로 옮길 것이
 * 아니다. 여기는 "띄우기"만 한다.
 *
 * 필요한 환경변수 둘 (Vercel 프로젝트에):
 * - `GH_PAT` — Actions: write 권한. 없으면 띄울 수 없다.
 * - `CRON_SECRET` — Vercel이 cron 호출에 `Authorization: Bearer`로 실어 보낸다.
 *   없으면 아무나 부를 수 있으므로 라우트가 아예 거절한다.
 */

const REPO = "jessi-Kang/vibelog";
const REF = "claude/file-analysis-dpnhw1";

/** 이 요청이 정말 Vercel Cron인지 */
export function fromCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function dispatch(
  workflow: string,
  inputs: Record<string, string> = {},
): Promise<Response> {
  const token = process.env.GH_PAT;
  if (!token)
    return Response.json(
      {
        error:
          "GH_PAT 없음 — Vercel 환경변수에 Actions:write 토큰이 필요합니다",
      },
      { status: 503 },
    );

  const res = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${workflow}/dispatches`,
    {
      method: "POST",
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ ref: REF, inputs }),
      signal: AbortSignal.timeout(10000),
    },
  );

  // 성공은 204 No Content — 본문이 없다
  if (res.status === 204) return Response.json({ ok: true, workflow, inputs });
  return Response.json(
    { error: `GitHub ${res.status}`, detail: (await res.text()).slice(0, 300) },
    { status: 502 },
  );
}
