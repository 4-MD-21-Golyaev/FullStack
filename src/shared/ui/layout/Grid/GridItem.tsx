import styles from './GridItem.module.css';

interface GridItemProps {
  children: React.ReactNode;
  /** Columns to span at desktop (default: 12 = full width) */
  span?: number;
  /** Columns to span at ≤ 1200px */
  spanLg?: number;
  /** Columns to span at ≤ 900px */
  spanMd?: number;
  /** Columns to span at ≤ 600px */
  spanSm?: number;
  className?: string;
}

export function GridItem({ children, span = 12, spanLg, spanMd, spanSm, className }: GridItemProps) {
  const resolvedLg = spanLg ?? span;
  const resolvedMd = spanMd ?? resolvedLg;
  const resolvedSm = spanSm ?? resolvedMd;

  const cls = [styles.item, className].filter(Boolean).join(' ');
  return (
    <div
      className={cls}
      style={{
        '--span': span,
        '--span-lg': resolvedLg,
        '--span-md': resolvedMd,
        '--span-sm': resolvedSm,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
