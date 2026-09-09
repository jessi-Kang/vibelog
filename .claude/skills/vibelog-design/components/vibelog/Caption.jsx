import React from 'react';
export function Caption({ text = '', progress = 1, size = 62, style }) {
  const words = text.split(' ').filter(Boolean).map(w => ({ k: w.startsWith('^'), t: w.replace(/^\^/, '') }));
  const lit = Math.min(words.length, Math.floor(progress * words.length * 1.1) + (progress >= 1 ? words.length : 0));
  return (
    <div style={{ fontFamily: 'var(--font-sans)', fontSize: size, fontWeight: 900, lineHeight: 1.3, textAlign: 'center', textWrap: 'balance', wordBreak: 'keep-all', color: 'var(--ink)', textShadow: '0 4px 24px rgba(0,0,0,.6)', ...style }}>
      {words.map((w, i) => { const on = i < lit; return <span key={i}>{i > 0 ? ' ' : ''}<span style={{ opacity: on ? 1 : 'var(--caption-dim)', color: on && w.k ? 'var(--accent)' : 'inherit', transition: 'opacity var(--dur) var(--ease-out), color var(--dur) var(--ease-out)' }}>{w.t}</span></span>; })}
    </div>
  );
}
