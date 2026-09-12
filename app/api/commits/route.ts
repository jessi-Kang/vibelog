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

/** 5분 — 예전 클라이언트 재조회 간격과 같고, 무인증 한도 안에 든다 */
export const revalidate = 300;

const API = "https://api.github.com";

const TOKEN = process.env.GH_PAT || process.env.GITHUB_TOKEN;

function headers(withToken: boolean): HeadersInit {
  return {
    accept: "application/vnd.github+json",
    ...(withToken && TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
  };
}

function repoOf(repoUrl: string): string | null {
  return repoUrl.match(/github\.com\/([^/]+\/[^/]+)/)?.[1] ?? null;
}

async function get(path: string): Promise<Response> {
  const url = `${API}${path}`;
  const res = await fetch(url, {
    headers: headers(true),
    signal: AbortSignal.timeout(8000),
  });
  if (res.ok) return res;
  // 토큰이 만료·오설정이면 401/403이 온다. 우리 레포는 public이라 토큰 없이도
  // 읽히므로 한 번 더 맨손으로 물어본다 — 잘못된 토큰 하나가 기능을 죽이면 안 된다
  if (TOKEN && (res.status === 401 || res.status === 403)) {
    const plain = await fetch(url, {
      headers: headers(false),
      signal: AbortSignal.timeout(8000),
    });
    if (plain.ok) return plain;
    throw new Error(`GitHub ${res.status}/${plain.status} ${path}`);
  }
  throw new Error(`GitHub ${res.status} ${path}`);
}

/** per_page=1의 Link 헤더 마지막 페이지 번호가 총 개수 (collect.ts와 같은 기법) */
async function countSince(repo: string, since: string): Promise<number> {
  const res = await get(
    `/repos/${repo}/commits?since=${encodeURIComponent(since)}&per_page=1`,
  );
  const last = res.headers.get("link")?.match(/[?&]page=(\d+)>;\s*rel="last"/);
  if (last) return Number(last[1]);
  return ((await res.json()) as unknown[]).length;
}

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
