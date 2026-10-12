import React from 'react';
import Convergence from '@/pages/Convergence';
import { DISTRICTS } from '@/game/convergence/districts';

export default function StarSquare() {
  return <Convergence district={DISTRICTS.star} title="Star Square" />;
}