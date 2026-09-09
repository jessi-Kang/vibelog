import ProjectCard from "@/components/ProjectCard";
import { getProjects } from "@/lib/content";

export default function Home() {
  const projects = getProjects();

  return (
    <div>
      <p className="mb-8 max-w-xl text-sm leading-relaxed text-muted">
        바이브 코딩 프로젝트들의 제작기와 현황입니다. 데브로그는 사람이 쓰지
        않습니다 — 커밋에서 파이프라인이 매일 밤 자동으로 만듭니다.
      </p>
      {projects.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-8 text-center font-mono text-sm text-muted">
          아직 등록된 프로젝트가 없습니다.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <ProjectCard key={p.slug} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}
