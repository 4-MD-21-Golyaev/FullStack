'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Modal, IconButton, Input, Button } from '@/shared/ui';
import { addressesApi, type UserAddressDto } from '@/lib/api/addresses';
import styles from './AddressModal.module.css';

interface AddressModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (address: UserAddressDto) => void;
}

interface Suggestion {
  title: string;
  subtitle?: string;
}

interface YandexSuggestResponse {
  results: Array<{
    title: { text: string };
    subtitle?: { text: string };
  }>;
}


export function AddressModal({ open, onClose, onSaved }: AddressModalProps) {
  const [street, setStreet] = useState('');
  const [house, setHouse] = useState('');
  const [entrance, setEntrance] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const houseWrapperRef = useRef<HTMLDivElement>(null);
  const streetWrapperRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStreet('');
      setHouse('');
      setEntrance('');
      setFloor('');
      setApartment('');
      setSuggestions([]);
      setShowSuggestions(false);
      setError(null);
    }
  }, [open]);

  // Close suggestions on click outside
  useEffect(() => {
    if (!showSuggestions) return;
    const handler = (e: MouseEvent) => {
      if (streetWrapperRef.current && !streetWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSuggestions]);

  const fetchSuggestions = useCallback(async (value: string) => {
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const url = `/api/suggest?text=${encodeURIComponent('Санкт-Петербург ' + value)}`;
      const res = await fetch(url);
      const data: YandexSuggestResponse = await res.json();
      const mapped = (data.results ?? []).map(r => ({
        title: r.title.text,
        subtitle: r.subtitle?.text,
      }));
      setSuggestions(mapped);
      setShowSuggestions(mapped.length > 0);
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  const handleStreetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStreet(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const handleStreetKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionSelect = (suggestion: Suggestion) => {
    // Strip leading city prefix like "Санкт-Петербург, " if present
    let streetValue = suggestion.title;
    const cityPrefix = 'Санкт-Петербург, ';
    if (streetValue.startsWith(cityPrefix)) {
      streetValue = streetValue.slice(cityPrefix.length);
    }
    setStreet(streetValue);
    setSuggestions([]);
    setShowSuggestions(false);
    // Focus house field
    houseWrapperRef.current?.querySelector('input')?.focus();
  };


  const handleSubmit = async () => {
    if (!street.trim() || !house.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const addressParts = [
        `Санкт-Петербург, ${street.trim()}, д.${house.trim()}`,
        entrance ? `подъезд ${entrance}` : null,
        floor ? `этаж ${floor}` : null,
        apartment ? `кв.${apartment}` : null,
      ].filter(Boolean);
      const addressString = addressParts.join(', ');
      const result = await addressesApi.save(addressString);
      onSaved(result);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить адрес. Попробуйте ещё раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = isSubmitting || !street.trim() || !house.trim();

  return (
    <Modal open={open} onClose={onClose} size="md" title="Адрес">
      <div className={styles.form}>
        {/* City — read-only, label visually hidden via aria-label */}
        <Input
          value="Санкт-Петербург"
          readOnly
          aria-label="Город"
        />

        {/* Street row */}
        <div ref={streetWrapperRef} className={styles.streetWrapper}>
          <div className={styles.streetRow}>
            <Input
              value={street}
              onChange={handleStreetChange}
              onKeyDown={handleStreetKeyDown}
              placeholder="Улица"
              aria-label="Улица"
            />
            <IconButton
              icon="location"
              variant="gray"
              size="lg"
              onClick={() => {}}
              aria-label="Определить местоположение"
            />
          </div>
          {showSuggestions && (
            <div className={styles.suggestions} role="listbox">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className={styles.suggestionItem}
                  role="option"
                  aria-selected={false}
                  onMouseDown={() => handleSuggestionSelect(s)}
                >
                  <span className={styles.suggestionTitle}>{s.title}</span>
                  {s.subtitle && (
                    <span className={styles.suggestionSubtitle}>{s.subtitle}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* House / Entrance */}
        <div className={styles.row}>
          <div ref={houseWrapperRef} className={styles.flexItem}>
            <Input
              value={house}
              onChange={e => setHouse(e.target.value)}
              placeholder="Дом"
              aria-label="Дом"
            />
          </div>
          <Input
            value={entrance}
            onChange={e => setEntrance(e.target.value)}
            placeholder="Подъезд"
            aria-label="Подъезд"
          />
        </div>

        {/* Floor / Apartment */}
        <div className={styles.row}>
          <Input
            value={floor}
            onChange={e => setFloor(e.target.value)}
            placeholder="Этаж"
            aria-label="Этаж"
          />
          <Input
            value={apartment}
            onChange={e => setApartment(e.target.value)}
            placeholder="Квартира"
            aria-label="Квартира"
          />
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={handleSubmit}
          disabled={isDisabled}
        >
          Добавить
        </Button>

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </Modal>
  );
}
