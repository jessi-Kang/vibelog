import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/shell";
import { LangProvider, T } from "@/components/lang";
import { getDevlogs, getProjects, getShorts } from "@/lib/content";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "vibelog",
    template: "%s · vibelog",
  },
  description:
    "바이브 코딩으로 만드는 서비스들의 제작기. 데브로그는 매일 밤 커밋에서 자동으로 만들어집니다.",
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
      <body className="flex min-h-dvh flex-col bg-bg font-sans text-ink">
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
          <div className="mx-auto flex max-w-[430px] justify-between gap-3 px-5 pb-6 pt-4 font-mono text-xs text-muted md:max-w-[1120px] md:px-6 md:pb-7 md:pt-5 lg:px-8">
            <a
              href="mailto:jihyun.kang@me.com"
              className="hit text-muted transition-colors duration-150 hover:text-ink"
            >
              © 2026 Jessi
            </a>
            <a
              href="https://github.com/jessi-Kang/vibelog"
              target="_blank"
              rel="noopener noreferrer"
              className="hit text-muted transition-colors duration-150 hover:text-ink"
            >
              github ↗
            </a>
          </div>
        </footer>
        </LangProvider>
      </body>
    </html>
  );
}
