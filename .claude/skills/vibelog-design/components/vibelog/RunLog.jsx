import React from 'react';
import { Card } from '../core/Card.jsx';
export function RunLog({ lines = [], style }) {
  return (
    <Card inset padding="18px 20px" style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 'var(--leading-log)', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', ...style }}>
      {lines.map((l, i) => {
        if (l.cmd) return <div key={i} style={{ color: 'var(--text-body)' }}>$ {l.text}</div>;
        if (l.cur) return <div key={i} style={{ color: 'var(--accent)' }}>→ {l.text}<span style={{ animation: 'vl-blink 1s steps(1) infinite' }}>▍</span></div>;
        if (l.fail) return <div key={i}><span style={{ color: 'var(--danger)' }}>✗</span> {l.text}</div>;
        return <div key={i}><span style={{ color: 'var(--accent)' }}>✓</span> {l.text}</div>;
      })}
    </Card>
  );
}
