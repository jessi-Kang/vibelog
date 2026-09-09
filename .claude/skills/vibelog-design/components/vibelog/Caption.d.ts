export interface CaptionProps {
  /** 문장 하나. 키워드는 ^단어 (문장당 1~3개). 최대 두 줄 — 넘치면 문장을 쪼갠다 */
  text: string;
  /** 0..1 발화 진행률. 단어가 순서대로 흐림(.3)→또렷 */
  progress?: number;
  /** px. 쇼츠 62 */
  size?: number;
  style?: React.CSSProperties;
}
export function Caption(props: CaptionProps): JSX.Element;
