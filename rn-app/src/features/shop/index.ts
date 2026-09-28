/**
 * Public API of the shop feature. Routes and the store import from here, never from the modules'
 * internals, so each module can be restructured without touching its consumers.
 */
export { shopApi } from './api/shop-api';
export { cartSlice, hydrateCart } from './cart/state/cart-slice';
export { cartStorage } from './cart/state/cart-storage';
export { ShopHeaderActions } from './shop-header-actions';
export { CartScreen } from './cart/screens/cart-screen';
export { CatalogScreen } from './catalog/screens/catalog-screen';
export { ProductScreen } from './catalog/screens/product-screen';
export { CheckoutScreen } from './checkout/screens/checkout-screen';
export { OrderScreen } from './orders/screens/order-screen';
export { OrdersScreen } from './orders/screens/orders-screen';
export { useOrderUpdates } from './notifications/use-order-updates';
export { orderPlaced } from './shop-events';
