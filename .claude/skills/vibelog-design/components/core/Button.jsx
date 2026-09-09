import React from 'react';
const V = {
  primary: { background: 'var(--accent)', color: 'var(--accent-ink)', border: '1px solid var(--accent)' },
  secondary: { background: 'var(--surface-raised)', color: 'var(--text-body)', border: '1px solid var(--border-default)' },
  ghost: { background: 'transparent', color: 'var(--text-muted)', border: '1px solid transparent' },
  danger: { background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid rgba(255,107,107,.35)' },
};
const S = {
  sm: { height: 32, padding: '0 12px', fontSize: 'var(--text-sm)', borderRadius: 'var(--radius-sm)' },
  md: { height: 44, padding: '0 18px', fontSize: 'var(--text-base)', borderRadius: 'var(--radius-md)' },
  lg: { height: 52, padding: '0 24px', fontSize: 16, borderRadius: 'var(--radius-md)' },
};
export function Button({ variant = 'primary', size = 'md', disabled, full, mono, children, style, ...rest }) {
  const [h, setH] = React.useState(false);
  const [p, setP] = React.useState(false);
  return (
    <button type="button" disabled={disabled}
      onMouseEnter={() => setH(true)} onMouseLeave={() => { setH(false); setP(false); }}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)', fontWeight: 700, lineHeight: 1, letterSpacing: mono ? '.04em' : 0,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .45 : h ? .85 : 1,
        transform: p ? 'scale(.98)' : 'none', width: full ? '100%' : undefined,
        transition: 'opacity var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease)',
        ...V[variant], ...S[size], ...style }} {...rest}>
      {children}
    </button>
  );
}
