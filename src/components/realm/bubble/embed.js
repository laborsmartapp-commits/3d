import { createContext } from 'react';

// True inside a bubble tool panel: realm panels render only their content (the tool panel supplies the frame).
export const PanelEmbed = createContext(false);