import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import CharactersPop from './CharactersPop';
import AudioPop from './AudioPop';
import SettingsPop from './SettingsPop';
import TracksPop from './TracksPop';
import { RAIL } from './TimelineRail';

const BODY = { characters: CharactersPop, audio: AudioPop, settings: SettingsPop, tracks: TracksPop };

// One pop-out at a time, next to the rail: above the timeline when there's room, otherwise inside it beside the rail.
export default function TimelinePopout({ view, h, onClose, ...p }) {
  const above = window.innerHeight - h > 300, Body = BODY[view], title = RAIL.find((b) => b.id === view)?.label;
  return (
    <motion.div data-tl-pop={view} initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.97 }} transition={{ type: 'spring', damping: 28, stiffness: 360 }}
      style={{ maxHeight: above ? Math.min(440, window.innerHeight - h - 24) : h - 20 }}
      className={`absolute z-40 w-[min(320px,calc(100vw-4rem))] glass rounded-2xl flex flex-col overflow-hidden ${above ? 'left-1 bottom-full mb-2' : 'left-12 bottom-2'}`}>
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <h3 className="font-heading text-xs tracking-wide">{title}</h3>
        <button onClick={onClose} aria-label="Close timeline panel" className="p-1 rounded-full hover:bg-white/10"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3"><Body {...p} /></div>
    </motion.div>
  );
}