import React from 'react';
export function ProgressBar({ value = 0, label, valueText, tone = 'accent', height = 6, style }) {
  const c = tone === 'warn' ? 'var(--warn)' : tone === 'muted' ? 'var(--muted)' : 'var(--accent)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {(label || valueText) && <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}><span>{label}</span><span style={{ color: value > 0 ? 'var(--text-body)' : undefined }}>{valueText}</span></div>}
      <div style={{ height, background: 'var(--line)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
        <div style={{ width: Math.max(0, Math.min(1, value)) * 100 + '%', height: '100%', background: c, borderRadius: 'var(--radius-pill)', transition: 'width var(--dur) var(--ease)' }} />
      </div>
    </div>
  );
}
