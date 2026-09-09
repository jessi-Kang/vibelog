import React from 'react';
import { Shell } from './Shell.jsx';
import { Home } from './Home.jsx';
import { ProjectDetail } from './ProjectDetail.jsx';
import { Feed } from './Feed.jsx';
import { DevlogPost } from './DevlogPost.jsx';
import { ShortsTab } from './ShortsTab.jsx';
export function App({ initial = 'home', empty = false, many = false }) {
  const [route, setRoute] = React.useState({ screen: initial, id: null });
  const [stack, setStack] = React.useState([]);
  const go = (screen, id) => { setStack(s => [...s, route]); setRoute({ screen, id }); window.scrollTo(0, 0); };
  const back = () => { const s = stack.slice(); const prev = s.pop() || { screen: 'home', id: null }; setStack(s); setRoute(prev); };
  const tab = ['home', 'feed', 'shorts'].includes(route.screen) ? route.screen : null;
  const detail = route.screen === 'project' || route.screen === 'post';
  const title = route.screen === 'project' ? 'projects / ' + route.id : route.screen === 'post' ? 'log / ' + route.id : '';
  return (
    <Shell wide={['home', 'shorts', 'project'].includes(route.screen)} tab={tab} onTab={t => { setStack([]); setRoute({ screen: t, id: null }); }} back={detail} onBack={back} title={title}>
      {route.screen === 'home' && <Home go={go} empty={empty} many={many} />}
      {route.screen === 'feed' && <Feed go={go} empty={empty} many={many} />}
      {route.screen === 'shorts' && <ShortsTab go={go} empty={empty} />}
      {route.screen === 'project' && <ProjectDetail slug={route.id} go={go} />}
      {route.screen === 'post' && <DevlogPost id={route.id} go={go} />}
    </Shell>
  );
}
