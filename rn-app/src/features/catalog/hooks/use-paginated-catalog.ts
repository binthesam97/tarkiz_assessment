import { useCallback, useEffect, useReducer, useRef } from 'react';
import { fetchCatalogPage } from '../data/catalog-api';
import type { CatalogItem } from '../data/catalog.model';

type Status = 'loading' | 'refreshing' | 'loadingMore' | 'idle' | 'error';

interface State {
  items: CatalogItem[];
  page: number;
  total: number;
  hasMore: boolean;
  status: Status;
  error: string | null;
}

type Action =
  | { type: 'start'; mode: 'loading' | 'refreshing' | 'loadingMore' }
  | { type: 'success'; items: CatalogItem[]; page: number; total: number; hasMore: boolean; append: boolean }
  | { type: 'failure'; error: string };

const initialState: State = { items: [], page: 0, total: 0, hasMore: true, status: 'loading', error: null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'start':
      return { ...state, status: action.mode, error: null };
    case 'success':
      return {
        items: action.append ? [...state.items, ...action.items] : action.items,
        page: action.page,
        total: action.total,
        hasMore: action.hasMore,
        status: 'idle',
        error: null,
      };
    case 'failure':
      return { ...state, status: 'error', error: action.error };
  }
}

/**
 * Server-side pagination for the 50k catalog. Only loaded pages are kept in
 * memory. A new query or refresh aborts any in-flight request, so stale pages
 * can never be appended to the wrong result set.
 */
export function usePaginatedCatalog(query: string) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const controllerRef = useRef<AbortController | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const load = useCallback(
    async (page: number, mode: 'loading' | 'refreshing' | 'loadingMore') => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      dispatch({ type: 'start', mode });
      try {
        const result = await fetchCatalogPage(page, query, controller.signal);
        if (controller.signal.aborted) return;
        dispatch({ type: 'success', items: result.items, page, total: result.total, hasMore: result.hasMore, append: page > 1 });
      } catch (error) {
        if (controller.signal.aborted) return;
        dispatch({ type: 'failure', error: error instanceof Error ? error.message : 'Failed to load products' });
      }
    },
    [query],
  );

  useEffect(() => {
    void load(1, 'loading');
    return () => controllerRef.current?.abort();
  }, [load]);

  const refresh = useCallback(() => void load(1, 'refreshing'), [load]);

  /** Safe to call repeatedly: FlatList fires onEndReached more than once near the end. */
  const loadMore = useCallback(() => {
    const { status, hasMore, page } = stateRef.current;
    if (status !== 'idle' || !hasMore) return;
    void load(page + 1, 'loadingMore');
  }, [load]);

  const retry = useCallback(() => {
    const { page } = stateRef.current;
    void load(page + 1, page === 0 ? 'loading' : 'loadingMore');
  }, [load]);

  return { ...state, refresh, loadMore, retry };
}
