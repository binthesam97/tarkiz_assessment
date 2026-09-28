import { Router } from 'express';
import { db } from '../../data/db.js';
import type { CartLineInput, CatalogItem, Quote, ShippingAddress, ShippingOption, ShopOrder } from '../../data/models.js';
import { randomId } from '../../lib/random.js';
import { publishNotification } from '../../realtime/notification-hub.js';
import { authenticate } from '../middleware/auth.js';
import { requireFields, ValidationError } from '../middleware/errors.js';

/**
 * Storefront for the e-commerce reference implementation (React Native Q5): catalogue,
 * server-side pricing, a mock payment gateway and idempotent order placement.
 */
export const shopRoutes = Router();

const STOREFRONT_SIZE = 60;
const MAX_QUANTITY = 10;
const TAX_RATE = 0.18;
const FREE_SHIPPING_FROM = 2000;
const SHIPPING_FEES: Record<ShippingOption, number> = { STANDARD: 99, EXPRESS: 249 };

/** Payment methods understood by the mock gateway, in the style of a provider's test tokens. */
const TEST_PAYMENT_METHODS: Record<string, string | null> = {
  pm_card_success: null,
  pm_card_declined: 'Your card was declined.',
  pm_card_insufficient_funds: 'Your card has insufficient funds.',
};

export interface ShopProduct extends CatalogItem {
  description: string;
  largeImageUrl: string;
  stock: number;
}

const toShopProduct = (item: CatalogItem, index: number): ShopProduct => ({
  ...item,
  description: `${item.name} by ${item.brand}. A dependable pick from our ${item.category.toLowerCase()} range, covered by a one-year warranty.`,
  largeImageUrl: item.imageUrl.replace(/\/96$/, '/480'),
  stock: index % 11 === 0 ? 0 : 5 + (index % 20),
});

const products = db.catalog.slice(0, STOREFRONT_SIZE).map(toShopProduct);
const productsById = new Map(products.map((product) => [product.id, product]));

const round2 = (value: number) => Math.round(value * 100) / 100;

function quote(lines: CartLineInput[], shippingOption: ShippingOption = 'STANDARD'): Quote {
  if (!Array.isArray(lines) || lines.length === 0) throw new ValidationError('The cart is empty');
  if (!(shippingOption in SHIPPING_FEES)) throw new ValidationError('Unknown shipping option');

  const priced = lines.map(({ productId, quantity }) => {
    const product = productsById.get(productId);
    if (!product) throw new ValidationError(`Product "${productId}" is no longer available`);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw new ValidationError(`Quantity for "${product.name}" must be between 1 and ${MAX_QUANTITY}`);
    }
    if (quantity > product.stock) {
      throw new ValidationError(product.stock ? `Only ${product.stock} of "${product.name}" left in stock` : `"${product.name}" is out of stock`);
    }
    return { productId, name: product.name, imageUrl: product.imageUrl, unitPrice: product.price, quantity, lineTotal: round2(product.price * quantity) };
  });

  const subtotal = round2(priced.reduce((sum, line) => sum + line.lineTotal, 0));
  const shipping = shippingOption === 'STANDARD' && subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEES[shippingOption];
  const tax = round2(subtotal * TAX_RATE);
  return { lines: priced, shippingOption, subtotal, shipping, tax, total: round2(subtotal + shipping + tax), currency: 'INR' };
}

shopRoutes.get('/products', (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category : '';
  const query = String(req.query.q ?? '').trim().toLowerCase();
  res.json(
    products.filter(
      (product) =>
        (!category || product.category === category) &&
        (!query || product.name.toLowerCase().includes(query) || product.brand.toLowerCase().includes(query)),
    ),
  );
});

shopRoutes.get('/categories', (_req, res) => {
  res.json([...new Set(products.map((product) => product.category))].sort());
});

shopRoutes.get('/products/:id', (req, res) => {
  const product = productsById.get(req.params.id);
  if (!product) {
    res.status(404).json({ message: 'Product not found' });
    return;
  }
  res.json(product);
});

/** Prices a cart. Public, so totals can be shown before sign-in. */
shopRoutes.post('/quote', (req, res) => {
  const { items, shippingOption } = requireFields<{ items: CartLineInput[]; shippingOption?: ShippingOption }>(req.body, ['items']);
  res.json(quote(items, shippingOption));
});

shopRoutes.use(authenticate);

/** Creates a payment intent for the server-calculated total; the client never sends an amount. */
shopRoutes.post('/payment-intents', (req, res) => {
  const { items, shippingOption } = requireFields<{ items: CartLineInput[]; shippingOption?: ShippingOption }>(req.body, ['items']);
  const intent = db.paymentIntents.create({
    id: randomId('pi_'),
    userId: req.user!.sub,
    amount: quote(items, shippingOption).total,
    currency: 'INR',
    status: 'REQUIRES_CONFIRMATION',
    declineReason: null,
    updatedAt: new Date().toISOString(),
  });
  res.status(201).json(intent);
});

/**
 * Stands in for the payment provider's own API, which a real client reaches through the
 * provider's SDK rather than through our backend.
 */
shopRoutes.post('/gateway/payment-intents/:id/confirm', (req, res) => {
  const { paymentMethod } = requireFields<{ paymentMethod: string }>(req.body, ['paymentMethod']);
  const intent = db.paymentIntents.get(req.params.id as string);
  if (intent.userId !== req.user!.sub) {
    res.status(404).json({ message: 'Payment intent not found' });
    return;
  }
  if (intent.status !== 'REQUIRES_CONFIRMATION') {
    res.json(intent);
    return;
  }
  if (!(paymentMethod in TEST_PAYMENT_METHODS)) throw new ValidationError('Unknown payment method');
  const declineReason = TEST_PAYMENT_METHODS[paymentMethod] ?? null;
  // A declined intent can be retried with another payment method, as with real providers.
  res.json(declineReason ? { ...intent, status: 'DECLINED', declineReason } : db.paymentIntents.update(intent.id, { status: 'SUCCEEDED' }));
});

/** Idempotent on the `Idempotency-Key` header: replaying a request returns the order it created. */
shopRoutes.post('/orders', (req, res) => {
  const idempotencyKey = req.header('idempotency-key');
  if (!idempotencyKey) throw new ValidationError('The Idempotency-Key header is required');

  const userId = req.user!.sub;
  const existing = db.orders.list().find((order) => order.userId === userId && order.idempotencyKey === idempotencyKey);
  if (existing) {
    res.json(existing);
    return;
  }

  const input = requireFields<{ items: CartLineInput[]; shippingOption?: ShippingOption; paymentIntentId: string; address: ShippingAddress }>(
    req.body,
    ['items', 'paymentIntentId', 'address'],
  );
  const address = requireFields<ShippingAddress>(input.address, ['name', 'line1', 'city', 'postalCode']);
  const intent = db.paymentIntents.get(input.paymentIntentId);
  const priced = quote(input.items, input.shippingOption);
  if (intent.userId !== userId || intent.status !== 'SUCCEEDED') {
    res.status(402).json({ message: 'Payment has not been completed' });
    return;
  }
  if (intent.amount !== priced.total) {
    res.status(409).json({ message: 'Prices changed since payment was authorised. Please review your order.' });
    return;
  }
  if (db.orders.list().some((order) => order.paymentIntentId === intent.id)) {
    res.status(409).json({ message: 'This payment has already been used for another order' });
    return;
  }

  const now = new Date().toISOString();
  const order: ShopOrder = db.orders.create({
    id: `ORD-${Date.now().toString(36).toUpperCase()}`,
    userId,
    idempotencyKey,
    paymentIntentId: intent.id,
    address,
    quote: priced,
    status: 'CONFIRMED',
    createdAt: now,
    updatedAt: now,
  });
  publishNotification(
    {
      category: 'MESSAGE',
      title: 'Order confirmed',
      message: `Order ${order.id} for ₹${priced.total.toFixed(2)} is confirmed.`,
      resource: 'order',
      link: `/shop/orders/${order.id}`,
    },
    { userId },
  );
  res.status(201).json(order);
});

/** `?idempotencyKey=` lets a client find out whether a timed-out "place order" request succeeded. */
shopRoutes.get('/orders', (req, res) => {
  const key = typeof req.query.idempotencyKey === 'string' ? req.query.idempotencyKey : null;
  res.json(
    db.orders
      .list()
      .filter((order) => order.userId === req.user!.sub && (!key || order.idempotencyKey === key))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
});

shopRoutes.get('/orders/:id', (req, res) => {
  const order = db.orders.get(req.params.id as string);
  if (order.userId !== req.user!.sub) {
    res.status(404).json({ message: 'Order not found' });
    return;
  }
  res.json(order);
});
