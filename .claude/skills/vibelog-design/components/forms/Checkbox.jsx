import React from 'react';
export function Checkbox({ label, checked, onChange, disabled, style }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minHeight: 44, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .45 : 1, fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)', color: 'var(--text-body)', ...style }}>
      <input type="checkbox" checked={!!checked} disabled={disabled} onChange={e => onChange && onChange(e.target.checked)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
      <span style={{ width: 20, height: 20, borderRadius: 'var(--radius-xs)', display: 'grid', placeItems: 'center', background: checked ? 'var(--accent)' : 'var(--surface-inset)', border: '1px solid ' + (checked ? 'var(--accent)' : 'var(--border-strong)'),
        color: 'var(--accent-ink)', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, lineHeight: 1, transition: 'background var(--dur-fast)' }}>{checked ? '✓' : ''}</span>
      {label}
    </label>
  );
}
