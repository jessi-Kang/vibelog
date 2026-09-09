import React from 'react';
import { ProjectCard } from '../../components/vibelog/ProjectCard.jsx';
import { RunLog } from '../../components/vibelog/RunLog.jsx';
import { DevlogEntry } from '../../components/vibelog/DevlogEntry.jsx';
import { EmptyState } from '../../components/feedback/EmptyState.jsx';
import { SectionHeader } from '../../components/navigation/SectionHeader.jsx';
import { Card } from '../../components/core/Card.jsx';
import { PROJECTS, MANY_PROJECTS, DEVLOGS, RUN, fmtShort } from './Data.jsx';
import { Button } from '../../components/core/Button.jsx';
import { StatusBadge } from '../../components/vibelog/StatusBadge.jsx';
import { useBreakpoint } from './useBreakpoint.jsx';
const RECENT_MAX = 5;
export function Home({ go, empty, many }) {
  const bp = useBreakpoint();
  const mobile = bp === 'mobile', desktop = bp === 'desktop', tablet = bp === 'tablet';
  const [showRest, setShowRest] = React.useState(false);
  const projects = empty ? [] : many ? MANY_PROJECTS : PROJECTS, devlogs = empty ? [] : DEVLOGS, run = empty ? [] : RUN;
  const active = projects.filter(p => p.status === 'building' || p.status === 'live');
  const rest = projects.filter(p => p.status !== 'building' && p.status !== 'live');
  const collapse = projects.length > 4 && rest.length > 0;
  const shown = collapse && !showRest ? active : projects;
  const activeToday = projects.filter(p => p.lastActive === '오늘').length;
  const col = { display: 'flex', flexDirection: 'column', gap: 'var(--section-head-gap)' };
  const facts = empty ? [[0, 'projects'], ['—', '첫 실행 대기']] : [[projects.length, 'projects'], [active.length, '만드는 중'], [activeToday, '오늘 움직임'], [many ? 87 : 12, '데브로그']];
  const Intro = (
    <section style={{ display: 'grid', gridTemplateColumns: desktop ? 'minmax(0,1fr) auto' : '1fr', alignItems: 'end', gap: mobile ? 16 : desktop ? 40 : 20, padding: mobile ? '4px 0 0' : desktop ? '20px 0 8px' : '12px 0 4px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: mobile ? 8 : 12 }}>
        <h1 style={{ margin: 0, fontSize: mobile ? 24 : desktop ? 34 : 28, fontWeight: 700, lineHeight: 1.25, letterSpacing: '-.015em', wordBreak: 'keep-all', textWrap: 'balance', maxWidth: '22ch' }}>만들고 있는 것들의 <span style={{ color: 'var(--accent)' }}>기록</span></h1>
        <p style={{ margin: 0, fontSize: mobile ? 'var(--text-md)' : 16, color: 'var(--text-muted)', lineHeight: 1.65, wordBreak: 'keep-all', textWrap: mobile ? 'pretty' : 'nowrap' }}>바이브 코딩으로 만드는 서비스들의 제작기. 데브로그는 매일 밤 커밋에서 자동으로 만들어집니다.</p>
      </div>
      <div style={{ display: 'flex', gap: desktop ? 28 : 20, flexWrap: 'wrap', justifyContent: desktop ? 'flex-end' : 'flex-start', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', paddingTop: desktop ? 0 : 14, borderTop: desktop ? 0 : '1px solid var(--border-default)', lineHeight: 1.4 }}>
        {facts.map(([n, l]) => <span key={l} style={{ display: 'inline-flex', flexDirection: desktop ? 'column' : 'row', alignItems: desktop ? 'flex-end' : 'baseline', gap: desktop ? 2 : 6 }}><b style={{ fontFamily: 'var(--font-sans)', fontSize: desktop ? 22 : 15, fontWeight: 700, color: n === 0 || n === '—' ? 'var(--text-muted)' : 'var(--accent)', letterSpacing: '-.01em' }}>{n}</b><span>{l}</span></span>)}
      </div>
    </section>
  );
  const Projects = (
    <section style={col}>
      <SectionHeader title="프로젝트" aside={projects.length > 4 ? '최근 활동순 · ' + projects.length : undefined} />
      {projects.length === 0
        ? <EmptyState title="아직 등록된 프로젝트가 없습니다" body="GitHub 레포에 topic 하나를 달면 다음 23:00 실행에 카드가 생깁니다. 설명과 홈페이지는 레포 정보를 그대로 씁니다." hint="gh repo edit --add-topic vibelog" />
        : <div style={{ display: 'grid', gridTemplateColumns: bp === 'tablet' || (desktop && projects.length > 6) ? 'repeat(2, minmax(0,1fr))' : '1fr', gap: 12 }}>{shown.map(p => <ProjectCard key={p.slug} {...p} onClick={() => go('project', p.slug)} />)}</div>}
      {collapse && !showRest && (
        <Card padding={0}>
          {rest.map((p, i) => <div key={p.slug} onClick={() => go('project', p.slug)} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--border-default)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}><span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-soft)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span><StatusBadge status={p.status} /><span style={{ width: 52, textAlign: 'right' }}>{p.lastActive}</span></div>)}
          <div style={{ padding: '8px 10px' }}><Button variant="ghost" size="sm" onClick={() => setShowRest(true)}>쉬는 프로젝트 {rest.length}개 카드로 펼치기</Button></div>
        </Card>
      )}
    </section>
  );
  const Run = (
    <section style={col}>
      <SectionHeader title="지난 실행" aside={run.length ? '09-14 23:00' : undefined} />
      {run.length === 0
        ? <EmptyState compact title="아직 실행 기록이 없습니다" body="매일 23:00 KST에 자동으로 돌고, 지금 바로 돌릴 수도 있습니다." hint="gh workflow run devlog.yml" />
        : <RunLog lines={run} />}
    </section>
  );
  const Recent = (
    <section style={col}>
      <SectionHeader title="최근 데브로그" aside={devlogs.length ? '전체 →' : undefined} href="#feed" />
      {devlogs.length === 0
        ? <EmptyState compact title="아직 글이 없습니다" body="topic이 달린 레포에 커밋이 생기면 그날 밤 첫 글이 올라옵니다. 활동 없는 날은 건너뜁니다." />
        : <Card padding={0}>{devlogs.slice(0, RECENT_MAX).map((d, i, a) => <DevlogEntry key={d.id} compact last={i === a.length - 1} date={fmtShort(d.date)} repo={d.repo} title={d.title}
            meta={['커밋 ' + d.commits + (d.prs ? ' · PR ' + d.prs : ''), ...(d.fails ? [{ text: '삽질 ' + d.fails, tone: 'warn' }] : [])]} onClick={() => go('post', d.id)} />)}</Card>}
    </section>
  );
  return (
    <>
      {Intro}
      {desktop
        ? <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 40, alignItems: 'start' }}>{Projects}<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--section-gap-desktop)' }}>{Run}{Recent}</div></div>
        : tablet
          ? <>{Projects}<div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 24, alignItems: 'start' }}>{Run}{Recent}</div></>
          : <>{Projects}{Run}{Recent}</>}
    </>
  );
}
