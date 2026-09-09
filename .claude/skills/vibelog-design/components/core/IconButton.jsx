import React from 'react';
export function IconButton({ label, size = 'md', tone = 'neutral', active, children, style, ...rest }) {
  const [h, setH] = React.useState(false);
  const d = size === 'sm' ? 32 : 44;
  const color = tone === 'accent' ? 'var(--accent)' : tone === 'danger' ? 'var(--danger)' : active ? 'var(--text-body)' : 'var(--text-muted)';
  return (
    <button type="button" aria-label={label} title={label} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ width: d, height: d, display: 'inline-grid', placeItems: 'center', borderRadius: 'var(--radius-md)', cursor: 'pointer',
        background: active || h ? 'var(--surface-raised)' : 'transparent', border: '1px solid ' + (active ? 'var(--border-default)' : 'transparent'),
        color, fontFamily: 'var(--font-mono)', fontSize: size === 'sm' ? 14 : 18, fontWeight: 700, lineHeight: 1,
        transition: 'background var(--dur-fast) var(--ease)', ...style }} {...rest}>
      {children}
    </button>
  );
}
