import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "vibelog",
    template: "%s · vibelog",
  },
  description:
    "바이브 코딩 프로젝트들의 제작기·현황을 자동 발행하는 블로그. 커밋이 곧 콘텐츠.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&family=JetBrains+Mono:wght@500;700&display=swap"
        />
      </head>
      <body className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5">
        <header className="flex items-baseline justify-between py-8">
          <Link href="/" className="text-xl font-black tracking-tight">
            vibe<span className="text-accent">log</span>
          </Link>
          <nav className="flex gap-5 font-mono text-sm text-muted">
            <Link href="/" className="transition-colors hover:text-ink">
              projects
            </Link>
            <Link href="/log" className="transition-colors hover:text-ink">
              log
            </Link>
          </nav>
        </header>
        <main className="flex-1 pb-16">{children}</main>
        <footer className="border-t border-line py-6 font-mono text-xs text-muted">
          © {new Date().getFullYear()} vibelog · Jessi
        </footer>
      </body>
    </html>
  );
}
