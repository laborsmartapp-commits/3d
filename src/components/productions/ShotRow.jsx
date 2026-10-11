import React from 'react';
import { ArrowUp, ArrowDown, Copy, Trash2, Pencil, Clapperboard } from 'lucide-react';

const ib = 'p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30';

export default function ShotRow({ shot, scene, first, last, onOpen, onEdit, onMove, onDuplicate, onDelete }) {
  const cam = (scene.cameras || []).find((c) => c.id === shot.camera_id);
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2">
      <span className="font-mono text-xs text-quiet w-6">{String(shot.order + 1).padStart(2, '0')}</span>
      <button onClick={onOpen} className="flex-1 min-w-0 text-left hover:text-primary">
        <p className="text-sm font-medium truncate">{shot.name}</p>
        <p className="text-[11px] text-muted-foreground">{cam?.name || 'Any camera'} · {shot.start_t || 0}s{shot.end_t ? `–${shot.end_t}s` : ''}{shot.notes ? ` · ${shot.notes}` : ''}</p>
      </button>
      <button className={ib} disabled={first} onClick={() => onMove(-1)} aria-label="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
      <button className={ib} disabled={last} onClick={() => onMove(1)} aria-label="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
      <button className={ib} onClick={onEdit} aria-label="Edit shot"><Pencil className="w-3.5 h-3.5" /></button>
      <button className={ib} onClick={onDuplicate} aria-label="Duplicate shot"><Copy className="w-3.5 h-3.5" /></button>
      <button className={ib} onClick={onDelete} aria-label="Delete shot"><Trash2 className="w-3.5 h-3.5" /></button>
      <button onClick={onOpen} className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-2.5 py-1.5 text-xs font-semibold"><Clapperboard className="w-3 h-3" />Director</button>
    </div>
  );
}