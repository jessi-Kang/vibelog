import React from 'react';
import { Eyebrow } from '../../components/vibelog/Eyebrow.jsx';
import { Caption } from '../../components/vibelog/Caption.jsx';
import { ProgressBar } from '../../components/feedback/ProgressBar.jsx';
export function Stage({ day = '01', tag = 'ship it', caption, progress = 1, time = '00:12', total = '00:39', played = .3, children }) {
  return (
    <div style={{ position: 'relative', width: 1080, height: 1920, background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'var(--font-sans)', overflow: 'hidden', backgroundImage: 'var(--stage-halo)' }}>
      <Eyebrow size={30} left={<span><b style={{ color: 'var(--accent)' }}>vibelog</b> · day {day}</span>} right={tag} style={{ position: 'absolute', top: 88, left: 80, right: 80 }} />
      {children}
      {caption && <div style={{ position: 'absolute', left: 70, right: 70, bottom: 190, minHeight: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}><Caption text={caption} progress={progress} size={62} /></div>}
      <ProgressBar value={played} height={8} style={{ position: 'absolute', left: 80, right: 80, bottom: 110 }} />
      <div style={{ position: 'absolute', left: 80, right: 80, bottom: 44, display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 24, color: 'var(--muted)', letterSpacing: '.06em' }}><span>© 2026 vibelog · Jessi</span><span>{time} / {total}</span></div>
    </div>
  );
}
