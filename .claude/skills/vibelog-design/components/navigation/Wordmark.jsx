import React from 'react';
export function Wordmark({ size = 18, sub, accent, style }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 12, ...style }}>
      <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 900, fontSize: size, letterSpacing: '.01em', color: accent ? 'var(--accent)' : 'var(--text-body)', lineHeight: 1 }}>vibelog</span>
      {sub && <span style={{ fontFamily: 'var(--font-mono)', fontSize: Math.round(size * .61), letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{sub}</span>}
    </span>
  );
}
