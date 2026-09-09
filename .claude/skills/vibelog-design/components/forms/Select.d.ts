export interface SelectProps {
  label?: string;
  options: Array<string | { value: string; label: string }>;
  value?: string;
  onChange?: (value: string) => void;
  mono?: boolean;
  style?: React.CSSProperties;
}
export function Select(props: SelectProps): JSX.Element;
