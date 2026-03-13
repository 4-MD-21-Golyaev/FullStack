'use client';

import { useCallback, useRef } from 'react';
import styles from './FilterBar.module.css';

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  statusOptions?: FilterOption[];
  selectedStatuses?: string[];
  onStatusChange?: (statuses: string[]) => void;
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (value: string) => void;
  onDateToChange?: (value: string) => void;
}

export function FilterBar({
  search = '',
  onSearchChange,
  searchPlaceholder = 'Поиск...',
  statusOptions,
  selectedStatuses = [],
  onStatusChange,
  dateFrom = '',
  dateTo = '',
  onDateFromChange,
  onDateToChange,
}: FilterBarProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSearchChange?.(value);
      }, 300);
    },
    [onSearchChange],
  );

  const handleStatusToggle = (status: string) => {
    if (!onStatusChange) return;
    if (selectedStatuses.includes(status)) {
      onStatusChange(selectedStatuses.filter((s) => s !== status));
    } else {
      onStatusChange([...selectedStatuses, status]);
    }
  };

  return (
    <div className={styles.root}>
      {onSearchChange && (
        <input
          type="search"
          className={styles.search}
          placeholder={searchPlaceholder}
          defaultValue={search}
          onChange={handleSearchChange}
        />
      )}

      {statusOptions && onStatusChange && (
        <div className={styles.statuses}>
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`${styles.statusBtn} ${selectedStatuses.includes(opt.value) ? styles.statusBtnActive : ''}`}
              onClick={() => handleStatusToggle(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {(onDateFromChange || onDateToChange) && (
        <div className={styles.dates}>
          {onDateFromChange && (
            <input
              type="date"
              className={styles.dateInput}
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
            />
          )}
          {onDateToChange && (
            <input
              type="date"
              className={styles.dateInput}
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
            />
          )}
        </div>
      )}
    </div>
  );
}
