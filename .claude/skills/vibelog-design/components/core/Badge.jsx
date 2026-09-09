import React from 'react';
const T = {
  accent: { background: 'var(--accent-soft)', color: 'var(--accent)' },
  warn: { background: 'var(--warn-soft)', color: 'var(--warn)' },
  danger: { background: 'var(--danger-soft)', color: 'var(--danger)' },
  neutral: { background: 'rgba(140,152,168,.15)', color: 'var(--text-muted)' },
  outline: { background: 'transparent', color: 'var(--text-body)', border: '1px solid var(--border-default)' },
};
export function Badge({ tone = 'neutral', children, style }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', fontWeight: 700,
      letterSpacing: '.06em', textTransform: 'uppercase', padding: '5px 11px', borderRadius: 'var(--radius-pill)', lineHeight: 1.2, whiteSpace: 'nowrap', ...T[tone], ...style }}>
      {children}
    </span>
  );
}
