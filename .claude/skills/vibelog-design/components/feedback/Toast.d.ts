export interface ToastProps {
  tone?: 'accent' | 'warn' | 'danger' | 'neutral';
  children: React.ReactNode;
  /** 모노 링크형 액션 라벨 */
  action?: string;
  onAction?: () => void;
  /** 화면 하단 고정 */
  fixed?: boolean;
  style?: React.CSSProperties;
}
export function Toast(props: ToastProps): JSX.Element;
