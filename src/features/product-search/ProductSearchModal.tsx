'use client';
import { Modal } from '@/shared/ui';
import { type ProductSearchResult } from './useProductSearch';
import { SearchBar } from './SearchBar';

interface Props {
  open: boolean;
  onSelect: (product: ProductSearchResult) => void;
  onClose: () => void;
}

export function ProductSearchModal({ open, onSelect, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Выбрать замену">
      <SearchBar onSelect={onSelect} placeholder="Название или артикул" />
    </Modal>
  );
}
