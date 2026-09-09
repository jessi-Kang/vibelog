export interface DialogProps {
  open: boolean;
  title: string;
  eyebrow?: string;
  children?: React.ReactNode;
  /** Button 들 */
  actions?: React.ReactNode;
  onClose?: () => void;
  style?: React.CSSProperties;
}
export function Dialog(props: DialogProps): JSX.Element;
