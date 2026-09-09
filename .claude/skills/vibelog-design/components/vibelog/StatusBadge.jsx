import React from 'react';
import { Badge } from '../core/Badge.jsx';
export const STATUS = {
  idea: { label: 'idea', color: 'var(--status-idea)', tone: 'outline', stripe: 'var(--status-idea)' },
  building: { label: 'building', color: 'var(--status-building)', tone: 'warn', stripe: 'var(--status-building)' },
  live: { label: 'live', color: 'var(--status-live)', tone: 'accent', stripe: 'var(--status-live)' },
  paused: { label: 'paused', color: 'var(--status-paused)', tone: 'neutral', stripe: 'var(--status-paused-stripe)' },
};
export function StatusBadge({ status = 'building', variant = 'dot', style }) {
  const s = STATUS[status] || STATUS.building;
  if (variant === 'pill') return <Badge tone={s.tone} style={style}>{s.label}</Badge>;
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: s.color, whiteSpace: 'nowrap', ...style }}>● {s.label}</span>;
}
