import React, { useEffect, useState } from 'react';
import { Box } from 'lucide-react';
import { thumb } from '@/game/realm/thumbs';

// One library item: rendered thumbnail of the real asset, click to insert or drag into the world.
export default function LibraryTile({ item, onInsert }) {
  const [src, setSrc] = useState(item.thumb || null);
  useEffect(() => { let live = true; if (!item.thumb && item.type !== 'asset') thumb(item.type).then((u) => live && setSrc(u)); return () => { live = false; }; }, [item.type, item.thumb]);
  const data = JSON.stringify(item.data);
  return (
    <button draggable onDragStart={(ev) => ev.dataTransfer.setData('text/realm-item', data)} onClick={() => onInsert(item.data)}
      className="group rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-primary/50 p-1.5 text-left transition">
      <div className="aspect-square rounded-lg bg-black/20 grid place-items-center overflow-hidden">
        {src ? <img src={src} alt={item.name} className="w-full h-full object-contain group-hover:scale-105 transition" draggable={false} /> : <Box className="w-6 h-6 text-quiet" />}
      </div>
      <p className="mt-1 text-[11px] leading-tight line-clamp-2">{item.name}</p>
    </button>
  );
}