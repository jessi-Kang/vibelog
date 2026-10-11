"use client";
/**
 * 프로젝트 상세의 실시간 수치 — 누적 커밋·이번 주 커밋·마지막 활동.
 * 우리 `/api/repo-stats`가 토큰으로 읽어 5분 캐시로 나눠 준다. 브라우저가 GitHub를
 * 직접 부르던 때는 비공개 레포가 늘 404였다 (10/11). 한 페이지의 수치 셋은 모듈
 * 캐시로 요청 하나를 같이 쓴다. 실패하면 파이프라인 저장값 폴백.
 */
import { useEffect, useState } from "react";
import type { RepoStats } from "@/app/api/repo-stats/route";
import { fmtNum, humanizeLastActive } from "@/lib/format";
import { useLang } from "./lang";

const cache = new Map<string, Promise<RepoStats>>();

async function fetchStats(slug: string): Promise<RepoStats> {
  const res = await fetch(`/api/repo-stats?slug=${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error(`repo-stats ${res.status}`);
  return (await res.json()) as RepoStats;
}

function useRepoStats(slug: string): RepoStats | null {
  const [stats, setStats] = useState<RepoStats | null>(null);
  useEffect(() => {
    let dead = false;
    if (!cache.has(slug)) cache.set(slug, fetchStats(slug));
    cache
      .get(slug)!
      .then((s) => {
        if (!dead) setStats(s);
      })
      .catch(() => {
        cache.delete(slug); // 다음 방문에서 재시도
      });
    return () => {
      dead = true;
    };
  }, [slug]);
  return stats;
}

/** 실시간 커밋 수 — total(누적) 또는 week(최근 7일). 로딩·실패 시 fallback */
export function LiveRepoStat({
  slug,
  kind,
  fallback,
}: {
  slug: string;
  kind: "total" | "week";
  fallback?: number;
}) {
  const stats = useRepoStats(slug);
  const n = stats ? stats[kind] : fallback;
  return (
    <span suppressHydrationWarning>{n != null ? fmtNum(n) : "—"}</span>
  );
}

/** 실시간 "마지막 활동" — 최신 커밋 시각 기준, 로딩·실패 시 저장값(iso) */
export function LiveLastActive({
  slug,
  iso,
}: {
  slug: string;
  iso: string;
}) {
  const { lang } = useLang();
  const stats = useRepoStats(slug);
  // 최신 커밋 시각(UTC ISO)을 KST 날짜로 — UTC로 자르면 밤 커밋이 "어제"가
  // 된다 (run.ts lastActivity와 같은 보정)
  const latestKst = stats?.latest
    ? new Date(new Date(stats.latest).getTime() + 9 * 3600 * 1000).toISOString()
    : iso;
  return (
    <span suppressHydrationWarning>{humanizeLastActive(latestKst, lang)}</span>
  );
}
