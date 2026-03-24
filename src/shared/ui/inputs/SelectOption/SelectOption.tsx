import { Icon } from '../../icons/Icon/Icon';
import styles from './SelectOption.module.css';

export interface SelectOptionProps {
  children: React.ReactNode;
  size?: 'lg' | 'sm';
  selected?: boolean;
  multiselect?: boolean;
  checked?: boolean;
  onClick?: () => void;
}

export function SelectOption({
  children,
  size = 'lg',
  selected = false,
  multiselect = false,
  checked = false,
  onClick,
}: SelectOptionProps) {
  return (
    <div
      role="option"
      aria-selected={multiselect ? checked : selected}
      className={[
        styles.root,
        styles[size],
        !multiselect && selected ? styles.isSelected : '',
        multiselect ? styles.multiselect : '',
      ].join(' ').trim()}
      onClick={onClick}
    >
      {multiselect && (
        <span className={styles.checkbox} aria-hidden="true">
          <Icon name={checked ? 'checkbox' : 'checkbox_empty'} size={size === 'lg' ? 20 : 16} />
        </span>
      )}
      {children}
    </div>
  );
}
