export interface StatPanelProps {
  /** 모노 대문자 라벨 */
  label: string;
  value: React.ReactNode;
  /** 오늘 움직인 수치만 민트 */
  accent?: boolean;
  style?: React.CSSProperties;
}
export function StatPanel(props: StatPanelProps): JSX.Element;
