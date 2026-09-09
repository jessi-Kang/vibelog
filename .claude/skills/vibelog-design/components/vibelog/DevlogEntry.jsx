import React from 'react';
const Meta = ({ repo, meta }) => (
  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>
    {repo && <span style={{ color: 'var(--text-soft)' }}>{repo}</span>}
    {meta.map((m, i) => <span key={i} style={{ color: m.tone === 'warn' ? 'var(--warn)' : m.tone === 'accent' ? 'var(--accent)' : undefined }}>{m.text || m}</span>)}
  </div>
);
export function DevlogEntry({ date, repo, title, summary, meta = [], compact, last, onClick, style }) {
  const [h, setH] = React.useState(false);
  if (compact) return (
    <article onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', gap: 14, padding: '14px 18px', borderBottom: last ? 0 : '1px solid var(--border-default)', alignItems: 'start', cursor: onClick ? 'pointer' : undefined, background: h && onClick ? 'var(--surface-raised)' : 'transparent', transition: 'background var(--dur-fast)', ...style }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', lineHeight: 1.6, color: 'var(--text-muted)', paddingTop: 2 }}>{date}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-md)', fontWeight: 700, lineHeight: 1.4, color: 'var(--text-body)', textWrap: 'pretty', wordBreak: 'keep-all' }}>{title}</div>
        <Meta repo={repo} meta={meta} />
      </div>
    </article>
  );
  return (
    <article onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{ position: 'relative', paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 6, cursor: onClick ? 'pointer' : undefined, ...style }}>
      {!last && <div style={{ position: 'absolute', left: 3.5, top: 16, bottom: -28, width: 1, background: 'var(--line)' }} />}
      <div style={{ position: 'absolute', left: 0, top: 6, width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
      <div style={{ display: 'flex', gap: 10, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}><span>{date}</span>{repo && <span style={{ color: 'var(--text-soft)' }}>{repo}</span>}</div>
      <h3 style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 'var(--text-lg)', fontWeight: 700, lineHeight: 1.35, color: h && onClick ? 'var(--accent)' : 'var(--text-body)', textWrap: 'pretty', wordBreak: 'keep-all', transition: 'color var(--dur-fast)' }}>{title}</h3>
      {summary && <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)', color: 'var(--text-muted)', lineHeight: 1.6, textWrap: 'pretty', wordBreak: 'keep-all' }}>{summary}</p>}
      {meta.length > 0 && <Meta meta={meta} />}
    </article>
  );
}
