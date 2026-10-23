import { Analytics } from "@vercel/analytics/next";
import { ldJson } from "@/lib/ld-json";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/shell";
import { InstallAppLink, InstallToast } from "@/components/install-app";
import { LangProvider, T } from "@/components/lang";
import { ShareLink } from "@/components/share";
import { ServiceWorker } from "@/components/service-worker";
import { getDevlogs, getProjectCards, getShorts } from "@/lib/content";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

// 설치된 앱 창·모바일 상태바 색을 사이트 배경과 맞춘다.
// viewportFit cover — 하단 탭바가 iPhone 홈 인디케이터 영역(safe-area)을 읽으려면 필요
export const viewport: Viewport = {
  themeColor: "#0A0E14",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": "/feed.xml" },
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

/** 블로그가 시작한 해 — 푸터는 "시작한 해–올해"로 적는다 (같은 해면 한 번만) */
const FIRST_YEAR = 2026;
// 빌드할 때 정해진다. 밤마다 발행 커밋이 다시 배포하므로 해가 바뀌면 하루 안에 따라간다.
// 연도는 KST로 센다 — UTC로 세면 1월 1일 오전 9시 전 빌드가 전년도로 남는다
const THIS_YEAR = new Date(Date.now() + 9 * 3600_000).getUTCFullYear();
const COPYRIGHT_YEARS = THIS_YEAR > FIRST_YEAR ? `${FIRST_YEAR}–${THIS_YEAR}` : `${FIRST_YEAR}`;

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;900&family=JetBrains+Mono:wght@500;700&display=swap"
        />
      </head>
      {/* 모바일 하단 여백 = 고정 탭바 높이 + safe-area — 푸터가 탭바에 안 가리게 */}
      <body className="flex min-h-dvh flex-col bg-bg pb-[calc(60px+env(safe-area-inset-bottom))] font-sans text-ink md:pb-0">
        <LangProvider>
          <a
            href="#main"
            className="sr-only z-50 rounded-md bg-panel2 font-mono text-xs text-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:px-3 focus:py-2"
          >
            <T ko="본문으로 건너뛰기" en="Skip to content" />
          </a>
          <SiteHeader
            counts={{
              projects: getProjectCards().length,
              devlogs: getDevlogs().length,
              // 쇼츠 **편수**만. 인트로 카드는 채널 소개지 쇼츠가 아니다.
              // 쇼츠 페이지에 프로젝트 필터가 붙으면서 탭의 "쇼츠 10"과
              // 필터의 "전체 9"가 나란히 어긋나 보였다 — 그때 +1이 인트로였다.
              // 이제 탭 = 필터 전체 = 프로젝트별 합으로 셋이 같은 수를 말한다.
              shorts: getShorts().length,
            }}
          />
          {children}
          <footer className="border-t border-line">
            <div className="mx-auto flex max-w-[430px] justify-between gap-3 px-5 pb-6 pt-4 max-[359px]:px-4 font-mono text-xs text-muted md:max-w-[1120px] md:px-6 md:pb-7 md:pt-5 lg:px-8">
              <a
                href="mailto:jihyun.kang@me.com"
                className="hit text-muted transition-colors duration-150 hover:text-ink"
              >
                © {COPYRIGHT_YEARS} Jessi
              </a>
              <span className="flex items-center">
                <ShareLink />
                <InstallAppLink />
              </span>
            </div>
          </footer>
          <InstallToast />
          <ServiceWorker />
        </LangProvider>
        <script
          type="application/ld+json"
          // 검색엔진용 사이트 요약 — 사람 눈에는 안 보인다
          dangerouslySetInnerHTML={{
            __html: ldJson({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "vibelog",
              url: SITE_URL,
              description:
                "바이브 코딩으로 만드는 서비스들의 제작기를 자동 발행하는 블로그",
              inLanguage: "ko",
              author: { "@type": "Person", name: "Jessi" },
            }),
          }}
        />
        {/* 방문 통계 (Vercel Web Analytics) — 쿠키를 쓰지 않는다. 글 끝 "이 이야기의
            앞뒤"를 만들기 전에 사람들이 글 끝까지 와서 다른 글로 넘어가는지부터 본다 (10/9) */}
        <Analytics />
      </body>
    </html>
  );
}
