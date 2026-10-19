import React from 'react';
import { Circle, Square } from 'lucide-react';
import ToolPanel from './ToolPanel';
import RecordedSceneLibrary from '@/components/studio/RecordedSceneLibrary';

// Record / stop and the takes library. The timeline has its own bubble.
export default function RecordingTool({ engine, st, onClose }) {
  const S = engine.studio, armed = st?.director?.actors.find((a) => a.armed), capturing = st?.status === 'capturing';
  const B = 'w-full rounded-lg py-2 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40';
  return (
    <ToolPanel title="Recording" subtitle={armed ? `Armed: ${armed.name}` : 'Arm a character in Director to record'} error={st?.error} onClose={onClose}>
      {!st ? <p className="text-sm text-muted-foreground">Loading studio…</p> : !st.scene ? <p className="text-sm text-muted-foreground">Open or create a scene in Scenes first.</p> : (
        <div className="space-y-4">
          {capturing
            ? <button onClick={() => S.stop()} className={`${B} bg-foreground text-background`}><Square className="w-3.5 h-3.5 fill-current" />Stop</button>
            : <button onClick={() => S.dir.record()} disabled={st.status !== 'idle' || !armed} className={`${B} bg-destructive text-destructive-foreground`}><Circle className="w-3.5 h-3.5 fill-current" />Record</button>}
          <RecordedSceneLibrary engine={engine} st={st} />
        </div>
      )}
    </ToolPanel>
  );
}