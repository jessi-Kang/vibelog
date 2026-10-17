"use client";
/**
 * 관리자 화면 — 로그인한 관리자에게만 숨긴 프로젝트(topic vibelog-hidden)의 원래 카드·글·쇼츠와
 * 가리지 않은 지난 실행을 끼워 넣는다. 방문자 화면은 미리 만든 그대로다 (app/api/private).
 *
 * 관리자인지는 머리글 종이 이미 묻는 /api/notifications의 admin으로 안다 — 방문자마다 요청을
 * 하나 더 보내지 않으려는 것이다. 한 페이지의 여러 칸이 같은 요청 하나를 나눠 쓴다.
 */
import { useEffect, useState } from "react";
import type { Project, RunLog, ShortsMeta } from "@/lib/content";
import { fetchNotes } from "./notify-bell";
import { useLang } from "./lang";

export interface PrivateDevlog {
  repo: string;
  date: string;
  dateShort: string;
  title: string;
  titleEn?: string;
  summary?: string;
  summaryEn?: string;
  commits?: number;
  prs?: number;
  intro?: boolean;
  hasFail?: boolean;
  short?: boolean;
  href: string;
}

export interface PrivateData {
  projects: Project[];
  devlogs: PrivateDevlog[];
  shorts: (ShortsMeta & { title: string; titleEn?: string; href?: string })[];
  run: RunLog | null;
}

let shared: Promise<PrivateData | null> | null = null;

function load(): Promise<PrivateData | null> {
  shared ??= fetchNotes()
    .then((n) =>
      n?.admin
        ? fetch("/api/private", { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<PrivateData>) : null))
        : null,
    )
    .catch(() => null);
  return shared;
}

/** 관리자면 숨긴 내용, 아니면 null (방문자 화면은 그대로) */
export function usePrivate(): PrivateData | null {
  const [data, setData] = useState<PrivateData | null>(null);
  useEffect(() => {
    let dead = false;
    void load().then((d) => {
      if (!dead) setData(d);
    });
    return () => {
      dead = true;
    };
  }, []);
  return data;
}

/** "숨김" 칩 — 지금 방문자에게는 안 보인다는 것만 알린다 (시안 docs/project-status-and-private.html) */
export function HiddenChip() {
  const { lang } = useLang();
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-line-strong px-1.5 py-px font-sans text-2xs font-medium leading-normal text-muted">
      {lang === "en" ? "hidden" : "숨김"}
    </span>
  );
}
