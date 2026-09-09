export interface BadgeProps {
  tone?: 'accent' | 'warn' | 'danger' | 'neutral' | 'outline';
  /** 모노·대문자로 렌더됨. 짧게 (1~2 단어) */
  children: React.ReactNode;
  style?: React.CSSProperties;
}
export function Badge(props: BadgeProps): JSX.Element;
