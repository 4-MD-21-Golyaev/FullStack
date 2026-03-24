'use client';

import { useEffect, useState } from 'react';
import styles from './SlaTimer.module.css';

interface SlaTimerProps {
  startedAt: Date | string;
  limitSeconds: number;
}

function formatTime(totalSeconds: number): string {
  const abs = Math.abs(totalSeconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const sign = totalSeconds < 0 ? '+' : '';
  if (h > 0) return `${sign}${h}ч ${m}м`;
  if (m > 0) return `${sign}${m}м ${s}с`;
  return `${sign}${s}с`;
}

export function SlaTimer({ startedAt, limitSeconds }: SlaTimerProps) {
  const start = typeof startedAt === 'string' ? new Date(startedAt) : startedAt;

  const [remaining, setRemaining] = useState(() => {
    const elapsed = Math.floor((Date.now() - start.getTime()) / 1000);
    return limitSeconds - elapsed;
  });

  useEffect(() => {
    const tick = () => {
      const elapsed = Math.floor((Date.now() - start.getTime()) / 1000);
      setRemaining(limitSeconds - elapsed);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [start, limitSeconds]);

  const ratio = remaining / limitSeconds;
  const colorClass =
    remaining < 0
      ? styles.overdue
      : ratio < 0.2
        ? styles.danger
        : ratio < 0.5
          ? styles.warning
          : styles.ok;

  return (
    <span className={`${styles.root} ${colorClass}`}>
      {remaining < 0 ? `Просрочено ${formatTime(remaining)}` : formatTime(remaining)}
    </span>
  );
}
