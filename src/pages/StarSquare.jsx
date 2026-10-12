import React from 'react';
import Convergence from '@/pages/Convergence';
import { STAR_SQUARE } from '@/game/convergence/star/stage';

export default function StarSquare() {
  return <Convergence district={STAR_SQUARE} title="Star Square" />;
}