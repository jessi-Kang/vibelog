export interface RadioProps {
  name: string;
  options: Array<string | { value: string; label: string }>;
  value?: string;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}
export function Radio(props: RadioProps): JSX.Element;
