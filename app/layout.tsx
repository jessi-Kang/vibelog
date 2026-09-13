import { ldJson } from "@/lib/ld-json";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/shell";
import { InstallAppLink, InstallToast } from "@/components/install-app";
import { LangProvider, T } from "@/components/lang";
import { ShareLink } from "@/components/share";
import { ServiceWorker } from "@/components/service-worker";
import { getDevlogs, getProjects, getShorts } from "@/lib/content";
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

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&family=JetBrains+Mono:wght@500;700&display=swap"
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
              projects: getProjects().length,
              devlogs: getDevlogs().length,
              // 쇼츠 페이지 그리드와 같은 수 — 쇼츠 전부 + 인트로 카드 1
              shorts: getShorts().length + 1,
            }}
          />
          {children}
          <footer className="border-t border-line">
            <div className="mx-auto flex max-w-[430px] justify-between gap-3 px-5 pb-6 pt-4 max-[359px]:px-4 font-mono text-xs text-muted md:max-w-[1120px] md:px-6 md:pb-7 md:pt-5 lg:px-8">
              <a
                href="mailto:jihyun.kang@me.com"
                className="hit text-muted transition-colors duration-150 hover:text-ink"
              >
                © 2026 Jessi
              </a>
              <span className="flex items-center">
                <ShareLink />
                <InstallAppLink />
                <a
                  href="https://github.com/jessi-Kang/vibelog"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  className="hit -my-2.5 flex p-2.5 text-muted transition-colors duration-150 hover:text-ink"
                >
                  <svg
                    aria-hidden
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2.17c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.14v3.18c0 .31.2.67.8.55A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5z" />
                  </svg>
                </a>
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
      </body>
    </html>
  );
}
