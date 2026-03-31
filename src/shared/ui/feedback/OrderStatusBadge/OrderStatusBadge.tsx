import styles from './OrderStatusBadge.module.css';

export interface OrderStatusBadgeProps {
  label: string;
  bgColor: string;
  color: string;
  className?: string;
}

export function OrderStatusBadge({ label, bgColor, color, className }: OrderStatusBadgeProps) {
  return (
    <span
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={{ color, background: bgColor }}
    >
      {label}
    </span>
  );
}
