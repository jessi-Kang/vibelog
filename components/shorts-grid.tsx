"use client";
/** 쇼츠 그리드 — 영상이 있으면 카드가 레이어 팝업으로 재생, 없으면 글로 이동 */
import Link from "next/link";
import { useState } from "react";
import type { ShortsMeta } from "@/lib/content";
import { fmtShort } from "@/lib/format";
import { MediaLightbox, type LightboxMedia } from "./lightbox";

/** 9:16 쇼츠 썸네일 — 쇼츠 페이지와 글 상세가 같은 문법을 쓴다 */
export interface ThumbData {
  day: number;
  hook: string;
  hookKeywords: string[];
  template: string;
  duration?: number;
}

export function Thumb({ s }: { s: ThumbData }) {
  return (
    <div
      className="relative aspect-[9/16] overflow-hidden rounded-lg border border-line bg-bg-deep transition-colors duration-150 group-hover:border-line-strong"
      style={{
        backgroundImage:
          "radial-gradient(60% 40% at 50% 0%, rgba(94,225,195,.10), transparent 70%)",
      }}
    >
      <div className="absolute left-3 right-3 top-3 font-mono text-[8px] font-bold uppercase tracking-[.08em] text-muted">
        <b className="text-accent">vibelog</b> · day{" "}
        {String(s.day).padStart(2, "0")}
      </div>
      <div className="absolute left-3.5 right-3.5 top-[38%] text-left text-[17px] font-black leading-[1.15] tracking-[-.01em] [text-wrap:balance]">
        {s.hook.split(/\s+/).map((w, i) => (
          <span key={i} className={s.hookKeywords.includes(w) ? "text-accent" : ""}>
            {w}{" "}
          </span>
        ))}
      </div>
      <div className="absolute bottom-3 left-3 right-3 flex justify-between font-mono text-[9px] uppercase tracking-[.06em] text-muted">
        <span>{s.template}</span>
        <span>
          ▶ {s.duration ? `0:${String(s.duration).padStart(2, "0")}` : "—"}
        </span>
      </div>
    </div>
  );
}

export function ShortsGrid({
  shorts,
  introSrc,
}: {
  shorts: ShortsMeta[];
  introSrc?: string;
}) {
  const [media, setMedia] = useState<LightboxMedia | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
        {introSrc && (
          // 고정 첫 카드 — 승인된 샘플 영상을 채널 인트로처럼 맨 앞에 둔다 (Jessi 지시)
          <div className="flex flex-col gap-2">
            <button
              type="button"
              aria-label="vibelog 인트로 재생"
              onClick={() =>
                setMedia({
                  kind: "video",
                  sources: { ko: introSrc },
                  label: "vibelog 인트로",
                })
              }
              className="group cursor-pointer p-0 text-left"
            >
              <div
                className="relative aspect-[9/16] overflow-hidden rounded-lg border border-line bg-bg-deep transition-colors duration-150 group-hover:border-line-strong"
                style={{
                  backgroundImage:
                    "radial-gradient(60% 40% at 50% 0%, rgba(94,225,195,.10), transparent 70%)",
                }}
              >
                <div className="absolute left-3 right-3 top-3 font-mono text-[8px] font-bold uppercase tracking-[.08em] text-muted">
                  <b className="text-accent">vibelog</b> · intro
                </div>
                <div className="absolute left-3.5 right-3.5 top-[38%] text-left text-[17px] font-black leading-[1.15] tracking-[-.01em] [text-wrap:balance]">
                  만들고 있는 것들의 <span className="text-accent">기록</span>
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex justify-between font-mono text-[9px] uppercase tracking-[.06em] text-muted">
                  <span>intro</span>
                  <span>▶ 0:37</span>
                </div>
              </div>
            </button>
            <div className="text-sm font-bold leading-snug [text-wrap:pretty]">
              vibelog 인트로
            </div>
            <div className="font-mono text-2xs text-muted">샘플 · 승인본</div>
          </div>
        )}
        {shorts.map((s) => {
          const href = `/log/${s.repo}/${s.date}`;
          return (
            <div key={`${s.repo}/${s.date}`} className="flex flex-col gap-2">
              {s.media?.ko ? (
                <button
                  type="button"
                  aria-label={`${s.title} 쇼츠 재생`}
                  onClick={() =>
                    setMedia({
                      kind: "video",
                      sources: s.media ?? {},
                      lang: "ko",
                      label: `${s.title} 쇼츠`,
                    })
                  }
                  className="group cursor-pointer p-0 text-left"
                >
                  <Thumb s={s} />
                </button>
              ) : (
                <Link href={href} className="group">
                  <Thumb s={s} />
                </Link>
              )}
              <Link
                href={href}
                className="text-sm font-bold leading-snug transition-colors duration-150 [text-wrap:pretty] hover:text-accent"
              >
                {s.title}
              </Link>
              <div className="font-mono text-2xs text-muted">
                {s.repo} · {fmtShort(s.date)}
              </div>
            </div>
          );
        })}
      </div>

      {media && <MediaLightbox media={media} onClose={() => setMedia(null)} />}
    </>
  );
}
