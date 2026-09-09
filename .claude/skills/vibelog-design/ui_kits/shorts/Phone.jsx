import React from 'react';
export function Phone({ width = 760, height = 1250, top = 260, left = '50%', scale = 1, children, style }) {
  return (
    <div style={{ position: 'absolute', left, top, transform: 'translateX(-50%) scale(' + scale + ')', transformOrigin: 'top center', width, height, borderRadius: 70, background: '#000', border: '6px solid var(--phone-bezel)', boxShadow: 'var(--shadow-phone), 0 0 0 2px var(--bg)', ...style }}>
      <div style={{ position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)', width: 240, height: 52, background: '#000', borderRadius: 999, zIndex: 3 }} />
      <div style={{ position: 'absolute', inset: 14, borderRadius: 56, overflow: 'hidden', background: 'var(--panel)' }}>{children}</div>
    </div>
  );
}
