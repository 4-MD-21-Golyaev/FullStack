'use client';

import { useEffect } from 'react';
import { IconButton } from '../../buttons/IconButton/IconButton';
import styles from './Modal.module.css';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  size?: 'md' | 'lg';
  title?: string;
  onBack?: () => void;
  showClose?: boolean;
  footer?: React.ReactNode;
  /** When true: on mobile the bottom-sheet expands to fill near-full viewport. */
  fullHeight?: boolean;
}

export function Modal({ open, onClose, children, className, size, title, onBack, showClose = true, footer, fullHeight }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal>
      <div
        className={[styles.root, styles[size ?? 'md'], fullHeight ? styles.fullHeight : '', className].filter(Boolean).join(' ')}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className={styles.header}>
            <span className={styles.headerSlot}>
              {onBack
                ? <IconButton icon="arrow_left" variant="white" size="md" onClick={onBack} aria-label="Назад" />
                : <span style={{ width: 40, height: 40, visibility: 'hidden' }} />
              }
            </span>
            <span className={styles.headerTitle}>{title}</span>
            <span className={styles.headerSlot}>
              {showClose !== false
                ? <IconButton icon="cross" variant="white" size="md" onClick={onClose} aria-label="Закрыть" />
                : <span style={{ width: 40, height: 40, visibility: 'hidden' }} />
              }
            </span>
          </div>
        )}
        <div className={styles.content}>
          {children}
        </div>
        {footer && (
          <div className={styles.footer}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
