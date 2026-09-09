import React from 'react';
export function Select({ label, options = [], value, onChange, mono, style }) {
  const [f, setF] = React.useState(false);
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{label}</span>}
      <span style={{ position: 'relative', display: 'block' }}>
        <select value={value} onChange={e => onChange && onChange(e.target.value)} onFocus={() => setF(true)} onBlur={() => setF(false)}
          style={{ appearance: 'none', WebkitAppearance: 'none', width: '100%', height: 44, padding: '0 40px 0 14px', background: 'var(--surface-inset)', color: 'var(--text-body)',
            fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)', fontSize: 'var(--text-base)', border: '1px solid ' + (f ? 'var(--border-focus)' : 'var(--border-default)'),
            borderRadius: 'var(--radius-md)', outline: 'none', boxShadow: f ? 'var(--shadow-focus)' : 'none', cursor: 'pointer' }}>
          {options.map(o => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', pointerEvents: 'none', fontSize: 12 }}>▾</span>
      </span>
    </label>
  );
}
