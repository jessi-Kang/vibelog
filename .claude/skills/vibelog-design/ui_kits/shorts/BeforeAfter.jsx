import React from 'react';
import { Stage } from './Stage.jsx';
import { Phone } from './Phone.jsx';
import { AppScreen } from './AppScreen.jsx';
const Lab = ({ x, good, children }) => <div style={{ position: 'absolute', top: 380, left: x, width: 460, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: good ? 'var(--accent)' : 'var(--muted)' }}>{children}</div>;
export function BeforeAfter() {
  return (
    <Stage day="03" tag="before / after" caption="^높이만 맞췄는데 훨씬 차분해졌어요" progress={1} time="00:09" total="00:31" played={.29}>
      <div style={{ position: 'absolute', left: 80, right: 80, top: 230, fontWeight: 900, fontSize: 72, lineHeight: 1.1, letterSpacing: '-.01em', wordBreak: 'keep-all' }}>카드 높이 <em style={{ fontStyle: 'normal', color: 'var(--accent)' }}>통일</em></div>
      <Lab x={60}>before</Lab><Lab x={560} good>after</Lab>
      <Phone left={290} top={440} scale={.6}><AppScreen /></Phone>
      <Phone left={790} top={440} scale={.6} style={{ borderColor: 'var(--accent)' }}><AppScreen uniform /></Phone>
    </Stage>
  );
}
