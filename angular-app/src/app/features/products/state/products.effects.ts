import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, concatMap, exhaustMap, map, mergeMap, of } from 'rxjs';
import { ProductsApi, toErrorMessage } from '../data/products-api.service';
import { ProductsApiActions, ProductsPageActions } from './products.actions';

/** exhaustMap: ignore reload clicks while a load is already running. */
export const loadProducts = createEffect(
  (actions$ = inject(Actions), api = inject(ProductsApi)) =>
    actions$.pipe(
      ofType(ProductsPageActions.opened, ProductsPageActions.reloadRequested),
      exhaustMap(() =>
        api.getAll().pipe(
          map((products) => ProductsApiActions.loadSucceeded({ products })),
          catchError((error: unknown) => of(ProductsApiActions.loadFailed({ error: toErrorMessage(error) }))),
        ),
      ),
    ),
  { functional: true },
);

/** mergeMap: independent creates can run in parallel. */
export const createProduct = createEffect(
  (actions$ = inject(Actions), api = inject(ProductsApi)) =>
    actions$.pipe(
      ofType(ProductsPageActions.createRequested),
      mergeMap(({ id, draft }) =>
        api.create(id, draft).pipe(
          map((product) => ProductsApiActions.createSucceeded({ product })),
          catchError((error: unknown) => of(ProductsApiActions.createFailed({ id, error: toErrorMessage(error) }))),
        ),
      ),
    ),
  { functional: true },
);

/** concatMap: successive edits are applied on the server in the order they were made. */
export const updateProduct = createEffect(
  (actions$ = inject(Actions), api = inject(ProductsApi)) =>
    actions$.pipe(
      ofType(ProductsPageActions.updateRequested),
      concatMap(({ id, changes }) =>
        api.update(id, changes).pipe(
          map((product) => ProductsApiActions.updateSucceeded({ product })),
          catchError((error: unknown) => of(ProductsApiActions.updateFailed({ id, error: toErrorMessage(error) }))),
        ),
      ),
    ),
  { functional: true },
);

export const deleteProduct = createEffect(
  (actions$ = inject(Actions), api = inject(ProductsApi)) =>
    actions$.pipe(
      ofType(ProductsPageActions.deleteRequested),
      mergeMap(({ id }) =>
        api.delete(id).pipe(
          map(() => ProductsApiActions.deleteSucceeded({ id })),
          catchError((error: unknown) => of(ProductsApiActions.deleteFailed({ id, error: toErrorMessage(error) }))),
        ),
      ),
    ),
  { functional: true },
);
