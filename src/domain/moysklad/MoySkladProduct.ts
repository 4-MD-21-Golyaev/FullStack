export interface MoySkladFolder {
    id: string;
    name: string;
    parentId: string | null;
}

export interface MoySkladProduct {
    article: string;       // code из МойСклад
    name: string;
    price: number;         // уже в рублях (копейки / 100)
    stock: number;         // остаток, >= 0
    folderId: string | null;
}
