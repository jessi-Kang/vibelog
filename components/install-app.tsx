"use client";
/**
 * 푸터 "앱 설치" 링크 — 브라우저가 beforeinstallprompt로 설치 자격을
 * 알려온 경우에만 나타난다. 이미 설치했거나 미지원(iOS Safari 등)이면
 * 렌더 자체를 안 해서 푸터가 평소와 똑같다.
 */
import { useEffect, useState } from "react";
import { T } from "./lang";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppLink() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      // 기본 배너 대신 푸터 링크로 — 눌렀을 때만 설치 다이얼로그를 연다
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!installEvent) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await installEvent.prompt();
        const { outcome } = await installEvent.userChoice;
        // 수락이든 거절이든 이벤트는 1회용 — 다음 자격 판정 때 다시 나타난다
        if (outcome === "accepted") setInstallEvent(null);
      }}
      className="hit cursor-pointer font-mono text-xs text-muted transition-colors duration-150 hover:text-ink"
    >
      <T ko="앱 설치" en="install app" />
    </button>
  );
}
