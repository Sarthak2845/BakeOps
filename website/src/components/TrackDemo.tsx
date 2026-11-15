'use client';

import { useEffect, useState } from 'react';
import { PIPELINE } from '@/lib/site';
import { Timeline } from './Timeline';

/** Cycles through the statuses so the landing page shows tracking in motion. */
export function TrackDemo() {
  const [i, setI] = useState(2);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const t = setInterval(() => setI((n) => (n + 1) % PIPELINE.length), 2400);
    return () => clearInterval(t);
  }, []);

  const step = PIPELINE[i];
  return (
    <div className="demo-card card">
      <div className="demo-card__head">
        <div className="avatar avatar--sm">S</div>
        <div>
          <div className="demo-card__shop">Sunita&apos;s Cake Studio</div>
          <div className="muted small">Order for Priya · Black Forest Cake 1kg</div>
        </div>
        <span className={`pill pill--${step.status.toLowerCase()}`}>{step.label}</span>
      </div>
      <Timeline status={step.status} compact />
      <p className="demo-card__blurb muted">{step.blurb}</p>
    </div>
  );
}
