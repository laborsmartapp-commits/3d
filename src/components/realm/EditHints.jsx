import React from 'react';

const K = ({ children }) => <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono">{children}</kbd>;

export default function EditHints() {
  return (
    <div className="rounded-xl bg-white/5 px-3 py-2 text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
      <span><K>W A S D</K> fly</span><span><K>Right-drag</K> look</span><span><K>E</K>/<K>Q</K> up/down</span><span><K>Click</K> select</span>
      <span><K>1 2 3</K> move/rotate/scale</span><span><K>Ctrl D</K> duplicate</span><span><K>Del</K> delete</span><span><K>Ctrl Z</K>/<K>Ctrl Y</K> undo/redo</span><span><K>Ctrl S</K> save</span>
    </div>
  );
}