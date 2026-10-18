import React from 'react';
import { Lightbulb, LightbulbOff } from 'lucide-react';

export default function RoomSwitches({ R, rooms }) {
  return (
    <div>
      <p className="text-xs text-quiet mb-1">Room light switches</p>
      {[1, 2].map((f) => (
        <div key={f} className="mb-2">
          <p className="text-[10px] uppercase tracking-wider text-quiet mb-1">{f === 1 ? 'Ground floor' : 'Upper floor'}</p>
          <div className="grid grid-cols-2 gap-1">
            {rooms.filter((r) => r.floor === f).map((r) => (
              <button key={r.id} onClick={() => R.env.setRoom(r.id, !r.on)} className={`rounded-md px-2 py-1 text-[11px] flex items-center gap-1 text-left ${r.on ? 'bg-ember/20 text-ember' : 'bg-white/5 text-quiet'}`}>
                {r.on ? <Lightbulb className="w-3 h-3 shrink-0" /> : <LightbulbOff className="w-3 h-3 shrink-0" />}<span className="truncate">{r.name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}