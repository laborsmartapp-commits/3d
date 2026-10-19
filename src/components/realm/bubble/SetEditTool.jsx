import React, { useState } from 'react';
import { Undo2, Redo2 } from 'lucide-react';
import ToolPanel from './ToolPanel';
import ObjectInspector from '../ObjectInspector';
import SetLibrary from '../SetLibrary';
import HierarchyPanel from '../HierarchyPanel';
import EditHints from '../EditHints';

export default function SetEditTool({ R, r, onClose }) {
  const [tab, setTab] = useState('inspect'), ed = R.R.editor;
  const B = 'p-1.5 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30';
  return (
    <ToolPanel title="Set Edit" subtitle="Select, move, rotate and dress the set" tabs={[['inspect', 'Inspector'], ['library', 'Asset Library'], ['rooms', 'Rooms']]} tab={tab} setTab={setTab} onClose={onClose}>
      {tab === 'inspect' && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <button disabled={!r.canUndo} onClick={() => ed.undo()} aria-label="Undo" title="Undo (Ctrl+Z)" className={B}><Undo2 className="w-4 h-4" /></button>
            <button disabled={!r.canRedo} onClick={() => ed.redo()} aria-label="Redo" title="Redo (Ctrl+Y)" className={B}><Redo2 className="w-4 h-4" /></button>
          </div>
          <ObjectInspector R={R.R} r={r} />
          <EditHints />
        </div>
      )}
      {tab === 'library' && <SetLibrary R={R} />}
      {tab === 'rooms' && <HierarchyPanel R={R} r={r} />}
    </ToolPanel>
  );
}