/**
 * @startingPoint section="Vibelog" subtitle="AI가 쓴 하루치 데브로그 항목 (리스트 / 타임라인)" viewport="390x200"
 */
export interface DevlogEntryProps {
  /** compact '09.14' / timeline '2026-09-14 · SUN' */
  date: string;
  repo?: string;
  title: string;
  /** 타임라인 변형에서만 표시 */
  summary?: string;
  /** '커밋 4 + PR 1', 'ko · en', {text:'삽질 1', tone:'warn'} */
  meta?: Array<string | { text: string; tone?: 'warn' | 'accent' | 'neutral' }>;
  /** 리스트 행(홈 최근 데브로그) */
  compact?: boolean;
  /** 마지막 항목: 구분선/타임라인 선 생략 */
  last?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export function DevlogEntry(props: DevlogEntryProps): JSX.Element;
