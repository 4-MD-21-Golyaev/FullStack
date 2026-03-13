import styles from './StatCard.module.css';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  delta?: string;
  loading?: boolean;
}

export function StatCard({ label, value, icon, delta, loading = false }: StatCardProps) {
  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        {icon && <span className={styles.icon}>{icon}</span>}
      </div>
      {loading ? (
        <div className={styles.skeleton} />
      ) : (
        <div className={styles.value}>{value}</div>
      )}
      {delta && <div className={styles.delta}>{delta}</div>}
    </div>
  );
}
