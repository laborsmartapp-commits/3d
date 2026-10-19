import React, { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import BubbleMenu from '@/components/realm/bubble/BubbleMenu';
import RealmTool from '@/components/realm/bubble/RealmTool';
import TakeStatusPill from '@/components/realm/bubble/TakeStatusPill';
import useBubbleTools from '@/components/realm/bubble/useBubbleTools';
import { STAGE_TOOLS, STUDIO_TOOLS } from '@/components/realm/bubble/tools';
import TimelineDock from '@/components/studio/director/TimelineDock';
import DiagOverlay from '@/components/diag/DiagOverlay';

// The same right-edge bubble menu (Scenes, Director, Timeline, Cameras, Recording, Weather, Settings)
// on every stage that has no set editor of its own: Convergence, Star Square, Celestia Grotto, generated stages.
export default function StageHUD({ engine, s, studioOpen, setStudioOpen, lift = false }) {
  const st = s.studio, b = useBubbleTools(engine, st, setStudioOpen);
  // Deep links (open a scene/take from a production) open the studio from outside: show the Scenes tool.
  useEffect(() => { if (studioOpen && !STUDIO_TOOLS.includes(b.tool)) b.showScenes(); }, [studioOpen]);
  return (
    <>
      <TakeStatusPill engine={engine} st={st} />
      <AnimatePresence>{b.tool && <RealmTool key={b.tool} tool={b.tool} engine={engine} s={s} onClose={() => b.pick(b.tool)} />}</AnimatePresence>
      {b.showDock && <TimelineDock engine={engine} st={st} open={b.dockOpen} setOpen={b.setDockOpen} inset={b.tool ? 'mr-[84px] md:mr-[452px]' : 'mr-[84px]'} />}
      <BubbleMenu tools={STAGE_TOOLS} open={b.menu} toggle={b.toggle} tool={b.tool} pick={(t) => b.pick(t)} rec={st?.status === 'capturing'} docked={{ timeline: b.dock }} lift={lift} />
      {s.diag && <DiagOverlay engine={engine} />}
    </>
  );
}