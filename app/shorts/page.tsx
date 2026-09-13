import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { ShortsClient } from "@/components/shorts-client";
import { getDevlogs, getProjects, getShorts } from "@/lib/content";

export const metadata: Metadata = {
  title: "쇼츠",
  description: "데브로그를 30–45초 세로 영상으로 — 대본·음성·화면까지 자동 생성한 쇼츠 모음.",
  alternates: { canonical: "/shorts" },
};

export default function ShortsPage() {
  const devlogs = getDevlogs();
  const shorts = getShorts().map((s) => ({
    ...s,
    title:
      devlogs.find((d) => d.repo === s.repo && d.date === s.date)?.title ??
      `${s.repo} · ${s.date}`,
  }));
  // "렌더 대기" 섹션은 삭제했다 — 쇼츠는 글이 만들어진 그날 밤에만 생성되므로
  // 옛 글이 "대기"처럼 보이는 건 거짓말이었다 (Jessi 점검 지시)

  // 필터에는 **쇼츠가 있는** 프로젝트만 올린다. 피드와 달리 쇼츠는 없는 날이
  // 많아서, 전체 프로젝트를 칩으로 깔면 눌러도 빈 화면만 나오는 칩이 생긴다.
  const has = new Set(shorts.map((s) => s.repo));
  const projects = getProjects()
    .filter((p) => has.has(p.slug))
    .map((p) => ({ slug: p.slug, name: p.name }));

  return (
    <PageContainer>
      <ShortsClient
        shorts={shorts}
        projects={projects}
        introSrc="/shorts/intro.mp4"
        introEnSrc="/shorts/intro.en.mp4"
      />
    </PageContainer>
  );
}
