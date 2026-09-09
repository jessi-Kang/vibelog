export interface ButtonProps {
  /** primary = 민트 채움(주 행동 1개), secondary = 패널, ghost = 텍스트, danger = 삭제·거절 */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  /** 모바일 풀폭 */
  full?: boolean;
  /** JetBrains Mono 라벨 (CLI 느낌의 행동: run, deploy) */
  mono?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export function Button(props: ButtonProps): JSX.Element;
