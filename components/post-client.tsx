"use client";
/**
 * 데브로그 본문 — KO/EN 탭, 고정 섹션 구조, 원료 git log.
 * 데스크톱(lg): 본문은 왼쪽 읽기 컬럼(≈680), 쇼츠 썸네일은 오른쪽 340px
 * 고정 레일 — 남는 좌우 여백을 미디어에 쓴다. 모바일·태블릿: 기존 세로 순서.
 */
import Link from "next/link";
import { projectColor, withAlpha } from "@/lib/project-color";
import { hasRealFail } from "@/lib/has-fail";
import { useEffect, useState, type AnchorHTMLAttributes } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { keepBackslashes } from "@/lib/md-backslash";
import { setPostRepo } from "@/lib/nav-memory";
import { ProjectIcon } from "./project-icon";
import { useLang } from "./lang";
import remarkGfm from "remark-gfm";
import { allowedPostLink } from "@/lib/md-links";
import { remarkTerms } from "@/lib/remark-terms";
import { TermTip } from "./term-tip";
import { Comments } from "./comments";
import { postId } from "@/lib/post-id";
import type { PluggableList } from "unified";
import { MediaLightbox, type LightboxMedia } from "./lightbox";
import { Thumb } from "./shorts-grid";
import { Card, EmptyState, ShortMark } from "./ui";
import { PostFigure as Figure } from "./post-figure";
import {
  splitParas,
  type FigSection,
  type PostFigure,
} from "../scripts/figure-types";

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
  sections: { did?: string; why?: string; fail?: string; next?: string; built?: string; news?: string };
  sectionsEn: { did?: string; why?: string; fail?: string; next?: string; built?: string; news?: string };
  /** 프로젝트 소개 글 — 커밋이 아니라 레포 코드를 읽고 쓴 그 프로젝트의 첫 글 (scripts/intro.ts) */
  intro?: boolean;
  /** 화면에 쓰는 프로젝트 이름과, 소개 글이 코드를 읽고 쓴 프로젝트 설명 */
  project: {
    name: string;
    nameEn?: string;
    about?: string;
    aboutEn?: string;
    /** 소개 글 주소 — 이 글이 소개 글이거나 소개 글이 아직 없으면 없다 */
    introHref?: string;
    /** 프로젝트 아이콘 (lib/project-icon.ts) */
    icon?: import("@/lib/project-icon").ProjectIcon;
  };
  hasEn: boolean;
  body: string; // 섹션 파싱 실패 시 폴백
  /** 문단 사이에 들어가는 삽화 (검증 통과분만) */
  figures?: PostFigure[];
  short?: {
    template: string;
    duration?: number;
    media?: { ko?: string; en?: string; poster?: string; posterEn?: string };
    hook?: string;
    hookKeywords?: string[];
  };
}

// 본문 속 링크는 새 창으로 — 읽던 글을 잃지 않게 (Jessi 지시).
// 모델이 쓴 링크는 이 사이트와 GitHub만 살리고, 본문 그림은 그리지 않는다 (lib/md-links.ts).
// `node`는 react-markdown이 넘기는 구문 트리라 DOM 속성으로 내보내지 않는다.
const mdComponents = {
  a: ({
    node: _node,
    href,
    children,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { node?: unknown }) =>
    allowedPostLink(href) ? (
      <a {...rest} href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ) : (
      <span>{children}</span>
    ),
  img: () => null,
  // 용어 설명 표시 [[용어|설명]] → 점선 밑줄 + 누르면 말풍선 (lib/remark-terms.ts)
  "term-tip": ({ note, children }: { note?: string; children?: React.ReactNode }) => (
    <TermTip note={note ?? ""}>{children}</TermTip>
  ),
} as Components;

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
const REMARK: PluggableList = [[remarkGfm, { singleTilde: false }], remarkTerms];

function Md({ children }: { children: string }) {
  return (
    <div className="text-md leading-[1.75] text-ink-soft [text-wrap:pretty] [&_a]:text-accent [&_code]:rounded-sm [&_code]:bg-panel2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[.9em] [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
      <ReactMarkdown remarkPlugins={REMARK} components={mdComponents}>
        {keepBackslashes(children)}
      </ReactMarkdown>
    </div>
  );
}

/**
 * 섹션 하나를 그린다. 삽화가 있으면 **문단 사이에** 끼운다 — 책 삽화처럼.
 * 문단 번호는 splitParas가 정한다 (생성 쪽과 같은 함수를 쓴다 — 목록이
 * 두 군데로 갈라지면 자리가 어긋난다).
 */
function Body({
  md,
  figures,
  en,
}: {
  md: string;
  figures: PostFigure[];
  en: boolean;
}) {
  if (!figures.length) return <Md>{md}</Md>;
  const paras = splitParas(md);
  return (
    <>
      {paras.map((p, i) => (
        <div key={i}>
          <Md>{p}</Md>
          {figures
            .filter((f) => f.after === i)
            .map((f, j) => (
              <Figure
                key={j}
                node={en ? f.nodeEn : f.node}
                caption={en ? f.captionEn : f.caption}
              />
            ))}
        </div>
      ))}
    </>
  );
}

function H({ warn, children }: { warn?: boolean; children: string }) {
  return (
    <h2
      className={`m-0 mb-2 text-md font-bold ${warn ? "text-warn" : "text-ink"}`}
    >
      {children}
    </h2>
  );
}

export function PostClient({ post }: { post: PostData }) {
  const { lang, setLang } = useLang(); // 전역 설정 — 헤더의 KO/EN 스위치
  // 바깥에서 바로 들어온 글의 뒤로는 그 글의 프로젝트 페이지로 (lib/nav-memory.ts)
  useEffect(() => {
    setPostRepo(post.repo);
    return () => setPostRepo(undefined);
  }, [post.repo]);
  const [media, setMedia] = useState<LightboxMedia | null>(null);
  // 원료 git log — 10개 넘는 날은 접어서 시작 (frontmatter엔 전부 실려 있다)
  const [showAllShas, setShowAllShas] = useState(false);
  /** 접혀 있어 아래에 "전부 보기" 버튼이 따라붙는 상태 */
  const shasTruncated = !showAllShas && (post.shas?.length ?? 0) > 10;
  const en = lang === "en";
  const s = en ? post.sectionsEn : post.sections;
  const figsOf = (k: FigSection): PostFigure[] =>
    (post.figures ?? []).filter((f) => f.section === k);
  const parsed = Boolean(post.sections.did || post.sections.why);
  // 판정은 lib/has-fail.ts 하나로 — 첫 문장이 "없었습니다"여도 뒤에 이야기가
  // 이어지면 본문(과 삽화)을 그대로 보여 준다
  const noFail = !hasRealFail(s.fail);

  const headings = post.intro
    ? en
      ? { did: "What it is", why: "Who it's for, and why", fail: "", next: "Next up", built: "What's built so far", news: "" }
      : { did: "어떤 프로젝트인가", why: "누구를 위해, 왜", fail: "", next: "다음 할 것", built: "지금까지 만든 것", news: "" }
    : en
      ? { did: "What I did", why: "Why", fail: "Rabbit holes", next: "Next up", built: "", news: "Other news" }
      : { did: "뭘 했다", why: "왜", fail: "삽질 포인트", next: "다음 할 것", built: "", news: "그 밖의 소식" };
  const color = projectColor(post.repo);
  const projectName = en ? (post.project.nameEn ?? post.project.name) : post.project.name;
  const about = en ? (post.project.aboutEn ?? post.project.about) : post.project.about;

  const openShort = (v: "ko" | "en") =>
    setMedia({
      kind: "video",
      sources: post.short?.media ?? {},
      lang: v,
      label: `${post.title} 쇼츠`,
    });

  // 프로젝트 이름은 메타 줄 맨 앞에 둔다 (Jessi가 시안 B를 골랐다 —
  // docs/post-project-and-kind.html). 전에는 "상단 경로가 이미 말한다"며 뺐는데,
  // 글 주소가 /p/<id>로 바뀐 뒤 그 경로 줄이 안 떠서 글을 열면 누구 글인지
  // 알 길이 없었다. 누르면 그 프로젝트 페이지로 간다.
  const head = (
    <section className="flex flex-col gap-3">
      {post.intro && (
        <span
          className="self-start rounded-full border px-2.5 py-0.5 text-2xs font-bold"
          style={{ color, borderColor: withAlpha(color, 0.4) }}
        >
          {en ? "Project intro" : "프로젝트 소개"}
        </span>
      )}
      <h1 className="m-0 text-xl font-bold leading-[1.3] tracking-[-.01em] [text-wrap:balance] md:text-[28px]">
        {en && post.titleEn ? post.titleEn : post.title}
      </h1>
      {/* 언어 토글은 헤더의 전역 스위치로 올라갔다 (Jessi 지시) */}
      <div className="font-mono text-xs text-muted">
        <Link
          href={`/projects/${post.repo}`}
          className="hit relative font-bold underline decoration-1 underline-offset-[3px] transition-opacity duration-150 hover:opacity-85"
          style={{
            color,
            textDecorationColor: withAlpha(color, 0.4),
          }}
        >
          {projectName}
        </Link>
        {" · "}
        {post.intro
          ? en
            ? "Written by AI from the repo's code · intro"
            : "AI가 레포 코드를 읽고 작성 · 소개"
          : null}
        {!post.intro && post.commits != null
          ? en
            ? `Written by AI from ${post.commits} commit${post.commits === 1 ? "" : "s"}${post.prs ? ` · ${post.prs} PR${post.prs === 1 ? "" : "s"}` : ""} · `
            : `AI가 커밋 ${post.commits}개${post.prs ? ` · PR ${post.prs}개` : ""}로 작성 · `
          : ""}
        {!post.intro && <>day {String(post.day).padStart(2, "0")}</>}
        {post.short && (
          <span className="whitespace-nowrap">
            {" · "}
            <span className="inline-block align-[-2px]">
              <ShortMark label={en ? "has short" : "쇼츠 있음"} size={13} />
            </span>
          </span>
        )}
      </div>
      {/* 프로젝트 설명 — 처음 들어온 사람이 이 프로젝트가 무엇인지 알고 읽게. 소개 글이
          코드를 읽고 쓴 한두 문장이고, 누르면 소개 글로 간다 (docs/project-intro.html ②) */}
      {about && post.project.introHref && (
        <Link
          href={post.project.introHref}
          // 연한 바탕을 깐다 — 본문과 다른, 프로젝트에 대한 말이라는 것이 보이게 (Jessi, 10/11)
          className={`group mt-1 grid rounded-md bg-panel px-3.5 py-3 grid-cols-[20px_minmax(0,1fr)] gap-3`}
        >
          {/* 아이콘을 위에, 그 아래로 색 세로선을 잇는다 (docs/project-icon-places.html ②) */}
          <span className="flex flex-col items-center gap-1.5" aria-hidden>
            <ProjectIcon icon={post.project.icon} size={20} style={{ color }} />
            <span className="w-[3px] flex-1 rounded-sm opacity-55" style={{ background: color }} />
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-sm leading-relaxed text-ink-soft [text-wrap:pretty]">{about}</span>
            <span className="font-mono text-xs transition-opacity duration-150 group-hover:opacity-85" style={{ color }}>
              {en ? "About this project →" : "이 프로젝트 소개 →"}
            </span>
          </span>
        </Link>
      )}
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
            <p className="m-0 font-mono text-xs text-muted">
              Automatically translated.
            </p>
          )}
          {parsed ? (
            <section className="flex flex-col gap-8">
              {s.did && (
                <div>
                  <H>{headings.did}</H>
                  <Body md={s.did} figures={figsOf("did")} en={en} />
                </div>
              )}
              {s.why && (
                <div>
                  <H>{headings.why}</H>
                  <Body md={s.why} figures={figsOf("why")} en={en} />
                </div>
              )}
              {post.intro && s.built && (
                <div>
                  <H>{headings.built}</H>
                  <Body md={s.built} figures={figsOf("built")} en={en} />
                </div>
              )}
              {!post.intro && (
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
                  <Body
                    md={s.fail as string}
                    figures={figsOf("fail")}
                    en={en}
                  />
                )}
              </div>
              )}
              {s.next && (
                <div>
                  <H>{headings.next}</H>
                  <Body md={s.next} figures={figsOf("next")} en={en} />
                </div>
              )}
              {/* 그 밖의 소식 — 이야기 하나에 못 담은 큰 작업 (docs/post-other-work.html A안). 본문 이야기(뭘 했나→왜→삽질→다음)가 끝난 뒤, git log 바로 위에 둔다 —
                  "왜" 위에 두었더니 이야기가 끊겼다 (Jessi). 소식마다
                  굵은 첫 문장이 무엇이 생겼나, 끝의 기울임(_커밋 25개_)이 든 커밋 수다 — 기울임은 이
                  섹션에서만 작은 회색 글자로 그린다. 한글이 섞여 고정폭 글꼴을 쓰지 않는다 */}
              {!post.intro && s.news && (
                <div className="[&_em]:ml-1.5 [&_em]:whitespace-nowrap [&_em]:font-sans [&_em]:text-xs [&_em]:tabular-nums [&_em]:not-italic [&_em]:text-muted [&_strong]:text-ink">
                  <H>{headings.news}</H>
                  <Md>{s.news}</Md>
                </div>
              )}
            </section>
          ) : (
            <div className="prose-devlog">
              <ReactMarkdown remarkPlugins={REMARK} components={mdComponents}>
                {keepBackslashes(post.body)}
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
            {/* 그날 커밋 전부가 원료다 — 다만 많은 날은 10개까지만 펼치고 접는다.
                줄 사이 선은 **다음에 올 것이 있을 때만** 긋는다. 마지막 줄에도
                긋던 건 아래 "전부 보기" 버튼과 가르려던 것인데, 조건이
                `!showAllShas`뿐이라 버튼이 없는 열 개 이하짜리 글에서도 그어졌다
                — 카드 테두리 바로 위에 선이 하나 떠 있었다 (Jessi 지적).
                대부분의 글이 이 경우다. */}
            {(showAllShas ? post.shas : post.shas.slice(0, 10)).map(
              ([sha, msg], i, visible) => (
                <div
                  key={`${sha}-${i}`}
                  className={`flex gap-3 py-2.5 text-sm leading-normal ${
                    i < visible.length - 1 || shasTruncated
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
      <Comments postId={postId(post.repo, post.date)} />
      <Link
        // utm_source로 글 맨 아래에 있는 이 링크를 눌렀는지 센다 — 무료 요금제의 방문 통계는 클릭
        // 이벤트를 못 받지만 들어온 주소의 utm 값은 나눠서 보여 준다
        href={`/projects/${post.repo}?utm_source=post-end`}
        className="font-mono text-sm text-accent transition-opacity duration-150 hover:opacity-85"
      >
        {en ? `More days of ${projectName} →` : `${projectName}의 다른 날 →`}
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
