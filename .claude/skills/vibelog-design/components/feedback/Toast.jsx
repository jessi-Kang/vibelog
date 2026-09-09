import React from 'react';
const G = { accent: '✓', warn: '!', danger: '×', neutral: '→' };
export function Toast({ tone = 'neutral', children, action, onAction, fixed, style }) {
  const c = tone === 'accent' ? 'var(--accent)' : tone === 'warn' ? 'var(--warn)' : tone === 'danger' ? 'var(--danger)' : 'var(--text-muted)';
  return (
    <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 48, padding: '10px 14px', background: 'var(--surface-raised)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
      fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-body)', animation: 'vl-rise var(--dur) var(--ease)',
      ...(fixed ? { position: 'fixed', left: 12, right: 12, bottom: 12, maxWidth: 430, margin: '0 auto', zIndex: 60 } : {}), ...style }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: c, width: 16, textAlign: 'center' }}>{G[tone]}</span>
      <span style={{ flex: 1 }}>{children}</span>
      {action && <button type="button" onClick={onAction} style={{ background: 'none', border: 0, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--accent)', padding: '6px 4px' }}>{action}</button>}
    </div>
  );
}
