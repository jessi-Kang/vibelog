export interface TabsProps {
  items: Array<string | { value: string; label: string }>;
  value: string;
  onChange?: (value: string) => void;
  /** 모바일 상단 내비: 풀폭 균등 분할 */
  full?: boolean;
  style?: React.CSSProperties;
}
export function Tabs(props: TabsProps): JSX.Element;
