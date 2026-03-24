'use client';

import { useId } from 'react';
import { InputBase } from '../InputBase/InputBase';
import { CodeSegment } from '../CodeSegment/CodeSegment';
import styles from './CodeInput.module.css';

const CODE_LENGTH = 4;

export interface CodeInputProps {
  value?: string;
  onChange?: (value: string) => void;
  error?: boolean;
  errorMessage?: string;
  className?: string;
}

export function CodeInput({ value = '', onChange, error = false, errorMessage, className }: CodeInputProps) {
  const inputId = useId();

  function handleContainerClick() {
    document.getElementById(inputId)?.focus();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH);
    onChange?.(next);
  }

  function segmentState(index: number): 'enabled' | 'activated' | 'error' {
    if (error) return 'error';
    if (index <= value.length) return 'activated';
    return 'enabled';
  }

  return (
    <div className={[styles.root, className ?? ''].join(' ').trim()} onClick={handleContainerClick}>
      <div className={styles.segments}>
        {Array.from({ length: CODE_LENGTH }, (_, i) => (
          <CodeSegment
            key={i}
            value={value[i]}
            state={segmentState(i)}
          />
        ))}
      </div>
      <InputBase
        id={inputId}
        type="text"
        inputMode="numeric"
        maxLength={CODE_LENGTH}
        value={value}
        onChange={handleChange}
        className={styles.hiddenInput}
        aria-label="Код подтверждения"
      />
      {error && errorMessage && (
        <span className={styles.errorMessage}>{errorMessage}</span>
      )}
    </div>
  );
}
