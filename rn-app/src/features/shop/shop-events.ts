import { createAction } from '@reduxjs/toolkit';
import type { Order } from './api/shop.model';

/**
 * Domain events shared by the shop modules. Modules react to each other's events instead of
 * calling each other: checkout announces `orderPlaced`, and the cart clears itself in response.
 */
export const orderPlaced = createAction<Order>('shop/orderPlaced');
