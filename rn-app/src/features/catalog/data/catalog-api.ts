import { request } from '@/core/api/http-client';
import type { CatalogPage } from './catalog.model';

export const PAGE_SIZE = 50;

export function fetchCatalogPage(page: number, query: string, signal?: AbortSignal): Promise<CatalogPage> {
  return request<CatalogPage>('/catalog', { query: { page, limit: PAGE_SIZE, q: query || undefined }, signal });
}
