import styles from './Toast.module.css';

type ToastVariant = 'success' | 'warning' | 'danger' | 'info';

interface ToastProps {
  variant?: ToastVariant;
  message: string;
  onClose?: () => void;
}

export function Toast({ variant = 'info', message, onClose }: ToastProps) {
  return (
    <div className={[styles.root, styles[variant]].join(' ')} role="alert">
      <span className={styles.message}>{message}</span>
      {onClose ? (
        <button className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
          ×
        </button>
      ) : null}
    </div>
  );
}
