import React from 'react';
import styles from './Slider.module.css';

interface SliderProps {
  children: React.ReactNode;
  className?: string;
}

export const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  function Slider({ children, className }, ref) {
    return (
      <div ref={ref} className={[styles.slider, className].filter(Boolean).join(' ')}>
        <div className={styles.content}>
          {children}
        </div>
      </div>
    );
  }
);
