import { IconButton } from '../../buttons/IconButton/IconButton';
import styles from './InfoField.module.css';

export interface InfoFieldProps {
  name: string;
  value: string;
  size?: 'M' | 'S';
  showEdit?: boolean;
  showTransition?: boolean;
  onEdit?: () => void;
  onTransition?: () => void;
}

export function InfoField({
  name,
  value,
  size = 'M',
  showEdit = false,
  showTransition = false,
  onEdit,
  onTransition,
}: InfoFieldProps) {
  const hasButton = showEdit || showTransition;

  return (
    <div className={[styles.root, styles[`size${size}`], hasButton ? styles.withButton : ''].filter(Boolean).join(' ')}>
      <span className={styles.name}>{name}</span>
      <span className={styles.value}>{value}</span>
      {showEdit && (
        <div className={styles.editButton}>
          <IconButton icon="edit" size="md" variant="gray" onClick={onEdit} aria-label="Редактировать" />
        </div>
      )}
      {showTransition && !showEdit && (
        <div className={styles.transitionButton}>
          <IconButton icon="arrow_right" size="md" variant="gray" onClick={onTransition} aria-label="Перейти" />
        </div>
      )}
    </div>
  );
}
