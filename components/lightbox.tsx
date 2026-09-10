"use client";
/**
 * MediaLightbox — 스크린샷·쇼츠용 레이어 팝업.
 * 데스크톱(md+): 어두운 스크림 위 중앙 패널, 컨트롤은 패널 밖 모서리(항상 표시).
 * 모바일: 진짜 풀스크린. 컨트롤(닫기·한/영)은 오버레이로 떠 있다가 몇 초 뒤
 * 자동으로 사라지고, 화면을 탭하면 다시 나타난다 — 쇼츠 플랫폼과 같은 문법.
 * (상단 바로 분리하는 안은 풀스크린 몰입을 깨서 반려 — Jessi 지시)
 * 닫기: ✕ 버튼 · ESC · 스크림 클릭. 열려 있는 동안 페이지 스크롤 잠금.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useLang } from "./lang";

export type LightboxMedia =
  | { kind: "image"; src: string; label: string }
  | {
      kind: "video";
      sources: { ko?: string; en?: string };
      lang?: "ko" | "en";
      label: string;
    };

const UI_HIDE_MS = 2600;

export function MediaLightbox({
  media,
  onClose,
}: {
  media: LightboxMedia;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const site = useLang(); // aria 라벨용 — 재생 언어와는 별개
  const [lang, setLang] = useState<"ko" | "en">(
    media.kind === "video" ? (media.lang ?? "ko") : "ko",
  );

  // 모바일 오버레이 컨트롤 표시 상태 — 잠깐 보였다가 사라지고, 탭이 토글
  const [showUi, setShowUi] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pokeUi = useCallback(() => {
    setShowUi(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowUi(false), UI_HIDE_MS);
  }, []);

  useEffect(() => {
    closeRef.current?.focus();
    pokeUi();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prev;
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [onClose, pokeUi]);

  const videoSrc =
    media.kind === "video"
      ? (media.sources[lang] ?? media.sources.ko ?? media.sources.en)
      : undefined;
  const bothLangs =
    media.kind === "video" && Boolean(media.sources.ko && media.sources.en);

  // md 미만에서만 자동 숨김 — 데스크톱 컨트롤은 패널 밖이라 항상 표시
  const overlayCls = `${
    showUi ? "opacity-100" : "pointer-events-none opacity-0"
  } transition-opacity duration-300 md:pointer-events-auto md:opacity-100`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={media.label}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-bg-deep/90 md:items-center md:p-8"
    >
      {bothLangs && (
        <div
          aria-label={site.lang === "en" ? "Video language" : "영상 언어"}
          onClick={(e) => e.stopPropagation()}
          className={`absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-10 flex gap-1 rounded-md border border-line bg-panel/95 p-1 ${overlayCls}`}
        >
          {(["ko", "en"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={lang === v}
              onClick={() => {
                setLang(v);
                pokeUi();
              }}
              className={`min-h-7 cursor-pointer rounded-[7px] px-2.5 font-sans text-sm font-bold transition-colors duration-150 ${
                lang === v ? "bg-panel2 text-ink" : "text-muted hover:text-ink-soft"
              }`}
            >
              {v.toUpperCase()}
            </button>
          ))}
        </div>
      )}
      <button
        ref={closeRef}
        type="button"
        aria-label={site.lang === "en" ? "Close" : "닫기"}
        onClick={onClose}
        // 노치 폰 풀스크린에서 상태바 밑에 깔리지 않게 safe-area만큼 내린다
        className={`absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10 grid h-9 w-9 cursor-pointer place-items-center rounded-md border border-line bg-panel/95 font-mono text-sm font-bold text-ink-soft transition-colors duration-150 hover:bg-panel2 ${overlayCls}`}
      >
        ✕
      </button>
      {media.kind === "video" ? (
        <video
          key={videoSrc}
          src={videoSrc}
          controls
          autoPlay
          playsInline
          onClick={(e) => {
            e.stopPropagation();
            // 탭 = 컨트롤 다시 소환 (사라진 상태) / 이미 보이면 타이머만 연장
            pokeUi();
          }}
          className="h-full w-full bg-bg-deep object-contain md:aspect-[9/16] md:h-[85dvh] md:w-auto md:rounded-lg md:border md:border-line"
        />
      ) : (
        // 폰 풀페이지 캡처는 세로로 매우 길다 — 팝업 안에서 세로 스크롤로 전체를 본다
        <div
          onClick={(e) => {
            e.stopPropagation();
            pokeUi();
          }}
          className="h-full w-full overflow-y-auto overscroll-contain bg-bg md:h-auto md:max-h-[85dvh] md:w-[390px] md:rounded-lg md:border md:border-line"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={media.src} alt={media.label} className="w-full" />
        </div>
      )}
    </div>
  );
}
