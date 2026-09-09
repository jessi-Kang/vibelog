import React from 'react';
import { Stage } from './Stage.jsx';
import { Phone } from './Phone.jsx';
import { AppScreen } from './AppScreen.jsx';
export function ShipIt() {
  return (
    <Stage day="01" tag="ship it" caption="저는 ^커밋만 ^하면, 밤 11시에 깃헙 액션이 돌아서" progress={.62} time="00:12" total="00:39" played={.31}>
      <Phone><AppScreen /></Phone>
    </Stage>
  );
}
