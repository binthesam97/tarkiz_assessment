import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input, output, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PRODUCT_CATEGORIES, Product, ProductDraft } from '../data/product.model';

/** Create / edit dialog. `product === null` opens it in create mode; `undefined` keeps it closed. */
@Component({
  selector: 'app-product-form-dialog',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialog (close)="closed.emit()" (cancel)="closed.emit()">
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <h2>{{ product() ? 'Edit product' : 'Add product' }}</h2>

        <label for="product-name">Name</label>
        <input id="product-name" class="input" formControlName="name" [class.invalid]="form.controls.name.touched && form.controls.name.invalid" />

        <label for="product-category">Category</label>
        <select id="product-category" class="input" formControlName="category">
          @for (category of categories; track category) {
            <option [value]="category">{{ category }}</option>
          }
        </select>

        <div class="row">
          <div>
            <label for="product-price">Price</label>
            <input id="product-price" class="input" type="number" min="0" step="0.01" formControlName="price" [class.invalid]="form.controls.price.touched && form.controls.price.invalid" />
          </div>
          <div>
            <label for="product-stock">Stock</label>
            <input id="product-stock" class="input" type="number" min="0" step="1" formControlName="stock" [class.invalid]="form.controls.stock.touched && form.controls.stock.invalid" />
          </div>
        </div>

        <div class="actions">
          <button type="button" class="btn" (click)="dialog.close()">Cancel</button>
          <button type="submit" class="btn primary">{{ product() ? 'Save changes' : 'Add product' }}</button>
        </div>
      </form>
    </dialog>
  `,
  styles: `
    dialog { width: min(440px, 92vw); padding: 1.5rem; border: none; border-radius: 12px; box-shadow: 0 20px 48px rgb(16 24 40 / 0.2); }
    dialog::backdrop { background: rgb(16 24 40 / 0.4); }
    form { display: grid; gap: 0.375rem; }
    label { margin-top: 0.5rem; font-weight: 500; font-size: 0.875rem; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.25rem; }
  `,
})
export class ProductFormDialogComponent {
  readonly product = input<Product | null | undefined>(undefined);
  readonly saved = output<ProductDraft>();
  readonly closed = output<void>();

  protected readonly categories = PRODUCT_CATEGORIES;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    category: [PRODUCT_CATEGORIES[0] as string, Validators.required],
    price: [0, [Validators.required, Validators.min(0)]],
    stock: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
  });

  constructor() {
    effect(() => {
      const product = this.product();
      const dialog = this.dialog().nativeElement;
      if (product === undefined) {
        if (dialog.open) dialog.close();
        return;
      }
      this.form.reset(product ?? { name: '', category: PRODUCT_CATEGORIES[0], price: 0, stock: 0 });
      if (!dialog.open) dialog.showModal();
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saved.emit(this.form.getRawValue());
    this.dialog().nativeElement.close();
  }
}
