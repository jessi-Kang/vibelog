import React from 'react';
export function Switch({ label, checked, onChange, disabled, style }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, minHeight: 44, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .45 : 1, fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)', color: 'var(--text-body)', ...style }}>
      {label}
      <input type="checkbox" role="switch" checked={!!checked} disabled={disabled} onChange={e => onChange && onChange(e.target.checked)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
      <span style={{ width: 40, height: 24, borderRadius: 'var(--radius-pill)', position: 'relative', background: checked ? 'var(--accent)' : 'var(--line-strong)', transition: 'background var(--dur-fast) var(--ease)', flex: 'none' }}>
        <span style={{ position: 'absolute', top: 3, left: checked ? 19 : 3, width: 18, height: 18, borderRadius: '50%', background: checked ? 'var(--accent-ink)' : 'var(--ink)', transition: 'left var(--dur-fast) var(--ease)' }} />
      </span>
    </label>
  );
}
