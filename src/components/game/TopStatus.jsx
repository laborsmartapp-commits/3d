import React from 'react';
import { Moon, Sun, CloudRain, Cloud, Wind, Sparkles, Gem, Home } from 'lucide-react';

const WICON = { clear: Sun, cloudy: Cloud, lightRain: CloudRain, heavyRain: CloudRain, thunderstorm: CloudRain, mist: Cloud, windy: Wind, celestialStorm: Sparkles, magicRain: Sparkles };

export default function TopStatus({ s, engine }) {
  const night = s.hour >= 19.5 || s.hour < 5.5;
  const WI = WICON[s.weatherKey] || Sun;
  return (
    <div className="absolute top-3 left-3 md:top-4 md:left-4 flex flex-col gap-2 z-20 max-w-[60vw]">
      <div className="glass rounded-2xl px-3 py-2 md:px-4 md:py-2.5 flex items-center gap-3">
        <div className="min-w-0">
          <p className="font-display text-sm md:text-base font-semibold truncate">{s.islandName}</p>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {night ? <Moon className="w-3 h-3 text-accent" /> : <Sun className="w-3 h-3 text-ember" />}
            <span className="tabular-nums">{s.clock}</span><span className="hidden sm:inline">· {s.stage}</span>
            <WI className="w-3 h-3 ml-1" /><span className="hidden sm:inline">{s.weather}</span>
          </div>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div className="flex items-center gap-1 text-ember text-sm font-semibold tabular-nums" title="Moonshards">
          <Gem className="w-3.5 h-3.5" />{s.shards ?? 0}
        </div>
        <span className={`hidden md:inline text-[10px] tabular-nums ${s.fps < 30 ? 'text-ember' : 'text-quiet'}`}>{s.fps} FPS</span>
      </div>
      {s.readOnly && (
        <div className="glass rounded-full pl-3 pr-1 py-1 flex items-center gap-2 text-xs w-fit">
          <span className="text-muted-foreground">Visiting {s.owner}'s island</span>
          <button onClick={() => engine.visitIsland(s.myIslandId)} className="flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-2.5 py-1 font-medium"><Home className="w-3 h-3" />Home</button>
        </div>
      )}
    </div>
  );
}