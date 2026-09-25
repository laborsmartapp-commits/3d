import React from 'react';
import { RotateCcw, RotateCw, Check, X, Move, Copy, ArrowUpCircle, Archive, Trash2, LayoutGrid, Maximize2, Minimize2 } from 'lucide-react';

const Btn = ({ icon: Icon, label, onClick, tone = '' }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 hover:bg-white/10 min-w-[52px] ${tone}`}>
    <Icon className="w-4 h-4" /><span className="text-[10px] font-medium whitespace-nowrap">{label}</span>
  </button>
);

export default function BuildToolbar({ engine, s, catalogOpen, setPanel }) {
  const b = engine.build, g = s.build?.ghost, sel = s.build?.selected;
  return (
    <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 w-[calc(100%-2rem)] md:w-auto">
      {g && (
        <div className="glass rounded-full px-4 py-1.5 text-xs flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${g.valid ? 'bg-primary' : 'bg-destructive'}`} />
          <span className="font-semibold">{g.name}</span><span className="text-muted-foreground">{g.reason}</span>
        </div>
      )}
      {!g && !sel && !s.isTouch && <p className="glass rounded-full px-4 py-1.5 text-[11px] text-muted-foreground">Click a structure to select · Right-drag orbit · WASD pan · Scroll zoom</p>}
      <div className="glass rounded-2xl p-1.5 flex items-center gap-0.5 overflow-x-auto max-w-full">
        {!catalogOpen && <Btn icon={LayoutGrid} label="Catalog" onClick={() => setPanel('catalog')} />}
        {g && (
          <>
            <Btn icon={RotateCcw} label="Rotate" onClick={() => b.rotateGhost(-15)} />
            <Btn icon={RotateCw} label="Rotate" onClick={() => b.rotateGhost(15)} />
            <Btn icon={Check} label="Place" onClick={() => b.place()} tone="text-primary" />
            <Btn icon={X} label="Cancel" onClick={() => b.cancel()} />
          </>
        )}
        {sel && !g && (
          <>
            <span className="px-2 text-xs font-semibold max-w-[120px] truncate">{sel.tierName || sel.name}</span>
            <Btn icon={Move} label="Move" onClick={() => b.moveSel()} />
            <Btn icon={RotateCw} label="Rotate" onClick={() => b.rotateSel(15)} />
            <Btn icon={Copy} label="Duplicate" onClick={() => b.duplicateSel()} />
            {sel.canUpgrade && <Btn icon={ArrowUpCircle} label={`${sel.nextName} · ${sel.upgradeCost}`} onClick={() => b.upgradeSel()} tone="text-accent" />}
            {s.build?.devPlace && <><Btn icon={Maximize2} label="Scale +" onClick={() => b.scaleSel(1.15)} /><Btn icon={Minimize2} label="Scale −" onClick={() => b.scaleSel(1 / 1.15)} /></>}
            <Btn icon={Archive} label="Store" onClick={() => b.storeSel()} />
            <Btn icon={Trash2} label="Demolish" onClick={() => b.demolishSel()} tone="text-destructive" />
          </>
        )}
      </div>
    </div>
  );
}