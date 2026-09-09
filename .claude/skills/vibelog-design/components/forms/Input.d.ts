export interface InputProps {
  /** 모노 대문자 eyebrow 라벨 */
  label?: string;
  hint?: string;
  error?: string;
  /** 토큰·URL·명령 입력 */
  mono?: boolean;
  multiline?: boolean;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  style?: React.CSSProperties;
}
export function Input(props: InputProps): JSX.Element;
