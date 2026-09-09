import React from 'react';
import { Tabs } from '../../components/navigation/Tabs.jsx';
import { Card } from '../../components/core/Card.jsx';
import { EmptyState } from '../../components/feedback/EmptyState.jsx';
import { DEVLOGS, PROJECTS, DOW } from './Data.jsx';
import { useBreakpoint } from './useBreakpoint.jsx';
const H = ({ children, tone, style }) => <h2 style={{ margin: '0 0 8px', ...style, fontFamily: 'var(--font-sans)', fontSize: 'var(--text-md)', fontWeight: 700, color: tone === 'warn' ? 'var(--warn)' : 'var(--text-body)' }}>{children}</h2>;
const P = ({ children, muted }) => <p style={{ margin: 0, fontSize: 'var(--text-md)', lineHeight: 1.75, color: muted ? 'var(--text-muted)' : 'var(--text-soft)', textWrap: 'pretty', wordBreak: 'keep-all' }}>{children}</p>;
export function DevlogPost({ id, go }) {
  const d = DEVLOGS.find(x => x.id === id) || DEVLOGS[0];
  const p = PROJECTS.find(x => x.slug === d.repo);
  const [lang, setLang] = React.useState('ko');
  const desktop = useBreakpoint() !== 'mobile';
  const noFail = !d.body.fail || d.body.fail === '없음.';
  const en = lang === 'en';
  return (
    <>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          <span>{d.date} · {DOW[d.dow]} &nbsp;<span style={{ color: 'var(--text-soft)', cursor: 'pointer' }} onClick={() => go('project', d.repo)}>{d.repo} →</span></span>
          <Tabs items={[{ value: 'ko', label: 'KO' }, { value: 'en', label: 'EN' }]} value={lang} onChange={setLang} />
        </div>
        <h1 style={{ margin: 0, fontSize: desktop ? 28 : 'var(--text-xl)', fontWeight: 700, lineHeight: 1.3, letterSpacing: '-.01em', textWrap: 'balance', wordBreak: 'keep-all' }}>{d.title}</h1>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>AI가 커밋 {d.commits}{d.prs ? '개 · PR ' + d.prs : ''}개로 작성{p ? ' · day ' + String(p.day).padStart(2, '0') : ''}{d.short ? ' · 쇼츠 있음' : ''}</div>
      </section>
      {en && <EmptyState compact title="영어 번역이 아직 없습니다" body="번역은 한국어 글이 승인된 뒤 같은 실행에서 만들어집니다. 이 글은 승인 대기 중입니다." action={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--accent)', cursor: 'pointer' }} onClick={() => setLang('ko')}>한국어로 읽기 →</span>} />}
      {!en && <>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div><H>뭘 했다</H><P>{d.body.did}</P></div>
          <div><H>왜</H><P>{d.body.why}</P></div>
          <div><H tone="warn">삽질 포인트</H>{noFail ? <P muted>오늘은 없었습니다. 커밋 {d.commits}개가 한 번에 붙었습니다.</P> : <P>{d.body.fail}</P>}</div>
          <div><H>다음 할 것</H><P>{d.body.next}</P></div>
          <div><H>스크린샷</H>
            {p && p.url
              ? <div style={{ aspectRatio: '390 / 260', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>playwright 캡처 · {d.repo} · {d.date}</div>
              : <EmptyState compact title="스크린샷이 없습니다" body="레포에 homepage(배포 URL)가 없어 캡처를 건너뛰었습니다. URL을 채우면 다음 실행부터 매일 찍습니다." hint="gh repo edit --homepage https://…" />}
          </div>
        </section>
        {d.short
          ? <Card padding="14px 18px" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 48, height: 84, borderRadius: 6, background: 'var(--bg-deep)', border: '1px solid var(--border-default)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: 13, flex: 'none' }}>▶</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}><div style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>이 글의 쇼츠 · 39초</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>ship it · ko · en</div></div>
            </Card>
          : <EmptyState compact title="이 글의 쇼츠는 아직 없습니다" body="쇼츠는 배포 커밋이 있거나 삽질이 뚜렷한 날만 만듭니다. 이 날은 조건에 걸리지 않았습니다." />}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--section-head-gap)' }}>
          <H style={{ margin: 0 }}>원료 · git log</H>
          <Card inset padding="4px 18px">
            {d.shas.map(([sha, m], i) => <div key={sha} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < d.shas.length - 1 ? '1px solid var(--border-default)' : 0, fontSize: 'var(--text-sm)', lineHeight: 1.5 }}><span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', flex: 'none', paddingTop: 2 }}>{sha}</span><span style={{ color: 'var(--text-soft)', wordBreak: 'keep-all' }}>{m}</span></div>)}
          </Card>
        </section>
      </>}
      <a href="#" onClick={e => { e.preventDefault(); go('project', d.repo); }} style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--accent)', textDecoration: 'none' }}>{d.repo}의 다른 날 →</a>
    </>
  );
}
