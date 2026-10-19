import { useState } from 'react';

// Timeline UI state lives outside React so it survives the dock closing/reopening (and reloads for layout prefs).
const KEY = 'mation.timeline.ui';
export const ACTOR_ROWS = [['perf', 'Movement'], ['anim', 'Body Anim']];
export const TL_MIN = 176;
export const tlMax = () => Math.round(window.innerHeight * 0.8);

const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
let mem = { h: 300, view: 'tracks', pop: false, zoom: 40, wz: 1.5, collapsed: {}, sel: null, selTrack: null, ...saved };

export default function useTimelineUI() {
  const [ui, setUi] = useState(mem);
  const set = (p) => {
    mem = { ...mem, ...p }; setUi(mem);
    const { sel, selTrack, ...keep } = mem;
    localStorage.setItem(KEY, JSON.stringify(keep));
  };
  return [ui, set];
}