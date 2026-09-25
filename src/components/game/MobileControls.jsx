import React, { useState } from 'react';
import { Hand, ArrowUp, Zap } from 'lucide-react';
import Joystick from './Joystick';

export default function MobileControls({ engine, s }) {
  const [sprint, setSprint] = useState(false);
  const explore = s.mode === 'play' || s.mode === 'first';
  const toggleSprint = () => { const v = !sprint; setSprint(v); engine.input.virtual.sprint = v; };
  return (
    <>
      <Joystick engine={engine} />
      {explore && (
        <div className="absolute bottom-8 right-5 z-20 flex items-end gap-3">
          <div className="flex flex-col gap-3">
            <button onPointerDown={toggleSprint} className={`w-12 h-12 rounded-full grid place-items-center border border-white/10 backdrop-blur-md ${sprint ? 'bg-ember text-background' : 'bg-card/50'}`}><Zap className="w-5 h-5" /></button>
            <button onPointerDown={() => { engine.input.virtual.jump = true; }} className="w-12 h-12 rounded-full grid place-items-center bg-card/50 border border-white/10 backdrop-blur-md"><ArrowUp className="w-5 h-5" /></button>
          </div>
          <button onPointerDown={() => { engine.input.virtual.interact = true; }} className={`w-20 h-20 rounded-full grid place-items-center border border-white/10 ${s.prompt ? 'bg-primary text-primary-foreground' : 'bg-card/50 backdrop-blur-md'}`}>
            <div className="flex flex-col items-center"><Hand className="w-6 h-6" /><span className="text-[10px] font-semibold mt-0.5">{s.prompt?.verb || 'Interact'}</span></div>
          </button>
        </div>
      )}
    </>
  );
}