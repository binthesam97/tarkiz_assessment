export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  updatedAt: string;
}

export type ProductDraft = Omit<Product, 'id' | 'updatedAt'>;

export const PRODUCT_CATEGORIES = ['Electronics', 'Furniture', 'Stationery', 'Apparel', 'Kitchen'] as const;
