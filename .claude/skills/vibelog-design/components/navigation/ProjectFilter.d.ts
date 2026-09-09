export interface ProjectFilterProps {
  /** 최근 활동순으로 정렬해서 넘긴다 */
  projects: Array<{ slug: string; name: string }>;
  /** 'all' 또는 slug */
  value: string;
  onChange?: (slug: string) => void;
  /** slug → 글 수. 있으면 칩 옆에 회색 숫자 */
  counts?: Record<string, number>;
  /** 이 수를 넘으면 칩 대신 Select. 기본 8 */
  maxChips?: number;
  style?: React.CSSProperties;
}
export function ProjectFilter(props: ProjectFilterProps): JSX.Element;
