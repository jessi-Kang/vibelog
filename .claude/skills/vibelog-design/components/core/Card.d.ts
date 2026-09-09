export interface CardProps {
  /** 상단 3px 스트라이프 색 (예: var(--status-live)) */
  stripe?: string;
  /** 페이지 배경색 패널 (실행 로그 등) */
  inset?: boolean;
  padding?: number | string;
  /** paused 등 비활성 카드 */
  dim?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}
export function Card(props: CardProps): JSX.Element;
