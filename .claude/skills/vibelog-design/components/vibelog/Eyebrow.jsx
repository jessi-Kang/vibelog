import React from 'react';
export function Eyebrow({ left, right, size = 30, style }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, fontFamily: 'var(--font-mono)', fontSize: size, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-muted)', ...style }}>
      <span>{left}</span>
      {right && <span style={{ border: Math.max(1, Math.round(size / 15)) + 'px solid var(--border-default)', borderRadius: 'var(--radius-pill)', padding: (size / 3) + 'px ' + (size * .8) + 'px', color: 'var(--text-body)' }}>{right}</span>}
    </div>
  );
}
