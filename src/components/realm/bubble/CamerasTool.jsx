import React from 'react';
import { Eye, EyeOff, PictureInPicture2 } from 'lucide-react';
import ToolPanel from './ToolPanel';
import CameraList from '@/components/studio/CameraList';

export default function CamerasTool({ engine, st, onClose }) {
  const S = engine.studio, toggle = (k) => { S[k] = !S[k]; S.emit(); };
  const cam = st?.cameras.find((c) => c.id === st.selId), T = (on) => `flex-1 rounded-lg py-2 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 ${on ? 'bg-accent text-accent-foreground' : 'bg-white/5 hover:bg-white/10'}`;
  return (
    <ToolPanel title="Cameras" subtitle={cam ? cam.name : 'Studio cameras'} error={st?.error} onClose={onClose}>
      {!st ? <p className="text-sm text-muted-foreground">Loading studio…</p> : (
        <div className="space-y-4">
          {st.scene && (
            <div className="flex gap-1.5">
              <button disabled={!cam} onClick={() => toggle('viewThrough')} className={T(st.viewThrough)}>{st.viewThrough ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}{st.viewThrough ? 'World View' : 'View Through'}</button>
              <button onClick={() => toggle('preview')} className={T(st.preview)}><PictureInPicture2 className="w-3.5 h-3.5" />Live Preview</button>
            </div>
          )}
          <CameraList engine={engine} st={st} />
        </div>
      )}
    </ToolPanel>
  );
}