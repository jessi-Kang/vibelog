import React from 'react';
import { StatusBadge } from '../../components/vibelog/StatusBadge.jsx';
import { DevlogEntry } from '../../components/vibelog/DevlogEntry.jsx';
import { EmptyState } from '../../components/feedback/EmptyState.jsx';
import { SectionHeader } from '../../components/navigation/SectionHeader.jsx';
import { MANY_PROJECTS, DEVLOGS, DOW } from './Data.jsx';
const PROJECTS = MANY_PROJECTS;
import { useBreakpoint } from './useBreakpoint.jsx';
export function ProjectDetail({ slug, go }) {
  const p = PROJECTS.find(x => x.slug === slug) || PROJECTS[0];
  const logs = DEVLOGS.filter(d => d.repo === p.slug);
  const bp = useBreakpoint();
  const desktop = bp === 'desktop', tablet = bp === 'tablet';
  const facts = [['상태', <StatusBadge status={p.status} />], ['스택', p.stack.join(' · ') || '—'], ['이번 주 커밋', p.commits || '0'], ['마지막 활동', p.lastActive], ['데브로그', logs.length + '편'], ['시작', 'day ' + String(p.day).padStart(2, '0')]];
  const Head = (
    <section style={{ display: tablet ? 'grid' : 'flex', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', flexDirection: 'column', gap: tablet ? '16px 40px' : 16, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h1 style={{ margin: 0, fontSize: desktop ? 26 : 'var(--text-xl)', fontWeight: 700, letterSpacing: '-.01em' }}>{p.name}</h1>
      <p style={{ margin: 0, fontSize: 'var(--text-md)', color: 'var(--text-soft)', lineHeight: 1.6, textWrap: 'pretty', wordBreak: 'keep-all' }}>{p.description}</p>
      {p.url && <a href={p.url} style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--accent)', textDecoration: 'none' }}>{p.slug}.vercel.app ↗</a>}
      </div>
      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', gap: '8px 16px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', alignItems: 'baseline' }}>
        {facts.map(([k, v]) => <React.Fragment key={k}><dt style={{ color: 'var(--text-muted)' }}>{k}</dt><dd style={{ margin: 0, color: 'var(--text-body)' }}>{v}</dd></React.Fragment>)}
      </dl>
      {p.stack.length === 0 && <EmptyState compact title="아직 레포 정보가 비어 있습니다" body="description · homepage · language를 채우면 다음 실행에 카드가 채워집니다." hint={'gh repo edit ' + p.slug + ' --description "…"'} />}
    </section>
  );
  const Timeline = (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--section-head-gap)' }}>
      <SectionHeader title="데브로그" aside={logs.length ? logs.length + '편 · 하루 한 글' : undefined} />
      {logs.length === 0
        ? <EmptyState title={p.status === 'paused' ? p.lastActive + '부터 조용해서 글이 없습니다' : '아직 이 프로젝트의 글이 없습니다'} body="활동이 없는 날은 건너뜁니다. 커밋이 생기면 다음 23:00 실행에 첫 글이 올라옵니다. 커밋 본문에 '왜'를 쓰면 글이 덜 밍밍해집니다." hint={'git log --since=today ' + p.slug} />
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {logs.map((d, i) => <DevlogEntry key={d.id} date={d.date + ' · ' + DOW[d.dow]} title={d.title} summary={d.summary} last={i === logs.length - 1} onClick={() => go('post', d.id)}
              meta={['커밋 ' + d.commits + (d.prs ? ' · PR ' + d.prs : ''), ...(d.fails ? [{ text: '삽질 ' + d.fails, tone: 'warn' }] : []), ...(d.short ? [{ text: '쇼츠 ▶', tone: 'accent' }] : [])]} />)}
          </div>}
    </section>
  );
  return desktop
    ? <div style={{ display: 'grid', gridTemplateColumns: '340px minmax(0,1fr)', gap: 48, alignItems: 'start' }}><div style={{ position: 'sticky', top: 90 }}>{Head}</div>{Timeline}</div>
    : <>{Head}{Timeline}</>;
}
