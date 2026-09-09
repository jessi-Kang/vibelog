"use client";
/**
 * Shell — 핸드오프 ui_kits/blog/Shell.jsx 재구현.
 * 모바일(<720): 헤더 2줄(워드마크 / 풀폭 탭), 상세에서는 1줄이 ← 경로로.
 * 태블릿·데스크톱: 한 줄(워드마크 | 탭), 상세 뒤로는 헤더 아래 줄.
 * "다음 실행 23:00" 표시는 제거 — 경로와 붙어 헷갈리고 꼭 필요하지 않다 (Jessi 지시).
 */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Wordmark } from "./ui";

const TABS = [
  { href: "/", label: "프로젝트" },
  { href: "/log", label: "데브로그" },
  { href: "/shorts", label: "쇼츠" },
];

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
  const tab = post || pathname.startsWith("/log") ? "/log" : pathname.startsWith("/shorts") ? "/shorts" : "/";
  return { detail, crumb, tab: project ? "/" : tab };
}

function Tabs({ active }: { active: string }) {
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
            className={`hit flex min-h-9 flex-1 items-center justify-center text-sm font-bold transition-colors duration-150 md:flex-none ${on ? "text-ink" : "text-muted hover:text-ink-soft"}`}
          >
            <span className="relative py-1">
              {t.label}
              {on && (
                <span className="absolute -bottom-0.5 left-0 right-0 h-[2px] rounded-full bg-accent" />
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

export function SiteHeader() {
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
          </div>
          <div className={`${detail ? "hidden md:flex" : "flex"} items-center gap-4`}>
            <Tabs active={tab} />
          </div>
        </div>
      </header>
      {detail && (
        <div className="mx-auto hidden w-full max-w-[1120px] px-6 pt-[18px] md:block lg:px-8">
          <BackRow crumb={crumb} />
        </div>
      )}
    </>
  );
}
