import React from 'react';
import { SectionHeader } from '../../components/navigation/SectionHeader.jsx';
import { EmptyState } from '../../components/feedback/EmptyState.jsx';
import { DEVLOGS } from './Data.jsx';
import { useBreakpoint } from './useBreakpoint.jsx';
export function ShortsTab({ go, empty }) {
  const bp = useBreakpoint();
  const items = empty ? [] : [{ d: DEVLOGS[0], tpl: 'ship it', len: '0:39', hook: '블로그를 만들었는데 글은 제가 안 씁니다' }];
  const pending = empty ? [] : [DEVLOGS[1], DEVLOGS[2]];
  return (
    <>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--section-head-gap)' }}>
      <SectionHeader title="쇼츠" aside={items.length ? items.length + '편 · 30~45초' : undefined} />
      {items.length === 0 && <EmptyState title="아직 쇼츠가 없습니다" body="쇼츠는 데브로그가 승인된 뒤 같은 밤에 렌더됩니다(ElevenLabs 내레이션 + Remotion). 첫 편은 배포 커밋이 있는 날에 나옵니다." hint="content/shorts/<repo>/<date>.json" />}
      {items.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: bp === 'desktop' ? 'repeat(4, minmax(0,1fr))' : bp === 'tablet' ? 'repeat(3, minmax(0,1fr))' : 'repeat(2, minmax(0,1fr))', gap: bp === 'mobile' ? 12 : 20 }}>
        {items.map(({ d, tpl, len, hook }) => (
          <div key={d.id} onClick={() => go('post', d.id)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ aspectRatio: '9 / 16', borderRadius: 'var(--radius-lg)', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', position: 'relative', overflow: 'hidden', backgroundImage: 'var(--stage-halo)' }}>
              <div style={{ position: 'absolute', top: 12, left: 12, right: 12, fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}><b style={{ color: 'var(--accent)' }}>vibelog</b> · day 01</div>
              <div style={{ position: 'absolute', left: 14, right: 14, top: '38%', fontSize: 17, fontWeight: 900, lineHeight: 1.15, letterSpacing: '-.01em', wordBreak: 'keep-all', textWrap: 'balance' }}>{hook}</div>
              <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12, display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}><span>{tpl}</span><span>▶ {len}</span></div>
            </div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, lineHeight: 1.4, textWrap: 'pretty', wordBreak: 'keep-all' }}>{d.title}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>{d.repo} · {d.date.slice(5).replace('-', '.')}</div>
          </div>
        ))}
      </div>}
      </section>
      {pending.length > 0 && <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--section-head-gap)' }}>
        <SectionHeader title="렌더 대기" aside={pending.length + '편'} />
        <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          {pending.map(d => <div key={d.id} onClick={() => go('post', d.id)} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 4px', borderBottom: '1px solid var(--border-default)', cursor: 'pointer' }}><span style={{ color: 'var(--text-soft)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</span><span style={{ whiteSpace: 'nowrap' }}>{d.fails ? '오늘의 삽질' : 'before / after'} · 대본 대기</span></div>)}
        </div>
      </section>}
    </>
  );
}
