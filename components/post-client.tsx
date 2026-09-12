"use client";
/**
 * 데브로그 본문 — KO/EN 탭, 고정 섹션 구조, 원료 git log.
 * 데스크톱(lg): 본문은 왼쪽 읽기 컬럼(≈680), 쇼츠 썸네일은 오른쪽 340px
 * 고정 레일 — 남는 좌우 여백을 미디어에 쓴다. 모바일·태블릿: 기존 세로 순서.
 */
import Link from "next/link";
import { useState, type AnchorHTMLAttributes } from "react";
import ReactMarkdown from "react-markdown";
import { useLang } from "./lang";
import remarkGfm from "remark-gfm";
import type { PluggableList } from "unified";
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
  shasEn?: [string, string][];
  sections: { did?: string; why?: string; fail?: string; next?: string };
  sectionsEn: { did?: string; why?: string; fail?: string; next?: string };
  hasEn: boolean;
  body: string; // 섹션 파싱 실패 시 폴백
  short?: {
    template: string;
    duration?: number;
    media?: { ko?: string; en?: string; poster?: string; posterEn?: string };
    hook?: string;
    hookKeywords?: string[];
  };
}

// 본문 속 링크는 전부 외부(레포·문서 등)라 새 창으로 — 읽던 글을 잃지 않게 (Jessi 지시)
const mdComponents = {
  a: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props} target="_blank" rel="noopener noreferrer" />
  ),
};

/**
 * 물결표 하나짜리 취소선을 끈다.
 *
 * remark-gfm은 `~단어~`도 취소선으로 먹는데, 우리 글은 물결표를 **범위**에
 * 쓴다 — "둘 중 하나는 6~12점, 넷 중 하나는 9~16점"이 "6[12점, 넷 중 하나는
 * 9]16점"으로 가운데가 통째로 그어져 나갔다 (Jessi가 9/12 apart 글에서 잡았다).
 * 글은 사람이 고칠 수 없다 — 파이프라인이 매일 쓰는 문장이고, 범위 표기가
 * 잘못된 것도 아니다. 그래서 문장을 escape하는 대신 파서에서 끈다.
 * `~~두 개~~`는 그대로 취소선이라, 정말 그을 일이 생기면 그때 쓴다.
 */
const REMARK: PluggableList = [[remarkGfm, { singleTilde: false }]];

function Md({ children }: { children: string }) {
  return (
    <div className="text-md leading-[1.75] text-ink-soft [text-wrap:pretty] [&_a]:text-accent [&_code]:rounded-sm [&_code]:bg-panel2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[.9em] [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
      <ReactMarkdown remarkPlugins={REMARK} components={mdComponents}>
        {children}
      </ReactMarkdown>
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
  const { lang, setLang } = useLang(); // 전역 설정 — 헤더의 KO/EN 스위치
  const [media, setMedia] = useState<LightboxMedia | null>(null);
  // 원료 git log — 10개 넘는 날은 접어서 시작 (frontmatter엔 전부 실려 있다)
  const [showAllShas, setShowAllShas] = useState(false);
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
      {/* 언어 토글은 헤더의 전역 스위치로 올라갔다 (Jessi 지시) */}
      <div className="font-mono text-xs text-muted">
        {post.commits != null
          ? en
            ? `Written by AI from ${post.commits} commit${post.commits === 1 ? "" : "s"}${post.prs ? ` · ${post.prs} PR${post.prs === 1 ? "" : "s"}` : ""} · `
            : `AI가 커밋 ${post.commits}개${post.prs ? ` · PR ${post.prs}개` : ""}로 작성 · `
          : ""}
        day {String(post.day).padStart(2, "0")}
        {post.short ? (en ? " · has short" : " · 쇼츠 있음") : ""}
      </div>
    </section>
  );

  const article = (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-10 lg:mx-0 lg:max-w-none">
      {head}

      {en && !post.hasEn && (
        <EmptyState
          compact
          title="No English translation yet"
          body="Translations are attached in the same run that writes the Korean post. This one was written manually, so it has none."
          action={
            <button
              type="button"
              onClick={() => setLang("ko")}
              className="cursor-pointer font-mono text-xs text-accent transition-opacity duration-150 hover:opacity-85"
            >
              Read in Korean →
            </button>
          }
        />
      )}

      {(!en || post.hasEn) && (
        <>
          {en && (
            <p className="m-0 font-mono text-xs text-muted">Automatically translated.</p>
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
                    {en ? "None today." : "오늘은 없었습니다."}
                    {post.commits
                      ? en
                        ? ` ${post.commits} commits landed in one go.`
                        : ` 커밋 ${post.commits}개가 한 번에 붙었습니다.`
                      : ""}
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
              <ReactMarkdown remarkPlugins={REMARK} components={mdComponents}>
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
        // EN으로 읽는 중이면 영어 훅 프레임 — 아직 없으면(구버전) ko 폴백
        poster: en
          ? (post.short.media?.posterEn ?? post.short.media?.poster)
          : post.short.media?.poster,
      }}
    />
  );
  const aside = post.short && (
    <aside className="mx-auto flex w-full max-w-[680px] flex-col gap-3.5 lg:sticky lg:top-[90px] lg:mx-0 lg:max-w-none">
      <h2 className="m-0 px-1 text-md font-bold text-ink">
        {en ? "This post's short" : "이 글의 쇼츠"}
      </h2>
      {post.short.media?.ko || post.short.media?.en ? (
        <button
          type="button"
          aria-label={en ? "Play short" : "쇼츠 재생"}
          // 글을 EN으로 읽고 있으면 쇼츠도 EN으로 — 없는 언어는 팝업이 알아서 폴백
          onClick={() => openShort(lang)}
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
          <h2 className="m-0 px-1 text-md font-bold text-ink">
            {en ? "Raw material · git log" : "원료 · git log"}
          </h2>
          <Card inset className="px-[18px] py-1">
            {/* 그날 커밋 전부가 원료다 — 다만 많은 날은 10개까지만 펼치고 접는다 */}
            {(showAllShas ? post.shas : post.shas.slice(0, 10)).map(
              ([sha, msg], i, visible) => (
                <div
                  key={`${sha}-${i}`}
                  className={`flex gap-3 py-2.5 text-sm leading-normal ${
                    i < visible.length - 1 || !showAllShas
                      ? "border-b border-line"
                      : ""
                  }`}
                >
                  <span className="flex-none pt-0.5 font-mono text-xs text-muted">
                    {sha}
                  </span>
                  <span className="text-ink-soft">
                    {en
                      ? (post.shasEn?.find(([x]) => x === sha)?.[1] ?? msg)
                      : msg}
                  </span>
                </div>
              ),
            )}
            {post.shas.length > 10 && !showAllShas && (
              <button
                type="button"
                onClick={() => setShowAllShas(true)}
                className="w-full cursor-pointer py-2.5 text-left font-mono text-xs text-accent transition-opacity duration-150 hover:opacity-85"
              >
                {en
                  ? `+ show all ${post.shas.length} commits`
                  : `+ 커밋 ${post.shas.length}개 전부 보기`}
              </button>
            )}
          </Card>
        </section>
      )}
      {!post.short && (
        <p className="m-0 font-mono text-2xs text-muted">
          {en
            ? "Shorts are made only on days with a deploy commit or a clear rabbit hole."
            : "쇼츠는 배포 커밋이 있거나 삽질이 뚜렷한 날만 만듭니다."}
        </p>
      )}
      <Link
        href={`/projects/${post.repo}`}
        className="font-mono text-sm text-accent transition-opacity duration-150 hover:opacity-85"
      >
        {en ? `More days of ${post.repo} →` : `${post.repo}의 다른 날 →`}
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
