import React from 'react';
import { AnimatePresence } from 'framer-motion';
import TopStatus from './TopStatus';
import TopActions from './TopActions';
import InteractionPrompt from './InteractionPrompt';
import QuickNav from './QuickNav';
import MobileControls from './MobileControls';
import BuildToolbar from './BuildToolbar';
import BuildPanel from './BuildPanel';
import PlotDialog from './PlotDialog';
import DialogueBox from './DialogueBox';
import DevPanel from './DevPanel';
import DirectoryPanel from './DirectoryPanel';
import SettingsPanel from './SettingsPanel';
import IslandPanel from './IslandPanel';

export default function HUD({ engine, s, panel, setPanel }) {
  const close = () => setPanel(null);
  const building = s.mode === 'build';
  const exploring = s.mode === 'play' || s.mode === 'first';
  return (
    <>
      <TopStatus s={s} engine={engine} />
      <TopActions engine={engine} s={s} setPanel={setPanel} />
      {exploring && !s.dialogue && <InteractionPrompt prompt={s.prompt} isTouch={s.isTouch} />}
      {!s.isTouch && exploring && <QuickNav engine={engine} setPanel={setPanel} />}
      {s.isTouch && (exploring || building || s.mode === 'free') && <MobileControls engine={engine} s={s} />}
      {building && <BuildToolbar engine={engine} s={s} catalogOpen={panel === 'catalog'} setPanel={setPanel} />}
      {s.plot && <PlotDialog engine={engine} plot={s.plot} shards={s.shards} readOnly={s.readOnly} />}
      {s.dialogue && <DialogueBox key={s.dialogue.id} engine={engine} d={s.dialogue} />}
      <AnimatePresence>
        {panel === 'catalog' && building && <BuildPanel key="cat" engine={engine} s={s} onClose={close} />}
        {panel === 'dev' && <DevPanel key="dev" engine={engine} s={s} onClose={close} />}
        {panel === 'directory' && <DirectoryPanel key="dir" engine={engine} s={s} onClose={close} />}
        {panel === 'settings' && <SettingsPanel key="set" engine={engine} s={s} onClose={close} />}
        {panel === 'island' && <IslandPanel key="isl" engine={engine} s={s} onClose={close} />}
      </AnimatePresence>
    </>
  );
}