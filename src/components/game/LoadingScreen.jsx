import React from 'react';
import { motion } from 'framer-motion';
import IslandSilhouette from './IslandSilhouette';

export default function LoadingScreen({ s, onEnter }) {
  const ready = s.phase === 'ready';
  return (
    <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 1.2 } }}
      className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-background via-card to-background px-6">
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_top,hsl(var(--accent)/0.35),transparent_60%)]" />
      <div className="relative flex flex-col items-center text-center max-w-md w-full">
        <IslandSilhouette />
        <p className="text-xs uppercase tracking-[0.4em] text-primary mt-6">A Scorpio Paradise</p>
        <h1 className="font-display text-4xl md:text-6xl font-bold mt-2 tracking-wide">Celestia Grotto</h1>
        <p className="text-muted-foreground mt-3 text-sm">A living floating island waits beyond the clouds.</p>
        <div className="w-full mt-10">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>{s.step}</span><span className="tabular-nums">{Math.round(s.progress)}%</span>
          </div>
          <div className="h-1 w-full rounded-full bg-secondary overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-primary to-accent" animate={{ width: `${s.progress}%` }} transition={{ ease: 'easeOut' }} />
          </div>
        </div>
        <p className="text-xs text-quiet mt-6 min-h-[2rem]">{s.tip}</p>
        {ready && (
          <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={onEnter}
            className="mt-6 rounded-full bg-primary text-primary-foreground px-10 py-3 font-semibold tracking-wide shadow-[0_0_40px_hsl(var(--primary)/0.4)] hover:brightness-110">
            Enter the World
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}