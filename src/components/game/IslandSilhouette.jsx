import React from 'react';
import { motion } from 'framer-motion';

export default function IslandSilhouette() {
  return (
    <motion.svg viewBox="0 0 240 160" className="w-56 md:w-72" animate={{ y: [0, -6, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
      <defs>
        <linearGradient id="isl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="hsl(161 95% 41%)" stopOpacity="0.9" />
          <stop offset="1" stopColor="hsl(271 91% 65%)" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <path d="M20 70 Q60 52 90 56 L112 22 L128 44 L140 34 L160 58 Q200 56 222 70 Q180 84 150 120 Q128 150 118 156 Q104 130 84 112 Q50 90 20 70Z" fill="url(#isl)" />
      <path d="M170 68 L172 130" stroke="hsl(161 95% 41%)" strokeOpacity="0.5" strokeWidth="1.5" />
      <path d="M60 72 L58 118" stroke="hsl(161 95% 41%)" strokeOpacity="0.35" strokeWidth="1.2" />
      <circle cx="196" cy="28" r="6" fill="hsl(214 32% 91%)" opacity="0.8" />
      <circle cx="30" cy="36" r="2" fill="hsl(38 92% 50%)" opacity="0.8" />
      <circle cx="214" cy="100" r="3" fill="hsl(271 91% 65%)" opacity="0.7" />
    </motion.svg>
  );
}