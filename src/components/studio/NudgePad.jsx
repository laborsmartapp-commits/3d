import React from 'react';

const MOVES = [['Forward', 'fwd', 1], ['Back', 'fwd', -1], ['Left', 'right', -1], ['Right', 'right', 1], ['Up', 'up', 1], ['Down', 'up', -1]];
const TURNS = [['Turn ←', 'yaw', 1], ['Turn →', 'yaw', -1], ['Tilt ↑', 'pitch', 1], ['Tilt ↓', 'pitch', -1]];

export default function NudgePad({ onNudge }) {
  const b = 'rounded-lg bg-white/5 hover:bg-white/10 py-1.5 text-xs';
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-muted-foreground">Move (0.5 m) and rotate (5°) relative to where the camera points</p>
      <div className="grid grid-cols-3 gap-1.5">{MOVES.map(([l, d, s]) => <button key={l} className={b} onClick={() => onNudge(d, s * 0.5)}>{l}</button>)}</div>
      <div className="grid grid-cols-4 gap-1.5">{TURNS.map(([l, d, s]) => <button key={l} className={b} onClick={() => onNudge(d, s * (Math.PI / 36))}>{l}</button>)}</div>
    </div>
  );
}