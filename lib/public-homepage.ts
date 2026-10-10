import type { ProjectStatus } from "./content";

/**
 * 화면에 보여 줄 배포 주소 — live일 때만. 배포는 했지만 정식 공개 전(preview)인 사이트의
 * 주소를 홈·프로젝트 페이지에 걸지 않는다 (10/10 Jessi: "라이브일 때만 공개하고 싶어").
 * 주소 자체는 쇼츠 녹화가 쓰므로 projects.json에는 그대로 남는다.
 * 브라우저 쪽 컴포넌트도 쓰므로 파일을 읽는 lib/content.ts와 떼어 둔다.
 */
export function publicHomepage(p: {
  status: ProjectStatus;
  homepage?: string;
}): string | undefined {
  return p.status === "live" ? p.homepage : undefined;
}
