/**
 * 글 페이지 본문 — 공개 주소(/p/<id>)와 관리자 전용 주소(/private/p/<id>)가 같이 쓴다.
 * 숨긴 프로젝트의 글(hidden)은 검색엔진용 정보를 넣지 않고, 이어 읽기 목록과 댓글을 두지 않는다.
 */
import { ldJson } from "@/lib/ld-json";
import { PostClient } from "@/components/post-client";
import { fmtDate, fmtShort, getProject, type DevlogEntry } from "@/lib/content";
import { postPath } from "@/lib/post-id";

export function PostView({ d, all, hidden = false }: { d: DevlogEntry; all: DevlogEntry[]; hidden?: boolean }) {
  const project = getProject(d.repo, { all: hidden });
  const href = (x: DevlogEntry) => (hidden ? `/private${postPath(x)}` : postPath(x));
  // 글 끝 "최근 데브로그" — 홈과 같은 순서에서 이 글의 바로 앞 1편·바로 뒤 1편.
  // 맨 앞·맨 뒤 글이면 있는 쪽 한 편만 보인다
  const at = all.indexOf(d);
  const nearby = hidden
    ? []
    : [all[at - 1], all[at + 1]]
        .filter((x): x is DevlogEntry => Boolean(x))
        .map((x) => ({
          href: postPath(x),
          date: fmtShort(x.date),
          repo: x.repo,
          title: x.title,
          titleEn: x.titleEn,
          commits: x.commits,
          prs: x.prs,
          intro: x.intro,
          hasFail: x.hasFail,
        }));
  // 소개 글 — 이 글 제목 아래 프로젝트 설명이 여기로 간다. 소개 글 자신에는 붙이지 않는다
  const intro = d.intro ? undefined : all.find((x) => x.repo === d.repo && x.intro);

  return (
    <>
      {!hidden && (
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
      )}
      <PostClient
        nearby={nearby}
        hidden={hidden}
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
          figures: d.figures,
          intro: d.intro,
          project: {
            name: project?.name ?? d.repo,
            nameEn: project?.nameEn,
            about: project?.about,
            aboutEn: project?.aboutEn,
            introHref: intro ? href(intro) : undefined,
            icon: project?.icon,
          },
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
    </>
  );
}
