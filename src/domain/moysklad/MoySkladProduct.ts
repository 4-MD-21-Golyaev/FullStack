export interface MoySkladFolder {
    id: string;
    name: string;
    parentId: string | null;
}

export interface MoySkladProduct {
    id: string;            // id в МойСклад (нужен для запроса изображений)
    article: string;       // code из МойСклад
    name: string;
    price: number;         // уже в рублях (копейки / 100)
    folderId: string | null;
    hasImages: boolean;    // true если в МойСклад есть хотя бы одно изображение
}

export interface MoySkladStockItem {
    article: string;       // code из МойСклад
    stock: number;         // остаток, >= 0
}
