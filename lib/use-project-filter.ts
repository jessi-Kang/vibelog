"use client";
/**
 * 목록의 프로젝트 필터를 주소(?project=apart)에 둔다.
 *
 * 필터가 화면 상태에만 있던 때는 거른 목록에서 글을 열었다 돌아오면 필터가 풀려 전체
 * 목록으로 돌아왔다. 주소에 두면 뒤로·새로 고침·공유 링크에서도 같은 목록이 열린다.
 * 바꿀 때는 기록을 쌓지 않고(replaceState) 주소만 바꾼다 — 칩을 누를 때마다 뒤로가 한
 * 칸씩 늘면 뒤로가 칩 사이를 오간다.
 */
import { useEffect, useState } from "react";
import { rememberFilter } from "./nav-memory";

export function useProjectFilter(valid: string[]): [string, (v: string) => void] {
  const [filter, setFilter] = useState("all");
  const key = valid.join(",");
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("project");
    if (p && key.split(",").includes(p)) setFilter(p);
  }, [key]);
  const pick = (v: string) => {
    setFilter(v);
    const url = new URL(window.location.href);
    if (v === "all") url.searchParams.delete("project");
    else url.searchParams.set("project", v);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    rememberFilter(url.pathname, url.search);
  };
  return [filter, pick];
}
