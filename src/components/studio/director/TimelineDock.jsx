import React, { useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import DirectorTransport from './DirectorTransport';
import ClipInspector from './ClipInspector';
import AudioInspector from './AudioInspector';
import TimelineRail from './timeline/TimelineRail';
import TimelineResize from './timeline/TimelineResize';
import TimelineLanes from './timeline/TimelineLanes';
import TimelinePopout from './timeline/TimelinePopout';
import useTimelineUI, { TL_MIN, tlMax } from './timeline/timelineUI';

// Bottom multilayer timeline: transport + lanes always visible; settings live behind the left bubble rail.
export default function TimelineDock({ engine, st, open, setOpen, inset }) {
  const d = st.director, box = useRef(null);
  const [ui, set] = useTimelineUI();
  const h = Math.max(TL_MIN, Math.min(ui.h, tlMax())), clip = d.clips.find((c) => c.id === ui.sel);
  // Publish the dock height so sibling overlays (e.g. the stage studio bar) can sit above it.
  useEffect(() => {
    const el = box.current, host = el.parentElement;
    const ro = new ResizeObserver(() => host.style.setProperty('--tl-h', el.offsetHeight + 'px'));
    ro.observe(el);
    return () => { ro.disconnect(); host.style.removeProperty('--tl-h'); };
  }, []);
  const pick = (v) => set(ui.view === v && ui.pop ? { pop: false } : { view: v, pop: true });
  const p = { engine, st, d, ui, set };
  return (
    <div ref={box} data-timeline-dock style={open ? { height: h } : undefined} className={`absolute bottom-0 inset-x-0 z-20 glass rounded-t-2xl flex flex-col ${inset ?? (st.active ? 'md:mr-[520px]' : '')}`}>
      {open && <TimelineResize box={box} h={h} onCommit={(v) => set({ h: v })} />}
      <div className="flex flex-1 min-h-0">
        {open && <TimelineRail view={ui.view} pop={ui.pop} pick={pick} />}
        <div className="flex-1 min-w-0 flex flex-col">
          <DirectorTransport engine={engine} st={st} d={d} open={open} setOpen={setOpen} />
          {(st.error || st.notice) && <p className={`px-3 py-1 text-[11px] ${st.error ? 'text-destructive' : 'text-primary'}`}>{st.error || st.notice}</p>}
          {open && <TimelineLanes {...p} />}
          {open && clip && (clip.kind === 'audio' ? <AudioInspector engine={engine} c={clip} actors={d.actors} /> : <ClipInspector engine={engine} c={clip} />)}
        </div>
      </div>
      <AnimatePresence>{open && ui.pop && <TimelinePopout key={ui.view} view={ui.view} h={h} onClose={() => set({ pop: false })} {...p} />}</AnimatePresence>
    </div>
  );
}