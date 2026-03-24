'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../icons/Icon/Icon';
import { SelectOption } from '../SelectOption/SelectOption';
import styles from './Multiselect.module.css';

export interface MultiselectProps {
  options: { value: string; label: string }[];
  value?: string[];
  onChange?: (value: string[]) => void;
  placeholder?: string;
  size?: 'lg' | 'sm';
  disabled?: boolean;
  className?: string;
}

function getTriggerLabel(
  value: string[],
  options: { value: string; label: string }[],
  placeholder: string,
): string {
  if (value.length === 0) return placeholder;
  if (value.length === 1) return options.find((o) => o.value === value[0])?.label ?? placeholder;
  return `Выбрано: ${value.length}`;
}

export function Multiselect({
  options,
  value = [],
  onChange,
  placeholder = 'Выберите...',
  size = 'lg',
  disabled = false,
  className,
}: MultiselectProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const hasSelection = value.length > 0;
  const triggerLabel = getTriggerLabel(value, options, placeholder);

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
    if (!onChange) return;
    const next = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(next);
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
        aria-multiselectable="true"
      >
        <span className={hasSelection ? styles.label : styles.placeholder}>
          {triggerLabel}
        </span>
        <Icon
          name={open ? 'dropup' : 'dropdown'}
          size={size === 'lg' ? 20 : 16}
          className={styles.chevron}
        />
      </button>

      {open && (
        <div role="listbox" aria-multiselectable="true" className={[styles.dropdown, styles[`dropdown_${size}`]].join(' ').trim()}>
          {options.map((option) => (
            <SelectOption
              key={option.value}
              size={size}
              multiselect
              checked={value.includes(option.value)}
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
