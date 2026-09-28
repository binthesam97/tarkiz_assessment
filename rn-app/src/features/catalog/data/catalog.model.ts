export interface CatalogItem {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  rating: number;
  imageUrl: string;
}

export interface CatalogPage {
  items: CatalogItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}
