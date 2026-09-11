import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { T } from "@/components/lang";
import { ShortsGrid } from "@/components/shorts-grid";
import { EmptyState, SectionHeader } from "@/components/ui";
import { getDevlogs, getShorts } from "@/lib/content";

export const metadata: Metadata = {
  title: "쇼츠",
  description: "데브로그를 30~45초 세로 영상으로 — 대본·음성·화면까지 자동 생성한 쇼츠 모음.",
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

  return (
    <PageContainer>
      <section className="flex flex-col gap-3.5">
        <SectionHeader
          title={<T ko="쇼츠" en="Shorts" />}
          // 개수는 메뉴 옆 숫자가 이미 말한다
          aside={shorts.length ? <T ko="30~45초" en="30–45s" /> : undefined}
        />
        {shorts.length === 0 ? (
          <EmptyState
            title={<T ko="아직 쇼츠가 없습니다" en="No shorts yet" />}
            body={
              <T
                ko="쇼츠는 데브로그가 만들어진 같은 밤에 렌더됩니다(ElevenLabs 내레이션 + Remotion). 첫 편은 배포 커밋이 있는 날에 나옵니다."
                en="Shorts render the same night a devlog is written (ElevenLabs narration + Remotion). The first one comes on a day with a deploy commit."
              />
            }
            hint="content/shorts/<repo>/<date>.json"
          />
        ) : (
          <ShortsGrid shorts={shorts} introSrc="/shorts/intro.mp4" introEnSrc="/shorts/intro.en.mp4" />
        )}
      </section>

    </PageContainer>
  );
}
