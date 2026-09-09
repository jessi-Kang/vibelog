import type { Metadata } from "next";
import Link from "next/link";
import DevlogBody from "@/components/DevlogBody";
import { getDevlogs } from "@/lib/content";

export const metadata: Metadata = { title: "log" };

export default function LogPage() {
  const devlogs = getDevlogs();

  return (
    <div>
      <h1 className="mb-8 font-mono text-xs font-bold uppercase tracking-widest text-muted">
        all devlogs
      </h1>
      {devlogs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-8 text-center font-mono text-sm text-muted">
          아직 데브로그가 없습니다.
        </p>
      ) : (
        <div className="space-y-6">
          {devlogs.map((d) => (
            <article
              key={`${d.repo}/${d.date}`}
              className="rounded-2xl border border-line bg-panel p-5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <Link
                  href={`/projects/${d.repo}`}
                  className="font-mono text-xs font-bold text-accent underline-offset-4 hover:underline"
                >
                  {d.repo}
                </Link>
                <span className="font-mono text-xs text-muted">{d.date}</span>
              </div>
              <h2 className="mt-2 text-lg font-black">{d.title}</h2>
              <div className="mt-3">
                <DevlogBody markdown={d.body} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
