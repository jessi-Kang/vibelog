"use client";
/**
 * MediaLightbox — 스크린샷·쇼츠용 레이어 팝업.
 * 데스크톱(md+): 어두운 스크림 위 중앙 패널. 모바일: 풀스크린.
 * 영상은 팝업 안에서 KO/EN 전환(양쪽 소스가 있을 때).
 * 닫기: ✕ 버튼 · ESC · 스크림 클릭. 열려 있는 동안 페이지 스크롤 잠금.
 */
import { useEffect, useRef, useState } from "react";
import { useLang } from "./lang";

export type LightboxMedia =
  | { kind: "image"; src: string; label: string }
  | {
      kind: "video";
      sources: { ko?: string; en?: string };
      lang?: "ko" | "en";
      label: string;
    };

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

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prev;
    };
  }, [onClose]);

  const videoSrc =
    media.kind === "video"
      ? (media.sources[lang] ?? media.sources.ko ?? media.sources.en)
      : undefined;
  const bothLangs =
    media.kind === "video" && Boolean(media.sources.ko && media.sources.en);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={media.label}
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col bg-bg-deep/90"
    >
      {/* 컨트롤은 영상 위에 띄우지 않는다 — 상단 전용 바로 분리해서
          쇼츠 상단(VIBELOG · DAY 배지)을 가리지 않는다 (Jessi 지시) */}
      <div className="flex flex-none items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        {bothLangs ? (
          <div
            aria-label={site.lang === "en" ? "Video language" : "영상 언어"}
            onClick={(e) => e.stopPropagation()}
            className="flex gap-1 rounded-md border border-line bg-panel p-1"
          >
            {(["ko", "en"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={lang === v}
                onClick={() => setLang(v)}
                className={`min-h-7 cursor-pointer rounded-[7px] px-2.5 font-sans text-sm font-bold transition-colors duration-150 ${
                  lang === v ? "bg-panel2 text-ink" : "text-muted hover:text-ink-soft"
                }`}
              >
                {v.toUpperCase()}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}
        <button
          ref={closeRef}
          type="button"
          aria-label={site.lang === "en" ? "Close" : "닫기"}
          onClick={onClose}
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-md border border-line bg-panel font-mono text-sm font-bold text-ink-soft transition-colors duration-150 hover:bg-panel2"
        >
          ✕
        </button>
      </div>
      {/* 영상 영역 = 바 아래 남은 공간 전부 — 어떤 화면 비율에서도 겹침 없음 */}
      <div className="flex min-h-0 flex-1 items-center justify-center pb-[max(0.5rem,env(safe-area-inset-bottom))] md:p-6 md:pt-2">
        {media.kind === "video" ? (
          <video
            key={videoSrc}
            src={videoSrc}
            controls
            autoPlay
            playsInline
            onClick={(e) => e.stopPropagation()}
            className="h-full max-h-full w-full bg-bg-deep object-contain md:aspect-[9/16] md:w-auto md:rounded-lg md:border md:border-line"
          />
        ) : (
          // 폰 풀페이지 캡처는 세로로 매우 길다 — 팝업 안에서 세로 스크롤로 전체를 본다
          <div
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full overflow-y-auto overscroll-contain bg-bg md:max-h-full md:w-[390px] md:rounded-lg md:border md:border-line"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={media.src} alt={media.label} className="w-full" />
          </div>
        )}
      </div>
    </div>
  );
}
