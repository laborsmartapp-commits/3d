import React from 'react';
import { Home, Compass, LayoutGrid, Settings } from 'lucide-react';

export default function QuickNav({ engine, setPanel }) {
  const items = [
    { icon: Home, label: 'My Island', onClick: () => setPanel('island') },
    { icon: Compass, label: 'Directory', onClick: () => setPanel('directory') },
    { icon: LayoutGrid, label: 'Catalog', onClick: () => { engine.setMode('build'); setPanel(engine.mode === 'build' ? 'catalog' : null); } },
    { icon: Settings, label: 'Settings', onClick: () => setPanel('settings') },
  ];
  return (
    <div className="absolute bottom-4 right-4 glass rounded-2xl p-1.5 flex flex-col gap-1 z-20">
      {items.map(({ icon: Icon, label, onClick }) => (
        <button key={label} onClick={onClick} title={label} className="group relative w-10 h-10 grid place-items-center rounded-xl hover:bg-white/10">
          <Icon className="w-4 h-4" />
          <span className="absolute right-12 whitespace-nowrap glass rounded-lg px-2 py-1 text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition">{label}</span>
        </button>
      ))}
    </div>
  );
}