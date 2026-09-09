import React from 'react';
export function Card({ stripe, inset, padding = 20, dim, children, style, onClick }) {
  const [h, setH] = React.useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background: inset ? 'var(--surface-inset)' : 'var(--surface-card)', border: '1px solid ' + (h && onClick ? 'var(--border-strong)' : 'var(--border-default)'),
        borderTop: stripe ? 'var(--stripe) solid ' + stripe : undefined, borderRadius: 'var(--radius-lg)', padding, opacity: dim ? .8 : 1,
        cursor: onClick ? 'pointer' : undefined, transition: 'border-color var(--dur-fast) var(--ease)', ...style }}>
      {children}
    </div>
  );
}
