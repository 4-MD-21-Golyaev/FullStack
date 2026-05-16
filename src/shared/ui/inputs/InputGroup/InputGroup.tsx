import type { ReactNode } from 'react';
import styles from './InputGroup.module.css';

export interface InputGroupProps {
  title: string;
  required?: boolean;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

export function InputGroup({ title, required, description, action, children }: InputGroupProps) {
  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>
            {title}
            {required && <span className={styles.required}> *</span>}
          </h3>
          {action && <div className={styles.action}>{action}</div>}
        </div>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
