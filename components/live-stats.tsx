"use client";
/**
 * 프로젝트 상세의 실시간 수치 — 누적 커밋·이번 주 커밋·마지막 활동을
 * 방문자 브라우저가 GitHub 공개 API로 직접 읽는다 (홈 통계와 같은 방식,
 * Jessi 지시: 상세도 실시간). 레포당 요청 2개(전체 1 + 주간 1)를 모듈
 * 캐시로 공유해 한 페이지의 수치 셋이 중복 요청을 만들지 않는다.
 * 실패(레이트 리밋·오프라인·private)하면 파이프라인 저장값 폴백.
 */
import { useEffect, useState } from "react";
import { fmtNum, humanizeLastActive } from "@/lib/format";
import { useLang } from "./lang";

interface RepoStats {
  total: number;
  week: number;
  /** 최신 커밋 시각 (ISO) */
  latest?: string;
}

const cache = new Map<string, Promise<RepoStats>>();

function countFromLink(res: Response, bodyLen: number): number {
  const m = res.headers.get("link")?.match(/[?&]page=(\d+)>; rel="last"/);
  return m ? Number(m[1]) : bodyLen;
}

async function fetchStats(repoUrl: string): Promise<RepoStats> {
  const m = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/);
  if (!m) throw new Error("repoUrl 형식 오류");
  const base = `https://api.github.com/repos/${m[1]}/commits`;
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const [allRes, weekRes] = await Promise.all([
    fetch(`${base}?per_page=1`),
    fetch(`${base}?since=${encodeURIComponent(weekAgo)}&per_page=1`),
  ]);
  if (!allRes.ok || !weekRes.ok) throw new Error("github api");
  const allBody = (await allRes.json()) as {
    commit?: { committer?: { date?: string }; author?: { date?: string } };
  }[];
  const weekBody = (await weekRes.json()) as unknown[];
  return {
    total: countFromLink(allRes, allBody.length),
    week: countFromLink(weekRes, weekBody.length),
    latest:
      allBody[0]?.commit?.committer?.date ?? allBody[0]?.commit?.author?.date,
  };
}

function useRepoStats(repoUrl: string): RepoStats | null {
  const [stats, setStats] = useState<RepoStats | null>(null);
  useEffect(() => {
    let dead = false;
    if (!cache.has(repoUrl)) cache.set(repoUrl, fetchStats(repoUrl));
    cache
      .get(repoUrl)!
      .then((s) => {
        if (!dead) setStats(s);
      })
      .catch(() => {
        cache.delete(repoUrl); // 다음 방문에서 재시도
      });
    return () => {
      dead = true;
    };
  }, [repoUrl]);
  return stats;
}

/** 실시간 커밋 수 — total(누적) 또는 week(최근 7일). 로딩·실패 시 fallback */
export function LiveRepoStat({
  repoUrl,
  kind,
  fallback,
}: {
  repoUrl: string;
  kind: "total" | "week";
  fallback?: number;
}) {
  const stats = useRepoStats(repoUrl);
  const n = stats ? stats[kind] : fallback;
  return (
    <span suppressHydrationWarning>{n != null ? fmtNum(n) : "—"}</span>
  );
}

/** 실시간 "마지막 활동" — 최신 커밋 시각 기준, 로딩·실패 시 저장값(iso) */
export function LiveLastActive({
  repoUrl,
  iso,
}: {
  repoUrl: string;
  iso: string;
}) {
  const { lang } = useLang();
  const stats = useRepoStats(repoUrl);
  // 최신 커밋 시각(UTC ISO)을 KST 날짜로 — UTC로 자르면 밤 커밋이 "어제"가
  // 된다 (run.ts lastActivity와 같은 보정)
  const latestKst = stats?.latest
    ? new Date(new Date(stats.latest).getTime() + 9 * 3600 * 1000).toISOString()
    : iso;
  return (
    <span suppressHydrationWarning>{humanizeLastActive(latestKst, lang)}</span>
  );
}
