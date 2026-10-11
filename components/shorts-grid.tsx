"use client";
/** 쇼츠 그리드 — 영상이 있으면 카드가 레이어 팝업으로 재생, 없으면 글로 이동 */
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useLang } from "./lang";
import type { ShortsMeta } from "@/lib/content";
import { fmtShort } from "@/lib/format";
import { MediaLightbox, type LightboxMedia } from "./lightbox";
import { postPath } from "@/lib/post-id";

/** 9:16 쇼츠 썸네일 — 쇼츠 페이지와 글 상세가 같은 문법을 쓴다 (영상 훅 프레임의 포스터) */
export interface ThumbData {
  day?: number;
  /** eyebrow의 day NN 자리를 대신할 텍스트 (인트로 카드 등) */
  tag?: string;
  hook: string;
  hookKeywords: string[];
  template: string;
  duration?: number;
  /** 영상 첫 프레임 이미지 URL — 있으면 CSS 재현 대신 이걸 쓴다 (Jessi 지시) */
  poster?: string;
}

/**
 * 호버 시 재생 표시 — "이건 영상"이라는 신호. 정지 상태에선 조용히.
 * 글자 "▶"는 기기마다 글꼴이 달라 모양·자리가 흔들려서 Tabler player-play-filled로 바꿨다
 * (10/11 Jessi, 시안 B — 민트 원판). 삼각형은 상자 가운데가 아니라 무게중심을 원 가운데에
 * 맞춘다 — 상자로 맞추면 왼쪽으로 쏠려 보인다. translate 0.9는 4배 화면에서 잰 값이다.
 */
function PlayOverlay() {
  return (
    <div className="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-ink shadow-[0_2px_10px_rgba(0,0,0,.35)]">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <path
            transform="translate(0.9 0)"
            fill="currentColor"
            d="M6 4v16a1 1 0 0 0 1.524.852l13-8a1 1 0 0 0 0-1.704l-13-8A1 1 0 0 0 6 4"
          />
        </svg>
      </span>
    </div>
  );
}

export function Thumb({ s }: { s: ThumbData }) {
  // 진짜 포스터(영상 첫 프레임)가 있으면 그대로 — 훅 문장·길이가 이미 프레임에 있다
  if (s.poster) {
    return (
      <div className="relative aspect-[9/16] overflow-hidden rounded-lg border border-line bg-bg-deep transition-colors duration-150 group-hover:border-line-strong">
        {/* 원본(1080px)을 카드 크기로 미리 줄여 받는다 — 브라우저가 한 번에 크게 줄이면 글자가 깨졌다 */}
        <Image
          src={s.poster}
          alt=""
          fill
          sizes="(min-width: 1024px) 280px, (min-width: 640px) 33vw, 50vw"
          className="object-cover"
        />
        <PlayOverlay />
      </div>
    );
  }
  return (
    <div
      className="relative aspect-[9/16] overflow-hidden rounded-lg border border-line bg-bg-deep transition-colors duration-150 group-hover:border-line-strong"
      style={{
        backgroundImage:
          "radial-gradient(60% 40% at 50% 0%, rgba(94,225,195,.10), transparent 70%)",
      }}
    >
      <div className="absolute left-3 right-3 top-3 font-mono text-[8px] font-bold uppercase tracking-[.08em] text-muted">
        <b className="text-accent">vibelog</b> ·{" "}
        {s.tag ?? `day ${String(s.day ?? 1).padStart(2, "0")}`}
      </div>
      <div className="absolute left-3.5 right-3.5 top-[38%] text-left text-[17px] font-black leading-[1.15] tracking-[-.01em] [text-wrap:balance]">
        {s.hook.split(/\s+/).map((w, i) => (
          <span key={i} className={s.hookKeywords.includes(w) ? "text-accent" : ""}>
            {w}{" "}
          </span>
        ))}
      </div>
      <PlayOverlay />
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
  introEnSrc,
}: {
  shorts: ShortsMeta[];
  introSrc?: string;
  /** 인트로 영어판 — 있으면 팝업에 KO/EN 토글이 뜬다 */
  introEnSrc?: string;
}) {
  const { lang } = useLang(); // 전역 설정 — 재생 언어·썸네일·라벨이 따라간다
  const en = lang === "en";
  const [media, setMedia] = useState<LightboxMedia | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
        {shorts.map((s) => {
          const href = postPath(s);
          // EN이면 영어 훅 프레임 썸네일 — 아직 없으면(구버전) ko 폴백
          const data = {
            ...s,
            poster: en
              ? (s.media?.posterEn ?? s.media?.poster)
              : s.media?.poster,
          };
          return (
            <div key={`${s.repo}/${s.date}`} className="flex flex-col gap-2">
              {/* 한쪽 언어 업로드만 성공해도 재생은 가능해야 한다 — 팝업이 있는 쪽으로 폴백 */}
              {s.media?.ko || s.media?.en ? (
                <button
                  type="button"
                  aria-label={en ? `Play short: ${s.title}` : `${s.title} 쇼츠 재생`}
                  onClick={() =>
                    setMedia({
                      kind: "video",
                      sources: s.media ?? {},
                      lang,
                      label: en ? `Short: ${s.title}` : `${s.title} 쇼츠`,
                    })
                  }
                  className="group cursor-pointer p-0 text-left"
                >
                  <Thumb s={data} />
                </button>
              ) : (
                <Link href={href} className="group">
                  <Thumb s={data} />
                </Link>
              )}
              {/* 제목은 썸네일(훅 문장)과 중복이라 뺀다 — 메타 줄이 글로 가는 링크 */}
              <Link
                href={href}
                className="font-mono text-2xs text-muted transition-colors duration-150 hover:text-ink-soft"
              >
                {/* 레포명은 썸네일 상단(vibelog · day NN)이 이미 말한다 */}
                {fmtShort(s.date)} · {en ? "read the post →" : "글 보기 →"}
              </Link>
            </div>
          );
        })}
        {introSrc && (
          // 채널 인트로는 맨 끝 — 새로 만들어진 쇼츠가 항상 왼쪽에 온다 (Jessi 지시)
          <div className="flex flex-col gap-2">
            <button
              type="button"
              aria-label={en ? "Play vibelog intro" : "vibelog 인트로 재생"}
              onClick={() =>
                setMedia({
                  kind: "video",
                  sources: { ko: introSrc, ...(introEnSrc ? { en: introEnSrc } : {}) },
                  lang,
                  label: en ? "vibelog intro" : "vibelog 인트로",
                })
              }
              className="group cursor-pointer p-0 text-left"
            >
              <Thumb
                s={{
                  tag: "intro",
                  hook: en ? "A record of things being built" : "만들고 있는 것들의 기록",
                  hookKeywords: en ? ["record"] : ["기록"],
                  template: "intro",
                  duration: en ? 33 : 36,
                  // EN이면 영어판 첫 프레임
                  poster: en && introEnSrc ? "/shorts/intro.en.jpg" : "/shorts/intro.jpg",
                }}
              />
            </button>
            {/* 길이는 썸네일 하단 타이머가 이미 말한다 */}
            <div className="font-mono text-2xs text-muted">
              {en ? "channel intro" : "채널 소개"}
            </div>
          </div>
        )}
      </div>

      {media && <MediaLightbox media={media} onClose={() => setMedia(null)} />}
    </>
  );
}
