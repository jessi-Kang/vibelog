import React from 'react';
export function Dialog({ open, title, eyebrow, children, actions, onClose, style }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'var(--surface-overlay)', display: 'grid', placeItems: 'end center', padding: 12, zIndex: 50 }}>
      <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 430, background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 20, display: 'flex', flexDirection: 'column', gap: 14, animation: 'vl-rise var(--dur) var(--ease)', ...style }}>
        {eyebrow && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{eyebrow}</div>}
        <h3 style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-body)', lineHeight: 1.3 }}>{title}</h3>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)', color: 'var(--text-muted)', lineHeight: 1.55 }}>{children}</div>
        {actions && <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>{actions}</div>}
      </div>
    </div>
  );
}
