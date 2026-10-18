import React from 'react';
import { Copy, Trash2, Eye, EyeOff, Lock, Unlock, RotateCcw, RotateCw, ArrowDownToLine, Undo2, Group, Ungroup } from 'lucide-react';

const B = 'rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-1.5 text-xs flex items-center justify-center gap-1.5 disabled:opacity-40';

export default function InspectorActions({ ed, sel }) {
  const one = sel[0], locked = sel.some((o) => o.locked), hidden = sel.every((o) => o.hidden), grouped = sel.some((o) => o.group);
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <button className={B} onClick={() => ed.rotateBy(-90)} disabled={locked}><RotateCcw className="w-3.5 h-3.5" />-90°</button>
      <button className={B} onClick={() => ed.rotateBy(90)} disabled={locked}><RotateCw className="w-3.5 h-3.5" />+90°</button>
      <button className={B} onClick={() => ed.duplicate()}><Copy className="w-3.5 h-3.5" />Duplicate</button>
      <button className={`${B} text-destructive`} onClick={() => ed.remove()}><Trash2 className="w-3.5 h-3.5" />Delete</button>
      <button className={B} onClick={() => ed.patch({ hidden: !hidden })}>{hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}{hidden ? 'Show' : 'Hide in shot'}</button>
      <button className={B} onClick={() => ed.patch({ locked: !locked })}>{locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}{locked ? 'Unlock' : 'Lock'}</button>
      <button className={B} onClick={() => ed.drop()} disabled={locked}><ArrowDownToLine className="w-3.5 h-3.5" />Snap to surface</button>
      <button className={B} onClick={() => ed.reset()} disabled={locked}><Undo2 className="w-3.5 h-3.5" />Reset transform</button>
      {sel.length > 1 && <button className={B} onClick={() => ed.group()}><Group className="w-3.5 h-3.5" />Group</button>}
      {grouped && <button className={B} onClick={() => ed.ungroup()}><Ungroup className="w-3.5 h-3.5" />Ungroup</button>}
      {one?.error && <p className="col-span-2 text-xs text-destructive">{one.error}</p>}
    </div>
  );
}