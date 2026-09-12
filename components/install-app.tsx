"use client";
/**
 * 앱 설치 안내 — 브라우저가 beforeinstallprompt로 설치 자격을 알려올 때만 나타난다.
 * 설치 확인창 자체는 브라우저(OS) 영역이라 꾸밀 수 없어서, 그 창을 부르는
 * 초대만 사이트 톤으로 만든다 (Jessi 요청).
 *
 * - InstallToast: 하단 슬림 토스트. 첫 방문 즉시 (Jessi 지시).
 *   "나중에"를 누르면 일주일 쉬고, 그다음 노출에는 "다시 보지 않기"를 준다
 *   — 두 번 거절한 사람에게 계속 묻지 않는다 (Jessi 지시).
 * - InstallAppLink: 푸터의 조용한 상시 진입점.
 * 둘 다 같은 이벤트를 쓰므로 모듈 단위로 한 번만 잡아 공유한다.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { T, useLang } from "./lang";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const LATER_KEY = "vibelog-install-later";
/** "나중에" 한 번 뒤 쉬는 기간 — 그다음엔 "다시 보지 않기"를 띄운다 */
const LATER_DAYS = 7;
const NEVER = Number.MAX_SAFE_INTEGER;

let deferred: BeforeInstallPromptEvent | null = null;
let wired = false;
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

function wire() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    // 브라우저 기본 배너 대신 우리 토스트로 — 자격만 받아 둔다
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

/** 설치 자격이 있으면 이벤트, 없으면 null (서버 렌더에서는 항상 null) */
function useInstallEvent() {
  return useSyncExternalStore(
    (cb) => {
      wire();
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => deferred,
    () => null,
  );
}

/** 설치 창을 연다. 이벤트는 1회용이라 성공·거절·예외 어느 쪽이든 소진된다 */
async function promptInstall(): Promise<"accepted" | "dismissed" | "error"> {
  const ev = deferred;
  if (!ev) return "error";
  deferred = null;
  notify();
  try {
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    return outcome;
  } catch {
    return "error";
  }
}

/** 미룬 기록 — until: 이때까지 안 띄운다, n: "나중에"를 누른 횟수 */
interface LaterState {
  until: number;
  n: number;
}

function readLater(): LaterState {
  if (typeof window === "undefined") return { until: 0, n: 0 };
  try {
    const raw = window.localStorage.getItem(LATER_KEY);
    if (!raw) return { until: 0, n: 0 };
    // 구버전은 타임스탬프 숫자 하나만 저장했다 — 한 번 미룬 것으로 친다
    if (/^\d+$/.test(raw)) return { until: Number(raw), n: 1 };
    const v = JSON.parse(raw) as Partial<LaterState>;
    return { until: Number(v.until) || 0, n: Number(v.n) || 0 };
  } catch {
    return { until: 0, n: 0 }; // 프라이빗 모드 등 — 저장 못 해도 동작에는 지장 없다
  }
}

function writeLater(v: LaterState): void {
  try {
    window.localStorage.setItem(LATER_KEY, JSON.stringify(v));
  } catch {}
}

export function InstallToast() {
  const ev = useInstallEvent();
  const [installing, setInstalling] = useState(false);
  const [hidden, setHidden] = useState(true);
  // 이미 한 번 미뤘으면 이번엔 "다시 보지 않기"를 준다
  const [askedOnce, setAskedOnce] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 미룬 기록은 클라이언트에서만 읽는다 (하이드레이션 불일치 방지)
  useEffect(() => {
    const { until, n } = readLater();
    setHidden(Date.now() < until);
    setAskedOnce(n >= 1);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (hidden || (!ev && !installing)) return null;

  const later = () => {
    // 첫 거절은 일주일만 쉰다. 두 번째(= "다시 보지 않기")는 영구.
    writeLater(
      askedOnce
        ? { until: NEVER, n: 2 }
        : { until: Date.now() + LATER_DAYS * 864e5, n: 1 },
    );
    setHidden(true);
  };

  const install = async () => {
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      // 안드로이드는 수락 뒤 백그라운드에서 앱을 만든다 — 그 사이 안내를 남긴다
      setInstalling(true);
      timer.current = setTimeout(() => setInstalling(false), 20000);
    } else {
      setHidden(true);
    }
  };

  return (
    <div
      role="region"
      aria-label="앱 설치"
      className="fixed inset-x-3 bottom-[calc(72px+env(safe-area-inset-bottom))] z-40 flex items-center gap-2 rounded-xl border border-line bg-panel/95 px-3 py-2.5 shadow-[0_10px_30px_rgba(5,8,12,0.55)] backdrop-blur-md motion-safe:animate-[vl-toast-in_220ms_ease-out] md:inset-x-auto md:bottom-4 md:right-4 md:w-[380px]"
    >
      <span aria-hidden className="flex-none font-mono text-sm font-bold text-ink">
        v<span className="text-accent">_</span>
      </span>
      {installing ? (
        <span aria-live="polite" className="flex-1 text-sm font-bold text-ink-soft">
          <T ko="설치 중 — 잠시 후 홈 화면에 나타납니다" en="installing — check your home screen" />
        </span>
      ) : (
        <>
          <span className="min-w-0 flex-1 text-sm font-bold text-ink">
            <T ko="앱으로 설치하기" en="Install as an app" />
          </span>
          <button
            type="button"
            onClick={later}
            className="hit h-8 flex-none cursor-pointer rounded-md px-2 text-xs font-bold text-muted transition-colors duration-150 hover:text-ink-soft"
          >
            {askedOnce ? (
              <T ko="다시 보지 않기" en="Don't show again" />
            ) : (
              <T ko="나중에" en="Later" />
            )}
          </button>
          <button
            type="button"
            onClick={install}
            className="hit h-8 flex-none cursor-pointer rounded-md bg-accent px-3.5 text-xs font-bold text-accent-ink transition-opacity duration-150 hover:opacity-90 active:scale-[.98]"
          >
            <T ko="설치" en="Install" />
          </button>
        </>
      )}
    </div>
  );
}

export function InstallAppLink() {
  const ev = useInstallEvent();
  const { lang } = useLang();
  if (!ev) return null;
  return (
    <button
      type="button"
      onClick={() => void promptInstall()}
      // 푸터의 세 링크는 같은 문법이어야 한다 — 하나만 글자면 이질적으로
      // 보이고, 설치 링크는 자격이 있을 때만 나타나서 줄이 들썩인다
      // (Jessi 지적). 아이콘으로 맞추면 나타나도 폭이 거의 안 변한다.
      aria-label={lang === "ko" ? "앱으로 설치" : "Install as an app"}
      className="hit -my-2.5 flex cursor-pointer p-2.5 text-muted transition-colors duration-150 hover:text-ink"
    >
      <svg
        aria-hidden
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3v12" />
        <path d="M7.5 10.5 12 15l4.5-4.5" />
        <path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" />
      </svg>
    </button>
  );
}
