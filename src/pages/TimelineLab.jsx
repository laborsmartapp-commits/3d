import React, { useEffect, useRef, useState } from 'react';
import { LabEngine } from '@/game/lab/LabEngine';
import LabHUD from '@/components/lab/LabHUD';
import Toasts from '@/components/game/Toasts';

// Lightweight test stage for the real MationStudio timeline (no Living Realm world to load).
export default function TimelineLab() {
  const box = useRef(null), [engine, setEngine] = useState(null), [s, setS] = useState({});
  useEffect(() => {
    const e = new LabEngine(box.current, setS);
    window.__lab = e; setEngine(e); e.studio.emit();
    return () => { e.dispose(); if (window.__lab === e) delete window.__lab; };
  }, []);
  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      <div ref={box} className="absolute inset-0" />
      {engine && <LabHUD engine={engine} s={s} />}
      <Toasts notice={s.notice} />
    </div>
  );
}