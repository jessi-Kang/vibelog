/**
 * 프로젝트 상세의 실시간 수치 — 누적 커밋·이번 주 커밋·최신 커밋 시각.
 *
 * 전에는 방문자 브라우저가 GitHub 공개 API를 직접 불렀다. 비공개 레포는 토큰 없이는
 * 404라 상세 페이지 숫자가 늘 밤에 저장해 둔 값에 머물렀다. 서버가 토큰으로 읽어 나눠 준다.
 * 등록된 프로젝트만 받는다 — 아무 레포나 물어보는 통로가 되면 우리 토큰으로 남의
 * 비공개 레포를 들여다보는 길이 된다.
 */
import { HEATMAP_DAYS, addDays, todayKst } from "@/lib/commit-hours";
import { getProject } from "@/lib/content";
import { hasDb } from "@/lib/db";
import { viewer } from "@/lib/session";
import { ghGet, humanTimesSince, humanTotal, repoOf } from "@/lib/github-server";

export interface RepoStats {
  total: number;
  week: number;
  /** 최신 커밋 시각 (ISO) */
  latest?: string;
}

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  // 숨긴 프로젝트는 관리자에게만 — 그 응답은 공용 캐시에 두지 않는다
  let project = getProject(slug);
  let privateOnly = false;
  if (!project && hasDb() && (await viewer())?.isAdmin) {
    project = getProject(slug, { all: true });
    privateOnly = Boolean(project);
  }
  const repo = repoOf(project?.repoUrl ?? "");
  if (!repo) return Response.json({ error: "unknown project" }, { status: 404 });

  try {
    // "이번 주"는 홈 통계·잔디와 같은 창 — 오늘 포함 7일, KST 자정 기준
    const weekStart = `${addDays(todayKst(), -(HEATMAP_DAYS - 1))}T00:00:00+09:00`;
    // 커밋 수는 사람 커밋만 — 홈 통계와 같은 기준 (lib/bot-commit.ts)
    const [latestRes, week, total] = await Promise.all([
      ghGet(`/repos/${repo}/commits?per_page=1`),
      humanTimesSince(repo, weekStart),
      humanTotal(repo),
    ]);
    const latest = (await latestRes.json()) as {
      commit?: { committer?: { date?: string }; author?: { date?: string } };
    }[];
    const body: RepoStats = {
      total,
      week: week.length,
      latest: latest[0]?.commit?.committer?.date ?? latest[0]?.commit?.author?.date,
    };
    // 5분 — 홈 /api/commits와 같은 간격. 방문자 수와 무관하게 GitHub 요청이 일정하다
    return Response.json(body, {
      headers: {
        "cache-control": privateOnly ? "private, no-store" : "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (e) {
    // 못 세면 화면은 저장값을 그대로 쓴다. 실패는 짧게만 캐시한다. 이유(토큰 권한 등)는
    // 응답이 아니라 함수 로그에만 남긴다
    console.error(`[repo-stats] ${slug}: ${e instanceof Error ? e.message : e}`);
    return Response.json(
      { error: "unavailable" },
      { status: 502, headers: { "cache-control": "public, s-maxage=30" } },
    );
  }
}
