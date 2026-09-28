import { Product } from '../data/product.model';
import { ProductsApiActions, ProductsPageActions } from './products.actions';
import { productsFeature } from './products.reducer';

const { reducer } = productsFeature;

const product: Product = { id: 'p-1', name: 'Desk Lamp', category: 'Furniture', price: 100, stock: 10, updatedAt: '2026-01-01T00:00:00Z' };
const loaded = reducer(undefined, ProductsApiActions.loadSucceeded({ products: [product] }));

describe('products reducer — optimistic updates', () => {
  it('applies an update immediately and marks it pending', () => {
    const state = reducer(loaded, ProductsPageActions.updateRequested({ id: 'p-1', changes: { stock: 11 } }));
    expect(state.entities['p-1']?.stock).toBe(11);
    expect(state.pending['p-1']).toBe('updating');
  });

  it('rolls an update back to the last confirmed copy on failure', () => {
    let state = reducer(loaded, ProductsPageActions.updateRequested({ id: 'p-1', changes: { stock: 11 } }));
    state = reducer(state, ProductsPageActions.updateRequested({ id: 'p-1', changes: { stock: 12 } }));
    state = reducer(state, ProductsApiActions.updateFailed({ id: 'p-1', error: 'HTTP 503' }));
    expect(state.entities['p-1']?.stock).toBe(10);
    expect(state.pending['p-1']).toBeUndefined();
    expect(state.mutationError).toContain('HTTP 503');
  });

  it('removes an optimistically created product when the request fails', () => {
    let state = reducer(loaded, ProductsPageActions.createRequested({ id: 'tmp', draft: { name: 'Mug', category: 'Kitchen', price: 5, stock: 1 } }));
    expect(state.ids).toContain('tmp');
    state = reducer(state, ProductsApiActions.createFailed({ id: 'tmp', error: 'HTTP 503' }));
    expect(state.ids).not.toContain('tmp');
  });

  it('restores a deleted product when the request fails', () => {
    let state = reducer(loaded, ProductsPageActions.deleteRequested({ id: 'p-1' }));
    expect(state.ids).not.toContain('p-1');
    state = reducer(state, ProductsApiActions.deleteFailed({ id: 'p-1', error: 'HTTP 503' }));
    expect(state.entities['p-1']).toEqual(product);
  });

  it('keeps unconfirmed optimistic changes when a reload completes', () => {
    let state = reducer(loaded, ProductsPageActions.updateRequested({ id: 'p-1', changes: { stock: 99 } }));
    state = reducer(state, ProductsApiActions.loadSucceeded({ products: [product] }));
    expect(state.entities['p-1']?.stock).toBe(99);
  });
});
