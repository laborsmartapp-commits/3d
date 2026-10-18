import React from 'react';
import { Move, RotateCw, Maximize2, Magnet, Grid3x3, ShieldAlert, DoorOpen, MousePointerClick } from 'lucide-react';
import { CATALOG } from '@/game/realm/catalog';
import TransformFields from './TransformFields';
import InspectorActions from './InspectorActions';
import ModelUpgrade from './ModelUpgrade';

const GZ = [['translate', Move, 'Move'], ['rotate', RotateCw, 'Rotate'], ['scale', Maximize2, 'Scale']];
const T = (on) => `rounded-lg px-2 py-1.5 text-xs flex items-center justify-center gap-1 ${on ? 'bg-primary text-primary-foreground' : 'bg-white/5 hover:bg-white/10'}`;

export default function ObjectInspector({ R, r }) {
  const ed = R.editor, sel = r.sel, o = sel[0];
  return (
    <div className="absolute right-4 top-20 bottom-6 z-30 w-80 glass rounded-2xl p-4 overflow-y-auto space-y-3">
      <div className="grid grid-cols-3 gap-1">{GZ.map(([k, I, l]) => <button key={k} onClick={() => ed.setGizmo(k)} className={T(r.gizmo === k)}><I className="w-3.5 h-3.5" />{l}</button>)}</div>
      <div className="grid grid-cols-3 gap-1">
        <button onClick={() => ed.setOption('snap', !r.snap)} className={T(r.snap)} title="Floor/surface/wall snapping + 15° rotation steps"><Magnet className="w-3.5 h-3.5" />Snap</button>
        <button onClick={() => ed.setOption('grid', !r.grid)} className={T(r.grid)} title="25 cm grid"><Grid3x3 className="w-3.5 h-3.5" />Grid</button>
        <button onClick={() => ed.setOption('collide', !r.collide)} className={T(r.collide)} title="Warn when furniture overlaps walls or other furniture"><ShieldAlert className="w-3.5 h-3.5" />Collide</button>
      </div>
      {r.door && (
        <div className="rounded-xl bg-white/5 p-3">
          <p className="font-semibold text-sm flex items-center gap-2"><DoorOpen className="w-4 h-4 text-primary" />{r.door.label}</p>
          <button onClick={() => { ed.door.toggle(); R.emit(); }} className="mt-2 w-full rounded-lg bg-primary text-primary-foreground py-1.5 text-xs font-semibold">{r.door.open ? 'Close door' : 'Open door'}</button>
        </div>
      )}
      {!o && !r.door && <div className="rounded-xl bg-white/5 p-4 text-sm text-muted-foreground flex gap-2"><MousePointerClick className="w-4 h-4 shrink-0 text-primary" />Click any furniture, prop or door to select it. Shift-click to select several.</div>}
      {o && (
        <>
          <div>
            {sel.length === 1 ? <input key={o.id} defaultValue={o.name || o.label} onBlur={(e) => e.target.value !== (o.name || o.label) && ed.patch({ name: e.target.value })} className="w-full bg-transparent font-heading text-base outline-none border-b border-transparent focus:border-primary" /> : <p className="font-heading text-base">{sel.length} objects selected</p>}
            <p className="text-xs text-muted-foreground">{o.cat} · {o.room}{o.locked ? ' · Locked' : ''}</p>
            {sel.some((x) => x.overlap) && <p className="text-xs text-destructive mt-1">Overlaps a wall or another piece — move it or turn off Collide to stage it anyway.</p>}
          </div>
          {sel.length === 1 && <TransformFields o={o} ed={ed} />}
          {o.colorable && sel.length === 1 && (
            <div className="flex items-center gap-2 text-xs"><span className="text-quiet">Colour</span><input type="color" value={o.color || '#ffffff'} onChange={(e) => ed.patch({ color: e.target.value })} className="h-7 w-10 rounded bg-transparent" /><button onClick={() => ed.patch({ color: null })} className="text-quiet hover:text-foreground">Reset</button></div>
          )}
          {sel.length === 1 && o.type !== 'asset' && CATALOG[o.type] && (
            <label className="flex items-center gap-2 text-xs"><span className="text-quiet shrink-0">Replace with</span>
              <select value={o.type} onChange={(e) => ed.replace(e.target.value)} className="flex-1 rounded-md bg-white/5 border border-white/10 px-1.5 py-1">
                {Object.entries(CATALOG).filter(([, d]) => d.cat === CATALOG[o.type].cat).map(([k, d]) => <option key={k} value={k} className="bg-card">{d.name}</option>)}
              </select>
            </label>
          )}
          {sel.length === 1 && o.type !== 'asset' && <ModelUpgrade ed={ed} o={o} />}
          <InspectorActions ed={ed} sel={sel} />
          {o.anchors?.length > 0 && <p className="text-[11px] text-muted-foreground">Interaction points: {o.anchors.join(', ')}</p>}
        </>
      )}
    </div>
  );
}