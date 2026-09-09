/**
 * @startingPoint section="Vibelog" subtitle="상태 스트라이프 프로젝트 카드" viewport="390x170"
 */
export interface ProjectCardProps {
  /** 레포 이름 그대로 (소문자-kebab) */
  name: string;
  status: 'idea' | 'building' | 'live' | 'paused';
  /** 레포 description 그대로 */
  description?: string;
  /** 소문자 스택. 한 줄 모노 텍스트로 합쳐진다 ('next.js · vercel') */
  stack?: string[];
  /** 레포 homepage — 있으면 '열기 ↗' 링크 */
  url?: string;
  /** 이번 주 커밋 수. 0이면 표시 안 함 */
  commits?: number;
  /** '오늘' · '3일 전' · '6주 전' */
  lastActive?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export function ProjectCard(props: ProjectCardProps): JSX.Element;
