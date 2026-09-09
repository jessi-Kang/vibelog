export interface SectionHeaderProps {
  title: string;
  /** 오른쪽 모노 보조 텍스트 ('최근 활동순', '전체 →') */
  aside?: string;
  /** 있으면 aside가 민트 링크 */
  href?: string;
  style?: React.CSSProperties;
}
export function SectionHeader(props: SectionHeaderProps): JSX.Element;
