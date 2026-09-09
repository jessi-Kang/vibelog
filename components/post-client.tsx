"use client";
/** 데브로그 본문 — KO/EN 탭, 고정 섹션 구조, 원료 git log */
import Link from "next/link";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  screenshot?: string;
  homepage?: string;
  short?: {
    template: string;
    duration?: number;
    media?: { ko?: string; en?: string };
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
  const en = lang === "en";
  const s = en ? post.sectionsEn : post.sections;
  const parsed = Boolean(post.sections.did || post.sections.why);
  const noFail = !s.fail || s.fail.startsWith("특별한 삽질은") || s.fail === "None.";

  const headings = en
    ? { did: "What I did", why: "Why", fail: "Rabbit holes", next: "Next up", shot: "Screenshot" }
    : { did: "뭘 했다", why: "왜", fail: "삽질 포인트", next: "다음 할 것", shot: "스크린샷" };

  return (
    <>
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 font-mono text-xs text-muted">
          <span>
            {post.dateLabel}{" "}
            <Link href={`/projects/${post.repo}`} className="text-ink-soft">
              {post.repo} →
            </Link>
          </span>
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
        <h1 className="m-0 text-xl font-bold leading-[1.3] tracking-[-.01em] [text-wrap:balance] md:text-[28px]">
          {en && post.titleEn ? post.titleEn : post.title}
        </h1>
        <div className="font-mono text-xs text-muted">
          {post.commits != null
            ? `AI가 커밋 ${post.commits}개${post.prs ? ` · PR ${post.prs}개` : ""}로 작성 · `
            : ""}
          day {String(post.day).padStart(2, "0")}
          {post.short ? " · 쇼츠 있음" : ""}
        </div>
      </section>

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
              <div>
                <H>{headings.shot}</H>
                {post.screenshot ? (
                  // 원본은 폰 풀페이지 캡처(세로로 매우 김) — 규격 비율로 상단만 보여주고
                  // 클릭하면 원본을 연다. 본문 읽기 흐름을 끊지 않기 위해서다.
                  <a
                    href={post.screenshot}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden rounded-lg border border-line"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.screenshot}
                      alt={`${post.repo} · ${post.date} 화면 캡처 — 클릭하면 전체 보기`}
                      className="aspect-[390/260] w-full object-cover object-top"
                    />
                  </a>
                ) : post.homepage ? (
                  <div className="grid aspect-[390/260] place-items-center rounded-lg border border-line bg-panel p-4 text-center font-mono text-2xs text-muted">
                    playwright 캡처 · {post.repo} · {post.date}
                  </div>
                ) : (
                  <EmptyState
                    compact
                    title="스크린샷이 없습니다"
                    body="레포에 homepage(배포 URL)가 없어 캡처를 건너뛰었습니다. URL을 채우면 다음 실행부터 매일 찍습니다."
                    hint="gh repo edit --homepage https://…"
                  />
                )}
              </div>
            </section>
          ) : (
            <div className="prose-devlog">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {post.body}
              </ReactMarkdown>
            </div>
          )}

          {post.short ? (
            <Card className="flex items-center gap-3.5 px-[18px] py-3.5">
              <div className="grid h-[84px] w-12 flex-none place-items-center rounded-sm border border-line bg-bg-deep font-mono text-sm text-accent">
                ▶
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <div className="text-md font-bold">
                  이 글의 쇼츠{post.short.duration ? ` · ${post.short.duration}초` : ""}
                </div>
                <div className="font-mono text-2xs text-muted">
                  {post.short.template}
                  {post.short.media?.ko && (
                    <>
                      {" · "}
                      <a
                        href={post.short.media.ko}
                        className="text-accent transition-opacity duration-150 hover:opacity-85"
                      >
                        ko ▶
                      </a>
                    </>
                  )}
                  {post.short.media?.en && (
                    <>
                      {" · "}
                      <a
                        href={post.short.media.en}
                        className="text-accent transition-opacity duration-150 hover:opacity-85"
                      >
                        en ▶
                      </a>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <EmptyState
              compact
              title="이 글의 쇼츠는 아직 없습니다"
              body="쇼츠는 배포 커밋이 있거나 삽질이 뚜렷한 날만 만듭니다. 이 날은 조건에 걸리지 않았습니다."
            />
          )}

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
        </>
      )}

      <Link
        href={`/projects/${post.repo}`}
        className="font-mono text-sm text-accent transition-opacity duration-150 hover:opacity-85"
      >
        {post.repo}의 다른 날 →
      </Link>
    </>
  );
}
