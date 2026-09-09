import React from 'react';
import { Card } from '../core/Card.jsx';
import { StatusBadge, STATUS } from './StatusBadge.jsx';
export function ProjectCard({ name, status = 'building', description, stack = [], url, commits = 0, lastActive, onClick, style }) {
  const s = STATUS[status] || STATUS.building;
  const meta = [stack.join(' · '), commits > 0 ? '이번 주 커밋 ' + commits : null, lastActive].filter(Boolean);
  return (
    <Card stripe={s.stripe} dim={status === 'paused'} padding="18px 20px" onClick={onClick} style={{ display: 'flex', flexDirection: 'column', gap: 10, ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-body)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</h3>
        <StatusBadge status={status} />
      </div>
      {description && <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)', color: 'var(--text-muted)', lineHeight: 1.55, textWrap: 'pretty', wordBreak: 'keep-all' }}>{description}</p>}
      <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', paddingTop: 2 }}>
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta.join(' · ')}</span>
        {url && <a href={url} onClick={e => e.stopPropagation()} style={{ color: 'var(--accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}>열기 ↗</a>}
      </div>
    </Card>
  );
}
