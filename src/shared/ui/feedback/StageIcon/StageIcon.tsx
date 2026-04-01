import type { ReactNode } from 'react';
import styles from './StageIcon.module.css';

interface StageIconProps {
  state?: 'enabled' | 'activated';
  children: ReactNode;
}

/**
 * Контейнер для иконки этапа. Устанавливает `color: white` на внутренней поверхности,
 * поэтому дочерние элементы, использующие `currentColor`, автоматически получают белый цвет.
 *
 * @example
 * <StageIcon state="activated">
 *   <Icon name="calendar" size={20} />
 * </StageIcon>
 */
export function StageIcon({ state = 'enabled', children }: StageIconProps) {
  return (
    <div className={[styles.ring, state === 'activated' && styles.activated].filter(Boolean).join(' ')}>
      <div className={styles.surface}>
        {children}
      </div>
    </div>
  );
}
