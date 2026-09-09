import React from 'react';
export function StatPanel({ label, value, accent, style }) {
  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, ...style }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-2xl)', fontWeight: 700, lineHeight: 1, letterSpacing: '-.02em', color: accent ? 'var(--accent)' : 'var(--text-body)' }}>{value}</span>
    </div>
  );
}
