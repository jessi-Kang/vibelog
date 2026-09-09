import React from 'react';
import { Wordmark } from '../../components/navigation/Wordmark.jsx';
import { Tabs } from '../../components/navigation/Tabs.jsx';
import { IconButton } from '../../components/core/IconButton.jsx';
import { useBreakpoint } from './useBreakpoint.jsx';
const TABS = [{ value: 'home', label: '프로젝트' }, { value: 'feed', label: '데브로그' }, { value: 'shorts', label: '쇼츠' }];
export function Shell({ tab, onTab, back, onBack, title, children, wide }) {
  const bp = useBreakpoint();
  const mobile = bp === 'mobile';
  const max = mobile ? 'var(--content-max-mobile)' : wide ? 'var(--content-max)' : 'var(--content-max-reading)';
  const desktop = bp === 'desktop';
  const pad = mobile ? 'var(--page-pad)' : desktop ? '32px' : '24px';
  const chromeMax = mobile ? 'var(--content-max-mobile)' : 'var(--content-max)';
  const mono = { fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap' };
  const Back = <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><IconButton label="뒤로" size="sm" onClick={onBack}>←</IconButton><span style={mono}>{title}</span></div>;
  return (
    <div style={{ width: '100%', minHeight: '100vh', background: 'var(--surface-page)', color: 'var(--text-body)', fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface-page)', borderBottom: '1px solid var(--border-default)' }}>
        <div style={{ maxWidth: chromeMax, margin: '0 auto', padding: mobile ? '12px ' + pad : '14px ' + pad, display: 'flex', flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 32, gap: 16 }}>
            {back && mobile ? Back : <span style={{ cursor: 'pointer' }} onClick={() => onTab('home')}><Wordmark /></span>}
            {mobile && <span style={mono}>다음 실행 23:00</span>}
          </div>
          {(!back || !mobile) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Tabs full={mobile} items={TABS} value={tab} onChange={onTab} style={{ flex: mobile ? 1 : 'none' }} />
              {!mobile && <span style={mono}>다음 실행 23:00 KST</span>}
            </div>
          )}
        </div>
      </header>
      {back && !mobile && <div style={{ maxWidth: max, width: '100%', margin: '0 auto', padding: '18px ' + pad + ' 0', boxSizing: 'border-box' }}>{Back}</div>}
      <main style={{ flex: 1, width: '100%', maxWidth: max, margin: '0 auto', boxSizing: 'border-box', padding: mobile ? '20px ' + pad + ' 40px' : desktop ? '32px ' + pad + ' 72px' : '28px ' + pad + ' 56px', display: 'flex', flexDirection: 'column', gap: mobile ? 'var(--section-gap)' : 'var(--section-gap-desktop)' }}>{children}</main>
      <footer style={{ borderTop: '1px solid var(--border-default)' }}>
        <div style={{ maxWidth: chromeMax, margin: '0 auto', display: 'flex', justifyContent: 'space-between', gap: 12, padding: mobile ? '16px ' + pad + ' 24px' : '20px ' + pad + ' 28px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}><span>© 2026 Jessi</span><a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>github ↗</a></div>
      </footer>
    </div>
  );
}
