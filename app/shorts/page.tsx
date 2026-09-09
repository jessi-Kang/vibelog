import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/page-container";
import { ShortsGrid } from "@/components/shorts-grid";
import { EmptyState, SectionHeader } from "@/components/ui";
import { getDevlogs, getShorts } from "@/lib/content";

export const metadata: Metadata = { title: "쇼츠" };

export default function ShortsPage() {
  const devlogs = getDevlogs();
  const shorts = getShorts().map((s) => ({
    ...s,
    title:
      devlogs.find((d) => d.repo === s.repo && d.date === s.date)?.title ??
      `${s.repo} · ${s.date}`,
  }));
  // 렌더 대기 — 쇼츠가 아직 없는 최근 데브로그
  const pending = devlogs
    .filter((d) => !d.short)
    .slice(0, 5)
    .map((d) => ({
      repo: d.repo,
      date: d.date,
      title: d.title,
      template:
        d.sections.fail && !d.sections.fail.startsWith("특별한 삽질은")
          ? "오늘의 삽질"
          : "ship it",
    }));

  return (
    <PageContainer>
      <section className="flex flex-col gap-3.5">
        <SectionHeader
          title="쇼츠"
          aside={shorts.length ? `${shorts.length}편 · 30~45초` : undefined}
        />
        {shorts.length === 0 ? (
          <EmptyState
            title="아직 쇼츠가 없습니다"
            body="쇼츠는 데브로그가 만들어진 같은 밤에 렌더됩니다(ElevenLabs 내레이션 + Remotion). 첫 편은 배포 커밋이 있는 날에 나옵니다."
            hint="content/shorts/<repo>/<date>.json"
          />
        ) : (
          <ShortsGrid shorts={shorts} introSrc="/shorts/intro.mp4" />
        )}
      </section>

      {pending.length > 0 && (
        <section className="flex flex-col gap-3.5">
          <SectionHeader title="렌더 대기" aside={`${pending.length}편`} />
          <div className="flex flex-col font-mono text-xs text-muted">
            {pending.map((d) => (
              <Link
                key={`${d.repo}/${d.date}`}
                href={`/log/${d.repo}/${d.date}`}
                className="flex justify-between gap-3 border-b border-line px-1 py-2.5 transition-colors duration-150 hover:text-ink-soft"
              >
                <span className="min-w-0 truncate font-sans text-sm text-ink-soft">
                  {d.title}
                </span>
                <span className="whitespace-nowrap">{d.template} · 대본 대기</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </PageContainer>
  );
}
