import React from 'react';
export function Tabs({ items = [], value, onChange, full, style }) {
  return (
    <nav role="tablist" style={{ display: 'flex', gap: 4, background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: 4, width: full ? '100%' : 'fit-content', ...style }}>
      {items.map(it => { const v = typeof it === 'string' ? it : it.value, l = typeof it === 'string' ? it : it.label, on = v === value;
        return <button key={v} role="tab" type="button" aria-selected={on} onClick={() => onChange && onChange(v)}
          style={{ flex: full ? 1 : 'none', minHeight: 36, padding: '6px 12px', borderRadius: 7, border: 0, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', fontWeight: 700,
            background: on ? 'var(--surface-raised)' : 'transparent', color: on ? 'var(--text-body)' : 'var(--text-muted)', transition: 'background var(--dur-fast) var(--ease), color var(--dur-fast)' }}>{l}</button>; })}
    </nav>
  );
}
