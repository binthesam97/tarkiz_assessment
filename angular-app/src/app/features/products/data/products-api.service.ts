import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../../../core/app-config';
import { Product, ProductDraft } from './product.model';

@Injectable({ providedIn: 'root' })
export class ProductsApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(APP_CONFIG).apiUrl}/products`;

  getAll(): Observable<Product[]> {
    return this.http.get<Product[]>(this.baseUrl);
  }

  /** The client-generated id lets the optimistic entity and the persisted one share a key. */
  create(id: string, draft: ProductDraft): Observable<Product> {
    return this.http.post<Product>(this.baseUrl, { id, ...draft });
  }

  update(id: string, changes: Partial<ProductDraft>): Observable<Product> {
    return this.http.put<Product>(`${this.baseUrl}/${id}`, changes);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'the server is unreachable';
    return (error.error as { message?: string } | null)?.message ?? `HTTP ${error.status}`;
  }
  return error instanceof Error ? error.message : 'unknown error';
}
