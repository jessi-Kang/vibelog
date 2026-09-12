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
 *   없으면 아무나 부를 수 있으므로 라우트가 아예 거절한다. 그냥 막지 않는
 *   이유는 아래 guardCron 주석에 적었다 — 설정이 들어갔는지 보여야 한다.
 */

const REPO = "jessi-Kang/vibelog";
const REF = "claude/file-analysis-dpnhw1";

/**
 * 호출자 확인. 막을 때 **왜** 막았는지 구분해서 알려 준다 — 설정이 안 된 것과
 * 인증이 없는 것이 똑같이 403으로 보이면, 환경변수를 넣고도 들어갔는지 알 수
 * 없다. `curl https://vibelog.space/api/cron/devlog` 하나로 어디까지 됐는지
 * 보이게 하는 게 목적이다:
 *
 * - 503 `CRON_SECRET 미설정` → Vercel 환경변수가 아직 없다
 * - 503 `GH_PAT 없음`        → 시크릿은 됐고 토큰이 없다
 * - 403 `forbidden`          → 둘 다 됐다. 인증만 없는 것이니 설정은 끝
 */
export function guardCron(req: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return Response.json(
      {
        error:
          "CRON_SECRET 미설정 — Vercel 환경변수에 넣어야 예약 호출을 받습니다",
      },
      { status: 503 },
    );
  if (req.headers.get("authorization") !== `Bearer ${secret}`)
    return new Response("forbidden", { status: 403 });
  return null;
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
