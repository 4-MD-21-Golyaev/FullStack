'use client';
import { ArrowButton } from '../ArrowButton/ArrowButton';
import styles from './ArrowsContainer.module.css';

interface ArrowsContainerProps {
  size?: 'sm' | 'md' | 'lg';
  onPrev?: () => void;
  onNext?: () => void;
  disablePrev?: boolean;
  disableNext?: boolean;
  className?: string;
}

export function ArrowsContainer({
  size = 'sm',
  onPrev,
  onNext,
  disablePrev = false,
  disableNext = false,
  className,
}: ArrowsContainerProps) {
  return (
    <div className={[styles.root, styles[size], className ?? ''].join(' ').trim()}>
      <ArrowButton direction="left" size={size} onClick={onPrev} disabled={disablePrev} />
      <ArrowButton direction="right" size={size} onClick={onNext} disabled={disableNext} />
    </div>
  );
}
