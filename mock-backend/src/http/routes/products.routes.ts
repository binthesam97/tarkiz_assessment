import { Router } from 'express';
import { db } from '../../data/db.js';
import type { Product } from '../../data/models.js';
import { randomId } from '../../lib/random.js';
import { requireFields } from '../middleware/errors.js';

type ProductInput = Omit<Product, 'id' | 'updatedAt'>;

export const productRoutes = Router();

productRoutes.get('/', (_req, res) => {
  res.json(db.products.list());
});

productRoutes.get('/:id', (req, res) => {
  res.json(db.products.get(req.params.id));
});

productRoutes.post('/', (req, res) => {
  const input = requireFields<ProductInput & { id?: string }>(req.body, ['name', 'category', 'price', 'stock']);
  // Clients performing optimistic creates may supply their own id so the
  // temporary entity and the persisted one share the same key.
  const product = db.products.create({
    id: input.id ?? randomId('p-'),
    name: input.name,
    category: input.category,
    price: Number(input.price),
    stock: Number(input.stock),
    updatedAt: new Date().toISOString(),
  });
  res.status(201).json(product);
});

productRoutes.put('/:id', (req, res) => {
  const { name, category, price, stock } = req.body as Partial<ProductInput>;
  res.json(db.products.update(req.params.id, { name, category, price, stock }));
});

productRoutes.delete('/:id', (req, res) => {
  db.products.remove(req.params.id);
  res.status(204).end();
});
