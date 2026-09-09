import React from 'react';
import { DevlogEntry } from '../../components/vibelog/DevlogEntry.jsx';
import { EmptyState } from '../../components/feedback/EmptyState.jsx';
import { SectionHeader } from '../../components/navigation/SectionHeader.jsx';
import { ProjectFilter } from '../../components/navigation/ProjectFilter.jsx';
import { Button } from '../../components/core/Button.jsx';
import { DEVLOGS, PROJECTS, MANY_PROJECTS, DOW } from './Data.jsx';
const PAGE = 10;
export function Feed({ go, empty, many }) {
  const projects = many ? MANY_PROJECTS : PROJECTS;
  const [f, setF] = React.useState(empty ? 'wallet-notes' : 'all');
  const [n, setN] = React.useState(PAGE);
  const all = DEVLOGS.filter(d => f === 'all' || d.repo === f);
  const list = all.slice(0, n);
  const proj = projects.find(p => p.slug === f);
  const counts = { all: DEVLOGS.length }; DEVLOGS.forEach(d => { counts[d.repo] = (counts[d.repo] || 0) + 1; });
  const sorted = [...projects].sort((a, b) => (counts[b.slug] || 0) - (counts[a.slug] || 0));
  return (
    <>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--section-head-gap)' }}>
      <SectionHeader title="데브로그" aside={all.length ? all.length + '편 · 하루 한 글' : undefined} />
      <ProjectFilter projects={sorted} value={f} onChange={v => { setF(v); setN(PAGE); }} counts={counts} />
      </section>
      {list.length === 0
        ? <EmptyState title={proj ? proj.name + '에는 아직 글이 없습니다' : '아직 글이 없습니다'} body={proj && proj.status === 'paused' ? proj.lastActive + '부터 커밋이 없습니다. 다시 움직이면 그날 밤 글이 올라옵니다.' : '커밋이 생기면 다음 23:00 실행에 올라옵니다.'} action={<Button variant="secondary" size="sm" onClick={() => setF('all')}>전체 보기</Button>} />
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {list.map((d, i) => <DevlogEntry key={d.id} date={d.date + ' · ' + DOW[d.dow]} repo={d.repo} title={d.title} summary={d.summary} last={i === list.length - 1} onClick={() => go('post', d.id)}
              meta={['커밋 ' + d.commits + (d.prs ? ' · PR ' + d.prs : ''), ...(d.fails ? [{ text: '삽질 ' + d.fails, tone: 'warn' }] : [])]} />)}
          </div>}
      {all.length > n && <Button variant="secondary" full onClick={() => setN(n + PAGE)}>이전 글 {Math.min(PAGE, all.length - n)}편 더</Button>}
    </>
  );
}
