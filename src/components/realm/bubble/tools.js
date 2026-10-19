import { Clapperboard, Megaphone, PanelBottom, Sofa, Camera, CircleDot, CloudSun, Layers, Settings } from 'lucide-react';

// Top-to-bottom order of the bubble column. Studio tools open the Scene Manager (production mode).
// `toggle` tools switch a docked surface on/off instead of opening a side panel.
export const TOOLS = [
  { id: 'scenes', label: 'Scenes', icon: Clapperboard },
  { id: 'director', label: 'Director', icon: Megaphone },
  { id: 'timeline', label: 'Timeline', icon: PanelBottom, toggle: true },
  { id: 'setedit', label: 'Set Edit', icon: Sofa },
  { id: 'cameras', label: 'Cameras', icon: Camera },
  { id: 'recording', label: 'Recording', icon: CircleDot },
  { id: 'environment', label: 'Weather', icon: CloudSun },
  { id: 'layouts', label: 'Layouts', icon: Layers },
  { id: 'settings', label: 'Settings', icon: Settings },
];
export const STUDIO_TOOLS = ['scenes', 'director', 'cameras', 'recording'];
// Stages without a set editor get the same column minus Set Edit and Layouts (same order, same positions).
export const STAGE_TOOLS = TOOLS.filter((t) => t.id !== 'setedit' && t.id !== 'layouts');