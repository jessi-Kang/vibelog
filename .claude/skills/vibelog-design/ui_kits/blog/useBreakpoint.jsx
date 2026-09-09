import React from 'react';
export function useBreakpoint() {
  const get = () => window.innerWidth >= 1024 ? 'desktop' : window.innerWidth >= 720 ? 'tablet' : 'mobile';
  const [bp, setBp] = React.useState(get);
  React.useEffect(() => { const f = () => setBp(get()); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  return bp;
}
