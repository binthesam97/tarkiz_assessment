import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Product } from '../data/product.model';
import { PendingOperation } from '../state/products.reducer';

@Component({
  selector: 'app-product-table',
  imports: [CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Category</th>
          <th class="numeric">Price</th>
          <th class="numeric">Stock</th>
          <th>Status</th>
          <th><span class="visually-hidden">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        @for (product of products(); track product.id) {
          @let operation = pending()[product.id];
          <tr [class.pending]="operation">
            <td>{{ product.name }}</td>
            <td>{{ product.category }}</td>
            <td class="numeric">{{ product.price | currency: 'INR' }}</td>
            <td class="numeric">
              <div class="stepper">
                <button type="button" class="btn small" aria-label="Decrease stock" [disabled]="product.stock === 0" (click)="stockChange.emit({ product, delta: -1 })">−</button>
                <span>{{ product.stock }}</span>
                <button type="button" class="btn small" aria-label="Increase stock" (click)="stockChange.emit({ product, delta: 1 })">+</button>
              </div>
            </td>
            <td>
              @if (operation) {
                <span class="badge saving">{{ operation }}…</span>
              } @else {
                <span class="badge synced">saved</span>
              }
            </td>
            <td class="actions">
              <button type="button" class="btn small" [disabled]="operation === 'creating'" (click)="edit.emit(product)">Edit</button>
              <button type="button" class="btn small danger" [disabled]="operation === 'creating'" (click)="remove.emit(product)">Delete</button>
            </td>
          </tr>
        } @empty {
          <tr>
            <td colspan="6" class="empty">No products yet.</td>
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: `
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border); text-align: left; }
    th { font-size: 0.8125rem; color: var(--text-muted); font-weight: 600; }
    .numeric { text-align: right; }
    .stepper { display: inline-flex; align-items: center; gap: 0.5rem; }
    .stepper span { min-width: 2.5ch; text-align: center; font-variant-numeric: tabular-nums; }
    tr.pending td { opacity: 0.65; }
    .saving { background: var(--warning-soft); color: var(--warning); }
    .synced { background: var(--success-soft); color: var(--success); }
    .actions { display: flex; justify-content: flex-end; gap: 0.375rem; }
    .empty { text-align: center; color: var(--text-muted); padding: 2rem; }
    .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  `,
})
export class ProductTableComponent {
  readonly products = input.required<Product[]>();
  readonly pending = input<Record<string, PendingOperation>>({});

  readonly edit = output<Product>();
  readonly remove = output<Product>();
  readonly stockChange = output<{ product: Product; delta: number }>();
}
