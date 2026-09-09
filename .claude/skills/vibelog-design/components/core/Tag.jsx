import React from 'react';
export function Tag({ children, href, tone = 'neutral', style }) {
  const base = { display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', fontWeight: 500,
    background: 'var(--surface-raised)', borderRadius: 'var(--radius-sm)', padding: '3px 8px', lineHeight: 1.5, textDecoration: 'none',
    color: tone === 'accent' ? 'var(--accent)' : tone === 'warn' ? 'var(--warn)' : 'var(--text-muted)', ...style };
  return href ? <a href={href} style={base}>{children}</a> : <span style={base}>{children}</span>;
}
