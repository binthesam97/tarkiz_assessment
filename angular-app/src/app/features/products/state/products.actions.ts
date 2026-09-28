import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Product, ProductDraft } from '../data/product.model';

export const ProductsPageActions = createActionGroup({
  source: 'Products Page',
  events: {
    Opened: emptyProps(),
    'Reload Requested': emptyProps(),
    'Create Requested': props<{ id: string; draft: ProductDraft }>(),
    'Update Requested': props<{ id: string; changes: Partial<ProductDraft> }>(),
    'Delete Requested': props<{ id: string }>(),
    'Error Dismissed': emptyProps(),
  },
});

export const ProductsApiActions = createActionGroup({
  source: 'Products API',
  events: {
    'Load Succeeded': props<{ products: Product[] }>(),
    'Load Failed': props<{ error: string }>(),
    'Create Succeeded': props<{ product: Product }>(),
    'Create Failed': props<{ id: string; error: string }>(),
    'Update Succeeded': props<{ product: Product }>(),
    'Update Failed': props<{ id: string; error: string }>(),
    'Delete Succeeded': props<{ id: string }>(),
    'Delete Failed': props<{ id: string; error: string }>(),
  },
});
