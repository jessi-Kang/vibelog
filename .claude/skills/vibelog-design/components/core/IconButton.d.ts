export interface IconButtonProps {
  /** 접근성 라벨 (필수) */
  label: string;
  size?: 'sm' | 'md';
  tone?: 'neutral' | 'accent' | 'danger';
  active?: boolean;
  /** 유니코드 글리프 한 글자 (×, ↗, →, ⋯). 아이콘 폰트 없음 */
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export function IconButton(props: IconButtonProps): JSX.Element;
