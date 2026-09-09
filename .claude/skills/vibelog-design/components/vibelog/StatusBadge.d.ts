export interface StatusBadgeProps {
  /** 자동 판정: homepage 있으면 live, 30일 내 커밋 building, 넘으면 paused. vibelog.json이 우선 */
  status: 'idea' | 'building' | 'live' | 'paused';
  /** dot = '● live' 텍스트(카드 헤더), pill = 채움 pill(쇼츠 폰 화면) */
  variant?: 'dot' | 'pill';
  style?: React.CSSProperties;
}
export function StatusBadge(props: StatusBadgeProps): JSX.Element;
