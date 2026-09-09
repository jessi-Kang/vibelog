import React from 'react';
export function Input({ label, hint, mono, error, multiline, style, ...rest }) {
  const [f, setF] = React.useState(false);
  const El = multiline ? 'textarea' : 'input';
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-sans)', ...style }}>
      {label && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{label}</span>}
      <El onFocus={() => setF(true)} onBlur={() => setF(false)} rows={multiline ? 4 : undefined}
        style={{ minHeight: 44, padding: multiline ? '12px 14px' : '0 14px', background: 'var(--surface-inset)', color: 'var(--text-body)', fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)', fontSize: 'var(--text-base)',
          border: '1px solid ' + (error ? 'var(--danger)' : f ? 'var(--border-focus)' : 'var(--border-default)'), borderRadius: 'var(--radius-md)', outline: 'none',
          boxShadow: f ? 'var(--shadow-focus)' : 'none', transition: 'border-color var(--dur-fast), box-shadow var(--dur-fast)', resize: 'vertical', width: '100%', boxSizing: 'border-box' }} {...rest} />
      {(error || hint) && <span style={{ fontSize: 'var(--text-xs)', color: error ? 'var(--danger)' : 'var(--text-muted)' }}>{error || hint}</span>}
    </label>
  );
}
