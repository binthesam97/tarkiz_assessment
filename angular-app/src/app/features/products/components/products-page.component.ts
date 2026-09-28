import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { NetworkControlsComponent } from '../../../core/mock-network/network-controls.component';
import { Product, ProductDraft } from '../data/product.model';
import { ProductsPageActions } from '../state/products.actions';
import { productsFeature } from '../state/products.reducer';
import { ProductFormDialogComponent } from './product-form-dialog.component';
import { ProductTableComponent } from './product-table.component';

@Component({
  selector: 'app-products-page',
  imports: [ProductTableComponent, ProductFormDialogComponent, NetworkControlsComponent, CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './products-page.component.html',
  styleUrl: './products-page.component.scss',
})
export class ProductsPageComponent {
  private readonly store = inject(Store);

  protected readonly products = this.store.selectSignal(productsFeature.selectAll);
  protected readonly total = this.store.selectSignal(productsFeature.selectTotal);
  protected readonly inventoryValue = this.store.selectSignal(productsFeature.selectInventoryValue);
  protected readonly pending = this.store.selectSignal(productsFeature.selectPending);
  protected readonly loadStatus = this.store.selectSignal(productsFeature.selectLoadStatus);
  protected readonly loadError = this.store.selectSignal(productsFeature.selectLoadError);
  protected readonly mutationError = this.store.selectSignal(productsFeature.selectMutationError);

  /** `undefined` = dialog closed, `null` = creating, `Product` = editing. */
  protected readonly editing = signal<Product | null | undefined>(undefined);

  constructor() {
    this.store.dispatch(ProductsPageActions.opened());
  }

  protected reload(): void {
    this.store.dispatch(ProductsPageActions.reloadRequested());
  }

  protected save(draft: ProductDraft): void {
    const editing = this.editing();
    if (editing) {
      this.store.dispatch(ProductsPageActions.updateRequested({ id: editing.id, changes: draft }));
    } else {
      this.store.dispatch(ProductsPageActions.createRequested({ id: crypto.randomUUID(), draft }));
    }
  }

  protected adjustStock({ product, delta }: { product: Product; delta: number }): void {
    this.store.dispatch(ProductsPageActions.updateRequested({ id: product.id, changes: { stock: Math.max(0, product.stock + delta) } }));
  }

  protected remove(product: Product): void {
    if (confirm(`Delete "${product.name}"?`)) {
      this.store.dispatch(ProductsPageActions.deleteRequested({ id: product.id }));
    }
  }

  protected dismissError(): void {
    this.store.dispatch(ProductsPageActions.errorDismissed());
  }
}
