export interface EyebrowProps {
  /** 'VIBELOG · DAY 01' — 워드마크는 <b style={{color:'var(--accent)'}}> */
  left: React.ReactNode;
  /** 템플릿 태그 pill: 'SHIP IT' | '오늘의 삽질' | 'BEFORE / AFTER' */
  right?: React.ReactNode;
  /** px. 쇼츠 30, 웹 11~13 */
  size?: number;
  style?: React.CSSProperties;
}
export function Eyebrow(props: EyebrowProps): JSX.Element;
