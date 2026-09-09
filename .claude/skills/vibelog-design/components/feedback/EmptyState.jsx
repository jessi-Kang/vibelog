import React from 'react';
export function EmptyState({ title, body, hint, action, compact, style }) {
  return (
    <div role="status" style={{ border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-lg)', padding: compact ? '16px 18px' : '28px 22px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start', color: 'var(--text-body)', fontFamily: 'var(--font-sans)', ...style }}>
      <div style={{ fontSize: 'var(--text-md)', fontWeight: 700, lineHeight: 1.4, wordBreak: 'keep-all' }}>{title}</div>
      {body && <p style={{ margin: 0, fontSize: 'var(--text-base)', color: 'var(--text-muted)', lineHeight: 1.6, textWrap: 'pretty', wordBreak: 'keep-all', maxWidth: '48ch' }}>{body}</p>}
      {hint && <code style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-soft)', background: 'var(--surface-raised)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', marginTop: 2 }}>{hint}</code>}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}
