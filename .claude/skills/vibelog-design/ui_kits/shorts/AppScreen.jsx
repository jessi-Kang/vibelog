import React from 'react';
import { StatusBadge } from '../../components/vibelog/StatusBadge.jsx';
const cards = [
  ['vibelog', 'building', '바이브 코딩 프로젝트 제작기를 자동으로 쓰는 블로그. 이 사이트 자체.', 'Next.js · Vercel · 오늘 커밋 7개', true],
  ['job-board', 'live', '채용 공고 모아서 매일 아침 브리핑해주는 개인용 보드.', 'Python · 3일 전'],
  ['wallet-notes', 'paused', '가계부 메모를 음성으로 남기면 정리해주는 실험.', 'Swift · 6주 전'],
];
export function AppScreen({ uniform, offset = 0 }) {
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, padding: '100px 36px 40px', transform: 'translateY(' + offset + 'px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 34 }}><h2 style={{ fontWeight: 900, fontSize: 56, margin: 0, letterSpacing: '.01em' }}>vibelog</h2><span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: 'var(--muted)' }}>3 projects</span></div>
      {cards.map(([n, s, d, l, hl]) => (
        <div key={n} style={{ background: 'var(--panel-2)', border: '2px solid ' + (hl ? 'var(--accent)' : 'var(--line)'), boxShadow: hl ? '0 0 0 6px var(--accent-glow)' : 'none', borderRadius: 28, padding: '30px 32px', marginBottom: 22, minHeight: uniform ? 210 : undefined, boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ margin: 0, fontSize: 36, fontWeight: 900 }}>{n}</h3><StatusBadge status={s} variant="pill" style={{ fontSize: 20, padding: '8px 16px' }} /></div>
          <p style={{ margin: '14px 0 0', fontSize: 26, color: 'var(--muted)', lineHeight: 1.4, wordBreak: 'keep-all' }}>{d}</p>
          <div style={{ marginTop: 18, fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--muted)' }}>{l}</div>
        </div>
      ))}
    </div>
  );
}
