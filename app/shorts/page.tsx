import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/page-container";
import { EmptyState, SectionHeader } from "@/components/ui";
import { fmtShort, getDevlogs, getShorts } from "@/lib/content";

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
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
            {shorts.map((s) => (
              <Link
                key={`${s.repo}/${s.date}`}
                href={`/log/${s.repo}/${s.date}`}
                className="flex flex-col gap-2"
              >
                <div
                  className="relative aspect-[9/16] overflow-hidden rounded-lg border border-line bg-bg-deep"
                  style={{
                    backgroundImage:
                      "radial-gradient(60% 40% at 50% 0%, rgba(94,225,195,.10), transparent 70%)",
                  }}
                >
                  <div className="absolute left-3 right-3 top-3 font-mono text-[8px] font-bold uppercase tracking-[.08em] text-muted">
                    <b className="text-accent">vibelog</b> · day{" "}
                    {String(s.day).padStart(2, "0")}
                  </div>
                  <div className="absolute left-3.5 right-3.5 top-[38%] text-[17px] font-black leading-[1.15] tracking-[-.01em] [text-wrap:balance]">
                    {s.hook.split(/\s+/).map((w, i) => (
                      <span
                        key={i}
                        className={s.hookKeywords.includes(w) ? "text-accent" : ""}
                      >
                        {w}{" "}
                      </span>
                    ))}
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex justify-between font-mono text-[9px] uppercase tracking-[.06em] text-muted">
                    <span>{s.template}</span>
                    <span>
                      ▶{" "}
                      {s.duration
                        ? `0:${String(s.duration).padStart(2, "0")}`
                        : "—"}
                    </span>
                  </div>
                </div>
                <div className="text-sm font-bold leading-snug [text-wrap:pretty]">
                  {s.title}
                </div>
                <div className="font-mono text-2xs text-muted">
                  {s.repo} · {fmtShort(s.date)}
                </div>
              </Link>
            ))}
          </div>
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
