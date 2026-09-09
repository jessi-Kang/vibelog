export interface EmptyStateProps {
  /** 무엇이 없는지 + 왜 (한 문장, 존댓말) */
  title: string;
  /** 언제 채워지는지 — 파이프라인 관점 ('다음 23:00 실행에 올라옵니다') */
  body?: string;
  /** 사용자가 할 수 있는 한 가지를 모노 코드로 ('topic: vibelog', 'gh workflow run devlog.yml') */
  hint?: string;
  /** Button 하나. 손품이 느는 행동은 넣지 않는다 */
  action?: React.ReactNode;
  /** 리스트 안 · 카드 안에 들어갈 때 */
  compact?: boolean;
  style?: React.CSSProperties;
}
export function EmptyState(props: EmptyStateProps): JSX.Element;
