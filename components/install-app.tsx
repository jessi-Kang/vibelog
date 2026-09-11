"use client";
/**
 * 푸터 "앱 설치" 링크 — 브라우저가 beforeinstallprompt로 설치 자격을
 * 알려온 경우에만 나타난다. 이미 설치했거나 미지원(iOS Safari 등)이면
 * 렌더 자체를 안 해서 푸터가 평소와 똑같다.
 *
 * 수락 후에는 "설치 중" 안내를 잠깐 보여준다 — 안드로이드는 수락해도
 * 백그라운드에서 앱을 만드느라 아이콘이 수십 초 뒤에 뜨는데, 버튼만
 * 사라지면 설치가 안 된 걸로 보인다 (Jessi 실사용 지적).
 */
import { useEffect, useRef, useState } from "react";
import { T } from "./lang";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppLink() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      // 기본 배너 대신 푸터 링크로 — 눌렀을 때만 설치 다이얼로그를 연다
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      // 설치 완료 — 링크도 "설치 중" 안내도 끝
      setInstallEvent(null);
      setInstalling(false);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (installing) {
    return (
      <span aria-live="polite" className="font-mono text-xs text-muted">
        <T
          ko="설치 중 — 잠시 후 홈 화면·앱 목록에 나타납니다"
          en="installing — check your home screen shortly"
        />
      </span>
    );
  }

  if (!installEvent) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        // 이벤트는 1회용 — 성공·거절·예외 어느 쪽이든 소진되므로 비운다.
        // 브라우저가 다시 자격을 판정하면 새 이벤트로 링크가 재등장한다.
        const ev = installEvent;
        setInstallEvent(null);
        try {
          await ev.prompt();
          const { outcome } = await ev.userChoice;
          if (outcome === "accepted") {
            setInstalling(true);
            // appinstalled가 안 오는 브라우저 대비 — 20초 뒤엔 안내를 접는다
            hideTimer.current = setTimeout(() => setInstalling(false), 20000);
          }
        } catch {
          // 소진된 이벤트 등 — 조용히 링크만 거둔다
        }
      }}
      className="hit cursor-pointer font-mono text-xs text-muted transition-colors duration-150 hover:text-ink"
    >
      <T ko="앱 설치" en="install app" />
    </button>
  );
}
