/**
 * 실시간 커밋 수 — 서버가 한 번 세서 모두에게 나눠준다.
 *
 * 전에는 방문자 브라우저가 GitHub 공개 API를 직접 불렀다. 그게 IP당 시간당
 * 60회라, 새로고침을 몇 번 하면 403이 떨어지고 화면은 조용히 밤에 저장해 둔
 * 값으로 되돌아갔다 — 숫자가 21/365에 멈춰 있던 이유다 (Jessi가 콘솔에서
 * 잡았다). 방문자가 늘면 무조건 터지는 구조였다.
 *
 * 여기서 세면 요청 수가 방문자 수와 무관해진다. 5분에 한 번만 GitHub에
 * 물어보고(레포당 두 번 = 네 번), 그 사이 방문은 캐시가 받는다 — 시간당 48회로
 * 무인증 한도 60 안이다. `GH_PAT`/`GITHUB_TOKEN`이 있으면 그걸 쓴다 (한도 5000).
 *
 * 창은 잔디와 같다 — 오늘은 KST 자정부터, 이번 주는 오늘 포함 7일. 화면의
 * 숫자와 격자가 서로 다른 말을 하지 않기 위한 것이고, 셈도 같은 함수를 쓴다
 * (lib/commit-hours).
 */
import {
  HEATMAP_DAYS,
  addDays,
  hourHistogram,
  todayKst,
  type LiveCounts,
} from "@/lib/commit-hours";
import { getProjects } from "@/lib/content";
import { countSince, ghGet as get, repoOf } from "@/lib/github-server";

/** 5분 — 예전 클라이언트 재조회 간격과 같고, 무인증 한도 안에 든다 */
export const revalidate = 300;

/** 커밋 시각 목록. 오늘치는 보통 한 번이면 끝난다 (최대 300개) */
async function timesSince(repo: string, since: string): Promise<string[]> {
  const out: string[] = [];
  for (let page = 1; page <= 3; page++) {
    const res = await get(
      `/repos/${repo}/commits?since=${encodeURIComponent(since)}&per_page=100&page=${page}`,
    );
    const data = (await res.json()) as {
      commit: { committer?: { date?: string }; author?: { date?: string } };
    }[];
    for (const c of data) {
      const t = c.commit.committer?.date ?? c.commit.author?.date;
      if (t) out.push(t);
    }
    if (data.length < 100) break;
  }
  return out;
}

export async function GET() {
  const date = todayKst();
  const repos = getProjects()
    .map((p) => repoOf(p.repoUrl))
    .filter((r): r is string => r !== null);

  try {
    const midnight = `${date}T00:00:00+09:00`;
    const weekStart = `${addDays(date, -(HEATMAP_DAYS - 1))}T00:00:00+09:00`;
    const pairs = await Promise.all(
      repos.map(async (repo) =>
        Promise.all([timesSince(repo, midnight), countSince(repo, weekStart)]),
      ),
    );
    const times = pairs.flatMap(([t]) => t);
    const body: LiveCounts = {
      date,
      today: times.length,
      week: pairs.reduce((n, [, w]) => n + w, 0),
      row: hourHistogram(times),
    };
    return Response.json(body);
  } catch (e) {
    // 못 세면 화면은 파이프라인 저장값을 그대로 쓴다 — 여기서 502를 내면
    // 캐시가 그 실패를 5분간 물고 있으므로, 200으로 "없다"고만 알린다
    return Response.json(
      { date, error: e instanceof Error ? e.message : "unknown" },
      { headers: { "cache-control": "public, s-maxage=30" } },
    );
  }
}
