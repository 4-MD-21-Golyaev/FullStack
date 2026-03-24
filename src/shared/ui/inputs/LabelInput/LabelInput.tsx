'use client';

import { useState } from 'react';
import { InputBase } from '../InputBase/InputBase';
import styles from './LabelInput.module.css';

export interface LabelInputProps {
  label: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  size?: 'md' | 'sm';
  icon?: React.ReactNode;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export function LabelInput({
  label,
  value,
  onChange,
  placeholder,
  size = 'md',
  icon,
  id,
  disabled,
  className,
}: LabelInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const isActivated = isFocused || Boolean(value && value.length > 0);

  return (
    <div
      className={[
        styles.root,
        styles[`size_${size}`],
        isActivated ? styles.activated : styles.enabled,
        disabled ? styles.disabled : '',
        className ?? '',
      ].join(' ').trim()}
    >
      {icon ? <span className={styles.icon}>{icon}</span> : null}
      <div className={styles.inner}>
        {isActivated ? (
          <label className={styles.label} htmlFor={id}>{label}</label>
        ) : null}
        <InputBase
          id={id}
          value={value}
          onChange={onChange}
          placeholder={isActivated ? undefined : placeholder}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={styles.inputOverride}
        />
      </div>
    </div>
  );
}
