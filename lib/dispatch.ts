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
 * 호출자 확인. 막을 때 **왜** 막았는지 사람 말로 알려 준다.
 *
 * 설정이 안 된 것과 인증이 없는 것이 똑같이 403으로 보이면, 환경변수를 넣고도
 * 들어갔는지 알 수 없다. 그래서 브라우저로 이 주소를 그냥 열어 보면 어디까지
 * 됐는지 한 문장으로 읽히게 했다 (Jessi: curl로 확인하라는 게 무슨 말인지
 * 모르겠다 — 눌러서 보이는 쪽이 맞다).
 *
 *   https://vibelog.space/api/cron/devlog
 *
 * 기계는 이 본문을 안 읽는다. 부르는 쪽은 Vercel Cron뿐이고 성공만 본다.
 */
function say(text: string, status: number): Response {
  return new Response(`${text}\n`, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export function guardCron(req: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  const ok = secret && req.headers.get("authorization") === `Bearer ${secret}`;
  if (ok) return null;

  // **바깥에는 아무것도 알려 주지 않는다.** 전에는 여기서 설정이 어디까지
  // 됐는지를 한국어로 알려 줬다 (환경변수를 넣고도 들어갔는지 알 수 없어서
  // 만든 장치다). 그런데 그건 익명 방문자에게 "이 사이트의 자동 발행이
  // 살아 있고 토큰 둘이 다 꽂혀 있다"를 말해 주는 것이기도 하다 — 이 라우트는
  // 한 번 부르면 Actions를 45분 돌리고 TTS 과금을 부르는 자리라 그 정보에
  // 값이 있다. 레드팀 검사에서 잡혔다.
  //
  // 진단은 없애지 않고 **자리를 옮겼다**: 함수 로그에 남긴다. Vercel 로그는
  // 프로젝트 소유자만 본다 — 설정이 들어갔는지는 거기서 확인한다.
  //   https://vercel.com/jessikang/vibelog/logs
  console.warn(
    `[cron] 인증 실패 — CRON_SECRET ${secret ? "있음" : "없음"} / GH_PAT ${
      process.env.GH_PAT ? "있음" : "없음"
    }`,
  );
  return say("Unauthorized", 401);
}

export async function dispatch(
  workflow: string,
  inputs: Record<string, string> = {},
): Promise<Response> {
  const token = process.env.GH_PAT;
  if (!token)
    return say(
      "GH_PAT이 없습니다 — Vercel 환경변수에 Actions: write 토큰을 넣으세요.",
      503,
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
