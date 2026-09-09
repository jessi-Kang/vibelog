import React from 'react';
export function Tooltip({ label, children, style }) {
  const [on, setOn] = React.useState(false);
  return (
    <span onMouseEnter={() => setOn(true)} onMouseLeave={() => setOn(false)} style={{ position: 'relative', display: 'inline-flex', ...style }}>
      {children}
      {on && <span role="tooltip" style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', background: 'var(--ink)', color: 'var(--bg)',
        fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', fontWeight: 700, padding: '6px 10px', borderRadius: 'var(--radius-sm)', zIndex: 40, animation: 'vl-rise var(--dur-fast) var(--ease)' }}>{label}</span>}
    </span>
  );
}
