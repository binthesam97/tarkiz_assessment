import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { ProductsPageComponent } from './components/products-page.component';
import * as productEffects from './state/products.effects';
import { productsFeature } from './state/products.reducer';

export default [
  {
    path: '',
    title: 'NgRx Product Management',
    component: ProductsPageComponent,
    // Registered lazily: the products slice only exists once this route is visited.
    providers: [provideState(productsFeature), provideEffects(productEffects)],
  },
] satisfies Routes;
