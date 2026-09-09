export interface ProgressBarProps {
  /** 0..1 */
  value: number;
  label?: string;
  valueText?: string;
  tone?: 'accent' | 'warn' | 'muted';
  /** px. 웹 6, 쇼츠 8 */
  height?: number;
  style?: React.CSSProperties;
}
export function ProgressBar(props: ProgressBarProps): JSX.Element;
