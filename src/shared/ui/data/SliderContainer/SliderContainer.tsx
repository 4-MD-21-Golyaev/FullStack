'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Slider } from '../Slider/Slider';
import { ArrowsContainer } from '../../buttons/ArrowsContainer/ArrowsContainer';
import styles from './SliderContainer.module.css';

const SCROLL_STEP = 300;

interface SliderContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function SliderContainer({ children, className }: SliderContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 0);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      ro.disconnect();
    };
  }, [updateArrows]);

  const handlePrev = useCallback(() => {
    scrollRef.current?.scrollBy({ left: -SCROLL_STEP, behavior: 'smooth' });
  }, []);

  const handleNext = useCallback(() => {
    scrollRef.current?.scrollBy({ left: SCROLL_STEP, behavior: 'smooth' });
  }, []);

  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')}>
      <Slider className={styles.slider} ref={scrollRef}>
        {children}
      </Slider>
      <ArrowsContainer
        className={styles.controls}
        onPrev={handlePrev}
        onNext={handleNext}
        disablePrev={!canPrev}
        disableNext={!canNext}
      />
    </div>
  );
}
