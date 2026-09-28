import { Router } from 'express';
import { db } from '../../data/db.js';

export const catalogRoutes = Router();

const MAX_PAGE_SIZE = 200;

/** Paginated, searchable 50k-item catalog: `?page=1&limit=50&q=watch`. */
catalogRoutes.get('/', (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.limit) || 50));
  const query = String(req.query.q ?? '').trim().toLowerCase();

  const matches = query
    ? db.catalog.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.brand.toLowerCase().includes(query) ||
          item.sku.toLowerCase().includes(query),
      )
    : db.catalog;

  const start = (page - 1) * limit;
  res.json({
    items: matches.slice(start, start + limit),
    page,
    limit,
    total: matches.length,
    hasMore: start + limit < matches.length,
  });
});
