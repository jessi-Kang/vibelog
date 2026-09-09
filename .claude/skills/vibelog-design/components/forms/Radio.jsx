import React from 'react';
export function Radio({ name, options = [], value, onChange, style }) {
  return (
    <div role="radiogroup" style={{ display: 'flex', flexDirection: 'column', ...style }}>
      {options.map(o => { const v = typeof o === 'string' ? o : o.value, l = typeof o === 'string' ? o : o.label, on = v === value;
        return (
          <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)', color: 'var(--text-body)' }}>
            <input type="radio" name={name} checked={on} onChange={() => onChange && onChange(v)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
            <span style={{ width: 20, height: 20, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--surface-inset)', border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border-strong)'), transition: 'border-color var(--dur-fast)' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: on ? 'var(--accent)' : 'transparent', boxShadow: on ? 'var(--shadow-dot)' : 'none' }} />
            </span>
            {l}
          </label>
        ); })}
    </div>
  );
}
