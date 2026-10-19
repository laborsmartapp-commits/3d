import React, { useState } from 'react';
import { Circle, Square, PanelBottom } from 'lucide-react';
import ToolPanel from './ToolPanel';
import TimelineDock from '@/components/studio/director/TimelineDock';
import RecordedSceneLibrary from '@/components/studio/RecordedSceneLibrary';

// Record / stop, the multi-track timeline (docked along the bottom) and the takes library.
export default function RecordingTool({ engine, st, onClose }) {
  const [timeline, setTimeline] = useState(true), [dock, setDock] = useState(true);
  const S = engine.studio, armed = st?.director?.actors.find((a) => a.armed), capturing = st?.status === 'capturing';
  const B = 'flex-1 rounded-lg py-2 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40';
  return (
    <>
      <ToolPanel title="Recording" subtitle={armed ? `Armed: ${armed.name}` : 'Arm a character track to record'} error={st?.error} onClose={onClose}>
        {!st ? <p className="text-sm text-muted-foreground">Loading studio…</p> : !st.scene ? <p className="text-sm text-muted-foreground">Open or create a scene in Scenes first.</p> : (
          <div className="space-y-4">
            <div className="flex gap-1.5">
              {capturing
                ? <button onClick={() => S.stop()} className={`${B} bg-foreground text-background`}><Square className="w-3.5 h-3.5 fill-current" />Stop</button>
                : <button onClick={() => S.dir.record()} disabled={st.status !== 'idle' || !armed} className={`${B} bg-destructive text-destructive-foreground`}><Circle className="w-3.5 h-3.5 fill-current" />Record</button>}
              <button onClick={() => setTimeline(!timeline)} className={`${B} ${timeline ? 'bg-primary/20 text-primary' : 'bg-white/5 hover:bg-white/10'}`}><PanelBottom className="w-3.5 h-3.5" />Timeline</button>
            </div>
            <RecordedSceneLibrary engine={engine} st={st} />
          </div>
        )}
      </ToolPanel>
      {timeline && st?.scene && st.director && <TimelineDock engine={engine} st={st} open={dock} setOpen={setDock} inset="mr-[84px] md:mr-[452px]" />}
    </>
  );
}