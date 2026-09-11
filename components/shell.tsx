"use client";
/**
 * Shell — 핸드오프 ui_kits/blog/Shell.jsx 재구현.
 * 모바일(<720): 헤더 1줄(워드마크 — 상세에서는 ← 경로) + 하단 고정 탭바.
 *   앱처럼 엄지 닿는 곳에 메뉴를 (Jessi 지시). 상세에서도 탭바는 유지.
 * 태블릿·데스크톱: 한 줄(워드마크 | 탭), 상세 뒤로는 헤더 아래 줄.
 * "다음 실행 23:00" 표시는 제거 — 경로와 붙어 헷갈리고 꼭 필요하지 않다 (Jessi 지시).
 */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LangSwitch, useLang } from "./lang";
import { Wordmark } from "./ui";

const TABS = [
  { href: "/", ko: "프로젝트", en: "Projects" },
  { href: "/log", ko: "데브로그", en: "Devlog" },
  { href: "/shorts", ko: "쇼츠", en: "Shorts" },
  { href: "/about", ko: "소개", en: "About" },
];

/** 메뉴 옆 개수 — 프로젝트·데브로그 (Jessi 지시). layout이 서버에서 세서 넘긴다 */
export interface TabCounts {
  projects?: number;
  devlogs?: number;
  shorts?: number;
}

function useRoute() {
  const pathname = usePathname();
  const project = pathname.match(/^\/projects\/([^/]+)/);
  const post = pathname.match(/^\/log\/([^/]+)\/([^/]+)/);
  const detail = Boolean(project || post);
  const crumb = project
    ? `projects / ${decodeURIComponent(project[1])}`
    : post
      ? `log / ${decodeURIComponent(post[1])} / ${post[2]}`
      : "";
  const tab =
    post || pathname.startsWith("/log")
      ? "/log"
      : pathname.startsWith("/shorts")
        ? "/shorts"
        : pathname.startsWith("/about")
          ? "/about"
          : "/";
  return { detail, crumb, tab: project ? "/" : tab };
}

function Tabs({
  active,
  counts,
  bottom,
}: {
  active: string;
  counts?: TabCounts;
  /** 모바일 하단 탭바 안 — 터치 타깃을 키운다 */
  bottom?: boolean;
}) {
  const { lang } = useLang();
  const countOf = (href: string) =>
    href === "/"
      ? counts?.projects
      : href === "/log"
        ? counts?.devlogs
        : href === "/shorts"
          ? counts?.shorts
          : undefined;
  // 페이지 이동 링크다 — tab 롤이 아니라 nav + aria-current가 맞다.
  // 박스 안에 박스(세그먼트 컨트롤)는 무겁다 — 텍스트 + 민트 언더라인의
  // 조용한 탭으로 (Jessi 지시, taste 패스)
  return (
    <nav aria-label="주요 메뉴" className="flex w-full items-center md:w-auto md:gap-7">
      {TABS.map((t) => {
        const on = t.href === active;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={`hit flex ${bottom ? "min-h-[60px] text-[15px]" : "min-h-9 text-sm"} flex-1 items-center justify-center font-bold transition-colors duration-150 md:flex-none ${
              on
                ? bottom
                  ? "text-accent" // 하단 탭바의 현재 위치는 민트로 — 한눈에 (Jessi: 잘 안 띈다)
                  : "text-ink"
                : "text-muted hover:text-ink-soft"
            }`}
          >
            <span className="relative py-1">
              {lang === "ko" ? t.ko : t.en}
              {countOf(t.href) != null && (
                <span className="ml-1 align-[2px] font-mono text-2xs font-medium text-muted">
                  {countOf(t.href)}
                </span>
              )}
              {on && (
                <span
                  className={`absolute left-0 right-0 rounded-full bg-accent ${bottom ? "-bottom-1 h-[3px]" : "-bottom-0.5 h-[2px]"}`}
                />
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function BackRow({ crumb }: { crumb: string }) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="뒤로"
        onClick={() => router.back()}
        className="hit grid h-8 w-8 cursor-pointer place-items-center rounded-md font-mono text-sm font-bold text-muted transition-colors duration-150 hover:bg-panel2"
      >
        ←
      </button>
      <span className="whitespace-nowrap font-mono text-xs text-muted">{crumb}</span>
    </div>
  );
}

export function SiteHeader({ counts }: { counts?: TabCounts }) {
  const { detail, crumb, tab } = useRoute();
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-bg">
        <div className="mx-auto flex max-w-[430px] flex-col gap-3 px-5 py-3 md:max-w-[1120px] md:flex-row md:items-center md:justify-between md:px-6 md:py-3.5 lg:px-8">
          <div className="flex min-h-8 items-center justify-between gap-4">
            {detail ? (
              <>
                <span className="md:hidden">
                  <BackRow crumb={crumb} />
                </span>
                <Link href="/" className="hidden md:block">
                  <Wordmark />
                </Link>
              </>
            ) : (
              <Link href="/">
                <Wordmark />
              </Link>
            )}
            {/* 전역 KO/EN — 모바일은 첫 줄 우측(상세에서도 보인다) */}
            <span className="md:hidden">
              <LangSwitch />
            </span>
          </div>
          {/* 상단 탭은 데스크톱만 — 모바일은 아래 고정 탭바가 담당 */}
          <div className="hidden items-center gap-4 md:flex md:gap-5">
            <Tabs active={tab} counts={counts} />
            <span className="hidden md:block">
              <LangSwitch />
            </span>
          </div>
        </div>
      </header>
      {/* 모바일 하단 탭바 — 홈 인디케이터 영역(safe-area)만큼 아래 여백.
          본문과 같은 배경이면 묻힌다 — 패널색 + 위쪽 그림자로 층을 분리 (Jessi 피드백) */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line-strong bg-panel pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_24px_rgba(5,8,12,0.55)] md:hidden">
        <div className="mx-auto max-w-[430px] px-2">
          <Tabs active={tab} counts={counts} bottom />
        </div>
      </div>
      {detail && (
        <div className="mx-auto hidden w-full max-w-[1120px] px-6 pt-[18px] md:block lg:px-8">
          <BackRow crumb={crumb} />
        </div>
      )}
    </>
  );
}
