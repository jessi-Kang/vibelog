/**
 * 숨긴 프로젝트의 내용 — 로그인한 관리자에게만 (topic vibelog-hidden, lib/hidden-projects.ts).
 *
 * 방문자 화면은 미리 만들어 둔 그대로 보내고, 관리자로 확인된 브라우저만 여기서 숨긴 프로젝트·
 * 글·쇼츠·가리지 않은 지난 실행을 받아 끼워 넣는다 (components/private-data.tsx). 숨긴 내용이
 * 방문자 페이지 소스에 남지 않게 하려는 것이다. 관리자가 아니면 내용 없이 404 — 숨긴 것이
 * 있는지조차 알리지 않는다.
 */
import { fmtShort, getDevlogs, getProjects, getRunLog, getShorts } from "@/lib/content";
import { hasDb } from "@/lib/db";
import { isHiddenProject } from "@/lib/hidden-projects";
import { postPath } from "@/lib/post-id";
import { viewer } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const v = hasDb() ? await viewer() : null;
  if (!v?.isAdmin) return new Response(null, { status: 404, headers: { "cache-control": "private, no-store" } });

  const all = { all: true };
  const projects = getProjects(all)
    .filter((p) => isHiddenProject(p.slug))
    .map((p) => ({ ...p, href: `/private/projects/${p.slug}` }));
  const devlogs = getDevlogs(undefined, all)
    .filter((d) => isHiddenProject(d.repo))
    .map((d) => ({
      repo: d.repo,
      date: d.date,
      dateShort: fmtShort(d.date),
      title: d.title,
      ...(d.titleEn ? { titleEn: d.titleEn } : {}),
      ...(d.summary ? { summary: d.summary } : {}),
      ...(d.summaryEn ? { summaryEn: d.summaryEn } : {}),
      ...(d.commits != null ? { commits: d.commits } : {}),
      ...(d.prs ? { prs: d.prs } : {}),
      ...(d.intro ? { intro: true } : {}),
      ...(d.hasFail ? { hasFail: true } : {}),
      ...(d.short ? { short: true } : {}),
      href: `/private${postPath(d)}`,
    }));
  const titles = new Map(getDevlogs(undefined, all).map((d) => [`${d.repo}/${d.date}`, d] as const));
  const shorts = getShorts(all)
    .filter((s) => isHiddenProject(s.repo))
    .map((s) => {
      const d = titles.get(`${s.repo}/${s.date}`);
      return {
        ...s,
        title: d?.title ?? s.hook,
        ...(d?.titleEn ? { titleEn: d.titleEn } : {}),
        ...(d ? { href: `/private${postPath(d)}` } : {}),
      };
    });
  return Response.json(
    { projects, devlogs, shorts, run: getRunLog(all) },
    { headers: { "cache-control": "private, no-store" } },
  );
}
