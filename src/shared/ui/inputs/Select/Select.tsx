'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../icons/Icon/Icon';
import { SelectOption } from '../SelectOption/SelectOption';
import styles from './Select.module.css';

export interface SelectProps {
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  size?: 'lg' | 'sm';
  disabled?: boolean;
  className?: string;
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Выберите...',
  size = 'lg',
  disabled = false,
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? null;

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  function handleToggle() {
    if (!disabled) setOpen((prev) => !prev);
  }

  function handleSelect(optionValue: string) {
    onChange?.(optionValue);
    setOpen(false);
  }

  return (
    <div
      ref={wrapperRef}
      className={[styles.root, styles[size], open ? styles.isOpen : '', className ?? ''].join(' ').trim()}
    >
      <button
        type="button"
        className={[styles.trigger, styles[size]].join(' ').trim()}
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selectedLabel ? styles.label : styles.placeholder}>
          {selectedLabel ?? placeholder}
        </span>
        <Icon
          name={open ? 'dropup' : 'dropdown'}
          size={size === 'lg' ? 20 : 16}
          className={styles.chevron}
        />
      </button>

      {open && (
        <div role="listbox" className={styles.dropdown}>
          {options.map((option) => (
            <SelectOption
              key={option.value}
              size={size}
              selected={option.value === value}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </SelectOption>
          ))}
        </div>
      )}
    </div>
  );
}
