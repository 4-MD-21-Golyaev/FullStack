import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import styles from './ChipsRow.module.css';

export interface ChipsRowProps {
  children: ReactNode;
  className?: string;
  /** When false: kept in DOM (preserves scrollLeft) but display:none. */
  visible?: boolean;
  /** Index of the currently selected child — auto-scrolls it into view on change. */
  activeIndex?: number;
}

export function ChipsRow({ children, className, visible = true, activeIndex }: ChipsRowProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!visible || activeIndex === undefined || activeIndex < 0) return;
    const container = ref.current;
    if (!container) return;
    const activeChip = container.children[activeIndex] as HTMLElement | undefined;
    if (!activeChip) return;
    container.scrollTo({ left: activeChip.offsetLeft, behavior: 'smooth' });
  }, [activeIndex, visible]);

  return (
    <div
      ref={ref}
      className={[styles.root, className ?? ''].filter(Boolean).join(' ')}
      data-visible={visible ? 'true' : 'false'}
    >
      {children}
    </div>
  );
}
