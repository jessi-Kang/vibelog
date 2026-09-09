export interface TagProps {
  /** 스택·레포·언어 등 소문자 모노 칩 */
  children: React.ReactNode;
  /** 있으면 <a>로 렌더 */
  href?: string;
  tone?: 'neutral' | 'accent' | 'warn';
  style?: React.CSSProperties;
}
export function Tag(props: TagProps): JSX.Element;
