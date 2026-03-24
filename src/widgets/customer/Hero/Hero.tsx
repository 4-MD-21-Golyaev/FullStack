'use client';

import { useState } from 'react';
import styles from './Hero.module.css';

const TOTAL_SLIDES = 3;

export default function Hero() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className={styles.root}>
      <div className={styles.container}>
        <div className={styles.banner}>
          <span className={styles.bannerText}>Вкус Азии</span>
        </div>

        <div className={styles.dots}>
          {Array.from({ length: TOTAL_SLIDES }, (_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === activeIndex ? styles.dotActive : ''}`}
              onClick={() => setActiveIndex(i)}
              aria-label={`Слайд ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
