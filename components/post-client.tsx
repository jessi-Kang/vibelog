"use client";
/**
 * 데브로그 본문 — KO/EN 탭, 고정 섹션 구조, 원료 git log.
 * 데스크톱(lg): 본문은 왼쪽 읽기 컬럼(≈680), 쇼츠 썸네일은 오른쪽 340px
 * 고정 레일 — 남는 좌우 여백을 미디어에 쓴다. 모바일·태블릿: 기존 세로 순서.
 */
import Link from "next/link";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MediaLightbox, type LightboxMedia } from "./lightbox";
import { Thumb } from "./shorts-grid";
import { Card, EmptyState } from "./ui";

export interface PostData {
  repo: string;
  date: string;
  dateLabel: string;
  title: string;
  titleEn?: string;
  day: number;
  commits?: number;
  prs?: number;
  shas?: [string, string][];
  sections: { did?: string; why?: string; fail?: string; next?: string };
  sectionsEn: { did?: string; why?: string; fail?: string; next?: string };
  hasEn: boolean;
  body: string; // 섹션 파싱 실패 시 폴백
  short?: {
    template: string;
    duration?: number;
    media?: { ko?: string; en?: string; poster?: string };
    hook?: string;
    hookKeywords?: string[];
  };
}

function Md({ children }: { children: string }) {
  return (
    <div className="text-md leading-[1.75] text-ink-soft [text-wrap:pretty] [&_a]:text-accent [&_code]:rounded-sm [&_code]:bg-panel2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[.9em] [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

function H({ warn, children }: { warn?: boolean; children: string }) {
  return (
    <h2 className={`m-0 mb-2 text-md font-bold ${warn ? "text-warn" : "text-ink"}`}>
      {children}
    </h2>
  );
}

export function PostClient({ post }: { post: PostData }) {
  const [lang, setLang] = useState<"ko" | "en">("ko");
  const [media, setMedia] = useState<LightboxMedia | null>(null);
  const en = lang === "en";
  const s = en ? post.sectionsEn : post.sections;
  const parsed = Boolean(post.sections.did || post.sections.why);
  const noFail = !s.fail || s.fail.startsWith("특별한 삽질은") || s.fail === "None.";

  const headings = en
    ? { did: "What I did", why: "Why", fail: "Rabbit holes", next: "Next up" }
    : { did: "뭘 했다", why: "왜", fail: "삽질 포인트", next: "다음 할 것" };

  const openShort = (v: "ko" | "en") =>
    setMedia({
      kind: "video",
      sources: post.short?.media ?? {},
      lang: v,
      label: `${post.title} 쇼츠`,
    });

  // 날짜·레포는 상단 경로(← log / repo / date)가 이미 말한다 — 여기서 반복하지 않는다
  const head = (
    <section className="flex flex-col gap-3">
      <h1 className="m-0 text-xl font-bold leading-[1.3] tracking-[-.01em] [text-wrap:balance] md:text-[28px]">
        {en && post.titleEn ? post.titleEn : post.title}
      </h1>
      {/* 좁은 화면에서 토글이 메타를 밀어 단어 하나가 고아로 떨어지지 않게 —
          안 맞으면 토글이 통째로 다음 줄로 내려간다 */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="font-mono text-xs text-muted">
          {post.commits != null
            ? `AI가 커밋 ${post.commits}개${post.prs ? ` · PR ${post.prs}개` : ""}로 작성 · `
            : ""}
          day {String(post.day).padStart(2, "0")}
          {post.short ? " · 쇼츠 있음" : ""}
        </div>
        <div
          className="flex gap-1 rounded-md border border-line bg-panel p-1"
          aria-label="글 언어"
        >
          {(["ko", "en"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={lang === v}
              onClick={() => setLang(v)}
              className={`hit min-h-8 cursor-pointer rounded-[7px] px-3 font-sans text-sm font-bold transition-colors duration-150 ${
                lang === v ? "bg-panel2 text-ink" : "text-muted"
              }`}
            >
              {v.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </section>
  );

  const article = (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-10 lg:mx-0 lg:max-w-none">
      {head}

      {en && !post.hasEn && (
        <EmptyState
          compact
          title="영어 번역이 아직 없습니다"
          body="번역은 한국어 글이 만들어질 때 같은 실행에서 붙습니다. 이 글은 수동 작성분이라 번역이 없습니다."
          action={
            <button
              type="button"
              onClick={() => setLang("ko")}
              className="cursor-pointer font-mono text-xs text-accent transition-opacity duration-150 hover:opacity-85"
            >
              한국어로 읽기 →
            </button>
          }
        />
      )}

      {(!en || post.hasEn) && (
        <>
          {en && (
            <p className="m-0 font-mono text-xs text-muted">자동 번역본입니다.</p>
          )}
          {parsed ? (
            <section className="flex flex-col gap-8">
              {s.did && (
                <div>
                  <H>{headings.did}</H>
                  <Md>{s.did}</Md>
                </div>
              )}
              {s.why && (
                <div>
                  <H>{headings.why}</H>
                  <Md>{s.why}</Md>
                </div>
              )}
              <div>
                <H warn>{headings.fail}</H>
                {noFail ? (
                  <p className="m-0 text-md leading-[1.75] text-muted">
                    오늘은 없었습니다.
                    {post.commits ? ` 커밋 ${post.commits}개가 한 번에 붙었습니다.` : ""}
                  </p>
                ) : (
                  <Md>{s.fail as string}</Md>
                )}
              </div>
              {s.next && (
                <div>
                  <H>{headings.next}</H>
                  <Md>{s.next}</Md>
                </div>
              )}
            </section>
          ) : (
            <div className="prose-devlog">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {post.body}
              </ReactMarkdown>
            </div>
          )}
        </>
      )}
    </div>
  );

  // 쇼츠가 없으면 영역 자체를 뺀다 (Jessi 지시). 스크린샷 섹션은 삭제 —
  // 정보가 얇았고(어제의 이 사이트 모습), 실제 화면은 쇼츠 데모가 보여준다.
  const thumb = post.short && (
    <Thumb
      s={{
        day: post.day,
        hook: post.short.hook ?? post.title,
        hookKeywords: post.short.hookKeywords ?? [],
        template: post.short.template,
        duration: post.short.duration,
        poster: post.short.media?.poster,
      }}
    />
  );
  const aside = post.short && (
    <aside className="mx-auto flex w-full max-w-[680px] flex-col gap-3.5 lg:sticky lg:top-[90px] lg:mx-0 lg:max-w-none">
      <h2 className="m-0 px-1 text-md font-bold text-ink">이 글의 쇼츠</h2>
      {post.short.media?.ko || post.short.media?.en ? (
        <button
          type="button"
          aria-label="쇼츠 재생"
          onClick={() => openShort(post.short?.media?.ko ? "ko" : "en")}
          className="group w-full max-w-[340px] cursor-pointer p-0 text-left"
        >
          {thumb}
        </button>
      ) : (
        // 대본만 있고 영상은 아직 — 썸네일로 예고만 한다
        <div className="w-full max-w-[340px]">{thumb}</div>
      )}
    </aside>
  );

  const footer = (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-10 lg:col-start-1 lg:mx-0 lg:max-w-none">
      {post.shas && post.shas.length > 0 && (
        <section className="flex flex-col gap-3.5">
          <h2 className="m-0 px-1 text-md font-bold text-ink">원료 · git log</h2>
          <Card inset className="px-[18px] py-1">
            {post.shas.map(([sha, msg], i) => (
              <div
                key={`${sha}-${i}`}
                className={`flex gap-3 py-2.5 text-sm leading-normal ${
                  i < (post.shas?.length ?? 0) - 1 ? "border-b border-line" : ""
                }`}
              >
                <span className="flex-none pt-0.5 font-mono text-xs text-muted">
                  {sha}
                </span>
                <span className="text-ink-soft">{msg}</span>
              </div>
            ))}
          </Card>
        </section>
      )}
      {!post.short && (
        <p className="m-0 font-mono text-2xs text-muted">
          쇼츠는 배포 커밋이 있거나 삽질이 뚜렷한 날만 만듭니다.
        </p>
      )}
      <Link
        href={`/projects/${post.repo}`}
        className="font-mono text-sm text-accent transition-opacity duration-150 hover:opacity-85"
      >
        {post.repo}의 다른 날 →
      </Link>
    </div>
  );

  return (
    <>
      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-x-12 lg:gap-y-12">
        {article}
        {aside}
        {footer}
      </div>

      {media && <MediaLightbox media={media} onClose={() => setMedia(null)} />}
    </>
  );
}
