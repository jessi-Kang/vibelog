/**
 * 브라우저로 내려가는 프로젝트 목록 — content/projects.public.json.
 *
 * 화면 코드(lib/project-name.ts·project-color.ts)가 projects.json을 통째로 가져오면 그 파일이
 * 브라우저 JS 묶음에 그대로 실려, 숨긴 프로젝트(topic vibelog-hidden)의 이름·설명·레포 주소가
 * 누구에게나 내려갔다 (10/17). 숨긴 프로젝트를 빼고 화면에 쓰는 칸(이름·아이콘·색)만 남긴 사본을
 * 만든다. 빌드 직전(package.json prebuild)과 projects.json을 고치는 파이프라인 단계가 부른다.
 *
 *   npx tsx scripts/public-projects.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BY_HAND_HIDDEN } from "../lib/hidden-projects";

const DIR = path.join(process.cwd(), "content");

export function writePublicProjects(): void {
  const all: Record<string, unknown>[] = JSON.parse(fs.readFileSync(path.join(DIR, "projects.json"), "utf8"));
  const pub = all
    .filter((p) => p.hidden !== true && !BY_HAND_HIDDEN.has(String(p.slug)))
    .map((p) => ({
      slug: p.slug,
      ...(p.name ? { name: p.name } : {}),
      ...(p.nameEn ? { nameEn: p.nameEn } : {}),
      ...(p.icon ? { icon: p.icon } : {}),
      ...(p.color ? { color: p.color } : {}),
    }));
  fs.writeFileSync(path.join(DIR, "projects.public.json"), JSON.stringify(pub, null, 2) + "\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) writePublicProjects();
