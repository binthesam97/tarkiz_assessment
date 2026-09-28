import { Router } from 'express';
import { SEARCH_TERMS } from '../../data/seed.js';

export const searchRoutes = Router();

const MAX_RESULTS = 10;

/** Prefix matches rank ahead of substring matches. */
searchRoutes.get('/', (req, res) => {
  const query = String(req.query.q ?? '').trim().toLowerCase();
  if (!query) {
    res.json([]);
    return;
  }
  const prefix = SEARCH_TERMS.filter((term) => term.toLowerCase().startsWith(query));
  const contains = SEARCH_TERMS.filter((term) => !prefix.includes(term) && term.toLowerCase().includes(query));
  res.json([...prefix, ...contains].slice(0, MAX_RESULTS));
});
