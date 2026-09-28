import { EntityState, createEntityAdapter } from '@ngrx/entity';
import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import { Product } from '../data/product.model';
import { ProductsApiActions, ProductsPageActions } from './products.actions';

export type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error';
export type PendingOperation = 'creating' | 'updating' | 'deleting';

export interface ProductsState extends EntityState<Product> {
  loadStatus: LoadStatus;
  loadError: string | null;
  /** Latest failed mutation, shown as a dismissible banner. */
  mutationError: string | null;
  /** In-flight optimistic operations, keyed by product id. */
  pending: Record<string, PendingOperation>;
  /**
   * Server-confirmed copies of entities with an in-flight update or delete,
   * used to roll back when the request fails. Creates need no snapshot:
   * rolling back a create simply removes the entity.
   */
  snapshots: Record<string, Product>;
}

export const productsAdapter = createEntityAdapter<Product>({
  sortComparer: (a, b) => a.name.localeCompare(b.name),
});

const initialState: ProductsState = productsAdapter.getInitialState({
  loadStatus: 'idle',
  loadError: null,
  mutationError: null,
  pending: {},
  snapshots: {},
});

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _removed, ...rest } = record;
  return rest;
}

/** Clears the pending flag and snapshot for an entity once its request settles. */
function settle(state: ProductsState, id: string): Pick<ProductsState, 'pending' | 'snapshots'> {
  return { pending: without(state.pending, id), snapshots: without(state.snapshots, id) };
}

export const productsFeature = createFeature({
  name: 'products',
  reducer: createReducer(
    initialState,

    on(ProductsPageActions.opened, ProductsPageActions.reloadRequested, (state): ProductsState => ({
      ...state,
      loadStatus: 'loading',
      loadError: null,
    })),
    on(ProductsApiActions.loadSucceeded, (state, { products }): ProductsState => {
      // A reload must not clobber optimistic changes whose requests are still in flight.
      const { pending, entities } = state;
      const merged = products
        .filter((product) => pending[product.id] !== 'deleting')
        .map((product) => (pending[product.id] === 'updating' ? entities[product.id] ?? product : product));
      const unconfirmed = Object.keys(pending)
        .filter((id) => pending[id] === 'creating' && entities[id])
        .map((id) => entities[id]!);
      return productsAdapter.setAll([...merged, ...unconfirmed], { ...state, loadStatus: 'loaded' });
    }),
    on(ProductsApiActions.loadFailed, (state, { error }): ProductsState => ({ ...state, loadStatus: 'error', loadError: error })),

    // Create: insert immediately, reconcile with the server copy, remove on failure.
    on(ProductsPageActions.createRequested, (state, { id, draft }): ProductsState =>
      productsAdapter.addOne(
        { id, ...draft, updatedAt: new Date().toISOString() },
        { ...state, pending: { ...state.pending, [id]: 'creating' } },
      ),
    ),
    on(ProductsApiActions.createSucceeded, (state, { product }): ProductsState =>
      productsAdapter.setOne(product, { ...state, ...settle(state, product.id) }),
    ),
    on(ProductsApiActions.createFailed, (state, { id, error }): ProductsState =>
      productsAdapter.removeOne(id, { ...state, ...settle(state, id), mutationError: `Could not create product: ${error}` }),
    ),

    // Update: apply immediately, keeping the last confirmed copy for rollback.
    on(ProductsPageActions.updateRequested, (state, { id, changes }): ProductsState => {
      const current = state.entities[id];
      if (!current) return state;
      return productsAdapter.updateOne(
        { id, changes },
        {
          ...state,
          pending: { ...state.pending, [id]: 'updating' },
          // Preserve the original snapshot if several edits overlap.
          snapshots: { ...state.snapshots, [id]: state.snapshots[id] ?? current },
        },
      );
    }),
    on(ProductsApiActions.updateSucceeded, (state, { product }): ProductsState =>
      productsAdapter.setOne(product, { ...state, ...settle(state, product.id) }),
    ),
    on(ProductsApiActions.updateFailed, (state, { id, error }): ProductsState => {
      const snapshot = state.snapshots[id];
      const next = { ...state, ...settle(state, id), mutationError: `Could not update product: ${error}` };
      return snapshot ? productsAdapter.setOne(snapshot, next) : next;
    }),

    // Delete: remove immediately, restore the snapshot on failure.
    on(ProductsPageActions.deleteRequested, (state, { id }): ProductsState => {
      const current = state.entities[id];
      if (!current) return state;
      return productsAdapter.removeOne(id, {
        ...state,
        pending: { ...state.pending, [id]: 'deleting' },
        snapshots: { ...state.snapshots, [id]: state.snapshots[id] ?? current },
      });
    }),
    on(ProductsApiActions.deleteSucceeded, (state, { id }): ProductsState => ({ ...state, ...settle(state, id) })),
    on(ProductsApiActions.deleteFailed, (state, { id, error }): ProductsState => {
      const snapshot = state.snapshots[id];
      const next = { ...state, ...settle(state, id), mutationError: `Could not delete product: ${error}` };
      return snapshot ? productsAdapter.addOne(snapshot, next) : next;
    }),

    on(ProductsPageActions.errorDismissed, (state): ProductsState => ({ ...state, mutationError: null })),
  ),
  extraSelectors: ({ selectProductsState, selectLoadStatus }) => {
    const { selectAll, selectTotal } = productsAdapter.getSelectors(selectProductsState);
    return {
      selectAll,
      selectTotal,
      selectIsLoading: createSelector(selectLoadStatus, (status) => status === 'loading'),
      selectInventoryValue: createSelector(selectAll, (products) =>
        products.reduce((total, product) => total + product.price * product.stock, 0),
      ),
    };
  },
});
