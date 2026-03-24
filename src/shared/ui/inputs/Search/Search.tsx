'use client';
import { InputBase } from '../InputBase/InputBase';
import { IconButton } from '../../buttons/IconButton/IconButton';
import styles from './Search.module.css';

interface SearchProps {
  size?: 'lg' | 'sm';
  collapsed?: boolean;
  placeholder?: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onSearch?: () => void;
  className?: string;
}

export function Search({
  size = 'lg',
  collapsed = false,
  placeholder = 'Поиск',
  value,
  onChange,
  onSearch,
  className,
}: SearchProps) {
  return (
    <div className={[styles.root, collapsed ? styles.collapsed : '', className ?? ''].join(' ').trim()}>
      <InputBase
        type="text"
        size={size === 'lg' ? 'lg' : 'sm'}
        color="gray"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        aria-label={placeholder}
        className={styles.input}
      />
      <IconButton
        icon="search"
        size={size === 'lg' ? 'lg' : 'md'}
        variant="gray"
        onClick={onSearch}
        aria-label="Найти"
      />
    </div>
  );
}
