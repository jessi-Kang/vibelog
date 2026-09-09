import React from 'react';
import { Select } from '../forms/Select.jsx';
export function ProjectFilter({ projects = [], value = 'all', onChange, counts = {}, maxChips = 8, style }) {
  const all = [{ slug: 'all', name: '전체' }, ...projects];
  if (projects.length > maxChips) {
    const opts = all.map(p => ({ value: p.slug, label: p.name + (counts[p.slug] != null ? '  ·  ' + counts[p.slug] : '') }));
    return <Select mono value={value} onChange={onChange} options={opts} style={{ maxWidth: 320, ...style }} />;
  }
  return (
    <div role="tablist" style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', margin: '0 -4px', padding: '2px 4px', ...style }}>
      {all.map(p => { const on = p.slug === value; return (
        <button key={p.slug} role="tab" type="button" aria-selected={on} onClick={() => onChange && onChange(p.slug)}
          style={{ flex: 'none', minHeight: 32, padding: '0 12px', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: on ? 700 : 500, whiteSpace: 'nowrap',
            background: on ? 'var(--surface-raised)' : 'transparent', color: on ? 'var(--text-body)' : 'var(--text-muted)', border: '1px solid ' + (on ? 'var(--border-strong)' : 'var(--border-default)'), transition: 'background var(--dur-fast), color var(--dur-fast)' }}>
          {p.name}{counts[p.slug] != null && <span style={{ marginLeft: 6, color: on ? 'var(--text-muted)' : 'var(--line-strong)' }}>{counts[p.slug]}</span>}
        </button>); })}
    </div>
  );
}
