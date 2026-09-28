import { createAsyncThunk, createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/core/store/store';
import type { CartLineInput, Product } from '../../api/shop.model';
import { orderPlaced } from '../../shop-events';
import { cartStorage } from './cart-storage';

export const MAX_QUANTITY = 10;

export interface CartLine {
  productId: string;
  name: string;
  imageUrl: string;
  /** Price when added, for display only. Totals always come from the server quote. */
  price: number;
  quantity: number;
  addedAt: string;
}

interface CartState {
  lines: Record<string, CartLine>;
  hydrated: boolean;
}

const initialState: CartState = { lines: {}, hydrated: false };

export const hydrateCart = createAsyncThunk('cart/hydrate', () => cartStorage.read());

const clamp = (quantity: number) => Math.max(1, Math.min(MAX_QUANTITY, Math.round(quantity)));

/**
 * The cart is owned by the device, so adding to it always succeeds instantly, even offline.
 * Nothing in it is trusted: stock and prices are re-checked by the server when it is quoted.
 */
export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    itemAdded: {
      reducer: (state, { payload }: PayloadAction<{ product: Product; quantity: number; addedAt: string }>) => {
        const { product, quantity, addedAt } = payload;
        const existing = state.lines[product.id];
        if (existing) {
          existing.quantity = clamp(existing.quantity + quantity);
          return;
        }
        state.lines[product.id] = { productId: product.id, name: product.name, imageUrl: product.imageUrl, price: product.price, quantity: clamp(quantity), addedAt };
      },
      prepare: (product: Product, quantity = 1) => ({ payload: { product, quantity, addedAt: new Date().toISOString() } }),
    },
    quantityChanged: (state, { payload }: PayloadAction<{ productId: string; quantity: number }>) => {
      const line = state.lines[payload.productId];
      if (line) line.quantity = clamp(payload.quantity);
    },
    itemRemoved: (state, { payload: productId }: PayloadAction<string>) => {
      delete state.lines[productId];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateCart.fulfilled, (state, { payload }) => {
        // Items added before hydration finished win over the stored copy of the same product.
        state.lines = { ...Object.fromEntries(payload.map((line) => [line.productId, line])), ...state.lines };
        state.hydrated = true;
      })
      .addCase(hydrateCart.rejected, (state) => {
        state.hydrated = true;
      })
      .addCase(orderPlaced, (state) => {
        state.lines = {};
      });
  },
});

export const { itemAdded, quantityChanged, itemRemoved } = cartSlice.actions;

const selectLineMap = (state: RootState) => state.cart.lines;

export const selectCartLines = createSelector([selectLineMap], (lines) =>
  Object.values(lines).sort((a, b) => a.addedAt.localeCompare(b.addedAt)),
);

export const selectCartCount = createSelector([selectCartLines], (lines) => lines.reduce((sum, line) => sum + line.quantity, 0));

/** What the server needs to price the cart: ids and quantities only. */
export const selectCartItems = createSelector([selectCartLines], (lines): CartLineInput[] =>
  lines.map(({ productId, quantity }) => ({ productId, quantity })),
);

export const selectQuantityInCart = (state: RootState, productId: string) => state.cart.lines[productId]?.quantity ?? 0;
