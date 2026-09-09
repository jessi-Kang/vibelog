export interface RunLogProps {
  /** cmd: '$ …' 흰색 / ok(기본): '✓' 민트 / cur: '→' 커서 깜빡임 / fail: '✗' 빨강 */
  lines: Array<{ text: string; cmd?: boolean; cur?: boolean; fail?: boolean }>;
  style?: React.CSSProperties;
}
export function RunLog(props: RunLogProps): JSX.Element;
