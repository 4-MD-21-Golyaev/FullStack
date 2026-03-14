import { MoySkladFolder, MoySkladProduct, MoySkladStockItem } from '@/domain/moysklad/MoySkladProduct';

export interface MoySkladCatalogGateway {
    fetchFolders(): Promise<MoySkladFolder[]>;
    fetchProducts(): Promise<MoySkladProduct[]>;
    fetchStock(): Promise<MoySkladStockItem[]>;
    fetchProductImage(productId: string): Promise<{ bytes: Buffer; filename: string } | null>;
}
