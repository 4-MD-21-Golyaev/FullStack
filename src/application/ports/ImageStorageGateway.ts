export interface ImageStorageGateway {
    /**
     * Сохраняет байты изображения на диск.
     * Возвращает относительный web-путь (например /uploads/products/ABC.jpg).
     */
    save(bytes: Buffer, article: string, filename: string): Promise<string>;
}
