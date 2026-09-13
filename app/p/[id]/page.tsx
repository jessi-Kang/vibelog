import { ldJson } from "@/lib/ld-json";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/page-container";
import { PostClient } from "@/components/post-client";
import { fmtDate, getDevlogs } from "@/lib/content";
import { findByPostId, postId, postPath } from "@/lib/post-id";

interface Props {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return getDevlogs().map((d) => ({ id: postId(d.repo, d.date) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const d = findByPostId(getDevlogs(), id);
  if (!d) return { title: "데브로그" };
  const description = d.summary ?? `${d.repo} 데브로그 — ${d.title}`;
  const path = postPath(d);
  return {
    title: d.title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      title: d.title,
      description,
      publishedTime: `${d.date}T14:00:00Z`, // 밤 실행 23:00 KST 커밋 근사
    },
    // twitter는 부모(layout)에서 안 물려받는다 — 안 적으면 글 제목 대신
    // 사이트 이름이 미리보기에 뜬다. 이미지는 opengraph-image.tsx가 채운다.
    twitter: { card: "summary_large_image", title: d.title, description },
  };
}

export default async function DevlogPostPage({ params }: Props) {
  const { id } = await params;
  const d = findByPostId(getDevlogs(), id);
  if (!d) notFound();

  return (
    <PageContainer>
      <script
        type="application/ld+json"
        // 검색엔진용 글 정보 — 발행일·작성 주체를 구조화해 노출
        dangerouslySetInnerHTML={{
          __html: ldJson({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: d.title,
            datePublished: `${d.date}T14:00:00Z`,
            inLanguage: "ko",
            author: { "@type": "Person", name: "Jessi" },
            ...(d.summary ? { description: d.summary } : {}),
          }),
        }}
      />
      <PostClient
        post={{
          repo: d.repo,
          date: d.date,
          dateLabel: fmtDate(d.date),
          title: d.title,
          titleEn: d.titleEn,
          day: d.day,
          commits: d.commits,
          prs: d.prs,
          shas: d.shas,
          shasEn: d.shasEn,
          sections: d.sections,
          sectionsEn: d.sectionsEn,
          hasEn: Boolean(d.bodyEn),
          body: d.body,
          short: d.short
            ? {
                template: d.short.template,
                duration: d.short.duration,
                media: d.short.media,
                hook: d.short.hook,
                hookKeywords: d.short.hookKeywords,
              }
            : undefined,
        }}
      />
    </PageContainer>
  );
}
