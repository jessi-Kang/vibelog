import React from 'react';
export function SectionHeader({ title, aside, href, style }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '0 4px', ...style }}>
      <h2 style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-body)' }}>{title}</h2>
      {aside && (href
        ? <a href={href} style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--accent)', textDecoration: 'none' }}>{aside}</a>
        : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>{aside}</span>)}
    </div>
  );
}
