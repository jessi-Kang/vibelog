import React from 'react';
import { Badge } from '../../components/core/Badge.jsx';
import { Tag } from '../../components/core/Tag.jsx';
import { Input } from '../../components/forms/Input.jsx';
import { Button } from '../../components/core/Button.jsx';
const mono = { fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' };
function Bubble({ children, time, mine }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', gap: 4 }}>
      <div style={{ maxWidth: '92%', background: mine ? 'var(--accent-soft)' : 'var(--surface-raised)', border: '1px solid ' + (mine ? 'var(--accent-line)' : 'var(--border-default)'), borderRadius: 16, borderBottomLeftRadius: mine ? 16 : 6, borderBottomRightRadius: mine ? 6 : 16, padding: '12px 14px', fontSize: 'var(--text-base)', lineHeight: 1.55, color: 'var(--text-body)' }}>{children}</div>
      <span style={{ ...mono, padding: '0 4px' }}>{time}</span>
    </div>
  );
}
function Keyboard({ onPick, disabled }) {
  const b = (g, l, tone) => <button type="button" disabled={disabled} onClick={() => onPick(g)} style={{ flex: 1, minHeight: 44, background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: disabled ? 'var(--text-muted)' : tone, fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', fontWeight: 700, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? .5 : 1 }}>{g} {l}</button>;
  return <div style={{ display: 'flex', gap: 6 }}>{b('✅', '게시', 'var(--accent)')}{b('✏️', '수정', 'var(--text-body)')}{b('❌', '반려', 'var(--danger)')}</div>;
}
export function Approval() {
  const [state, setState] = React.useState(null);
  const [note, setNote] = React.useState('');
  return (
    <div style={{ width: '100%', maxWidth: 'var(--content-max-mobile)', minHeight: '100vh', margin: '0 auto', background: 'var(--bg-deep)', color: 'var(--text-body)', fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ position: 'sticky', top: 0, background: 'var(--surface-page)', borderBottom: '1px solid var(--border-default)', padding: '14px var(--page-pad)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 15 }}>v</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}><b style={{ fontSize: 'var(--text-md)' }}>vibelog bot</b><span style={mono}>승인 큐 · 대기 1</span></div>
      </header>
      <main style={{ flex: 1, padding: '20px var(--page-pad) 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ alignSelf: 'center', ...mono, letterSpacing: '.08em' }}>2026-09-14 · 23:04</div>
        <Bubble time="23:04">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><Badge tone="warn">approve</Badge><span style={{ ...mono, color: 'var(--text-body)', fontWeight: 700 }}>devlog · vibelog · 2026-09-14</span></div>
            <div style={{ fontSize: 'var(--text-md)', fontWeight: 900, lineHeight: 1.35 }}>GitHub 액션으로 데브로그 자동 생성</div>
            <div style={{ color: 'var(--text-muted)' }}>topic이 vibelog인 레포를 밤 11시에 훑어서 하루치 글을 씁니다. 이 글이 첫 자동 생성 글입니다. 삽질: GH_PAT 없이 public API만 쓰다가 rate limit…</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><Tag>커밋 4 + PR 1</Tag><Tag>ko · en</Tag><Tag tone="accent">쇼츠 0:39</Tag></div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--surface-inset)', border: '1px solid var(--border-default)', borderRadius: 12, padding: 10 }}>
              <div style={{ width: 54, height: 96, borderRadius: 8, background: 'var(--bg)', backgroundImage: 'var(--stage-halo)', border: '1px solid var(--border-default)', display: 'grid', placeItems: 'center', color: 'var(--accent)', fontFamily: 'var(--font-mono)', flex: 'none' }}>▶</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}><span style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>ship it · KO</span><span style={mono}>1080×1920 · 39s · 클론 보이스</span><span style={mono}>EN 버전 렌더 중 (1:20 남음)</span></div>
            </div>
            <div style={mono}>게시 = 블로그 배포 + YouTube 쇼츠 + Instagram 릴스</div>
          </div>
        </Bubble>
        <Keyboard disabled={!!state} onPick={setState} />
        {state === '✏️' && !note.trim() && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><Input label="수정 요청" multiline placeholder="예: 삽질 부분을 더 짧게, 존댓말 유지" hint="답장하면 Claude가 다시 씁니다" onChange={e => e.target.value.length > 12 && setNote(e.target.value)} /></div>
        )}
        {state === '✅' && <><Bubble mine time="23:06">✅</Bubble><Bubble time="23:07"><div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><span><b style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>✓</b> 게시됐습니다.</span><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><Tag tone="accent" href="#">↗ blog</Tag><Tag tone="accent" href="#">↗ youtube</Tag><Tag href="#">instagram · EN 렌더 후</Tag></div></div></Bubble></>}
        {state === '❌' && <><Bubble mine time="23:06">❌</Bubble><Bubble time="23:06"><span><b style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>×</b> 반려했습니다. 이 날짜는 다음 실행(23:00)에 다시 생성합니다. 원인을 커밋 메시지에 남겨두면 글이 좋아집니다.</span></Bubble></>}
        {state === '✏️' && note.trim() && <><Bubble mine time="23:06">{note}</Bubble><Bubble time="23:08"><span><b style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>→</b> 다시 썼습니다. 미리보기를 다시 보냅니다.</span></Bubble></>}
        {state && <Button variant="ghost" size="sm" onClick={() => { setState(null); setNote(''); }} style={{ alignSelf: 'center' }}>처음으로</Button>}
      </main>
    </div>
  );
}
