import React from 'react';
import { Stage } from './Stage.jsx';
const Box = ({ lab, good, children, verdict }) => (
  <div style={{ background: 'var(--panel)', border: '2px solid var(--line)', borderRadius: 28, padding: '34px 38px' }}>
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, letterSpacing: '.1em', textTransform: 'uppercase', color: good ? 'var(--accent)' : 'var(--muted)', marginBottom: 16 }}>{lab}</div>
    <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 30, lineHeight: 1.5, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>{children}</pre>
    <div style={{ marginTop: 18, fontSize: 30, fontWeight: 700 }}>{verdict}</div>
  </div>
);
export function Sapjil() {
  return (
    <Stage day="02" tag="오늘의 삽질" caption="커밋 메시지에 ^'왜'가 없었거든요" progress={1} time="00:21" total="00:39" played={.54}>
      <div style={{ position: 'absolute', left: 80, right: 80, top: 300 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 30, letterSpacing: '.1em', color: 'var(--warn)', textTransform: 'uppercase' }}>오늘의 삽질</div>
        <h2 style={{ fontWeight: 900, letterSpacing: '-.02em', fontSize: 110, lineHeight: 1.05, margin: '20px 0 60px', textWrap: 'balance', wordBreak: 'keep-all' }}>AI가 쓴 글이<br />밍밍했어요</h2>
        <div style={{ display: 'grid', gap: 28 }}>
          <Box lab="before · 커밋 메시지" verdict={'→ "레이아웃을 고쳤다." 끝.'}>fix layout</Box>
          <Box lab="after · CLAUDE.md 규칙 하나" good verdict={'→ 글에 "왜"가 생겼어요'}>카드 높이 통일<span style={{ color: 'var(--muted)' }}>{'\n\n왜: 설명 길이가 다르면 그리드가\n들쭉날쭉해서 모바일에서 산만함'}</span></Box>
        </div>
      </div>
    </Stage>
  );
}
