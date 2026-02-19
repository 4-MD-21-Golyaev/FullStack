export interface Product {
    id: string;
    name: string;
    article: string;
    price: number;
    stock: number;
    imagePath: string | null;
    categoryId: string;
}
