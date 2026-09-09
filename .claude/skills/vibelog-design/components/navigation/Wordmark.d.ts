export interface WordmarkProps {
  /** px. 웹 18, 쇼츠 폰 안 56 */
  size?: number;
  /** 모노 대문자 서브 ('status board', '3 projects') */
  sub?: string;
  /** 민트 워드마크 (쇼츠 eyebrow) */
  accent?: boolean;
  style?: React.CSSProperties;
}
export function Wordmark(props: WordmarkProps): JSX.Element;
