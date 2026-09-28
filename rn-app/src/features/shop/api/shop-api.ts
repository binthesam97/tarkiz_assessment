import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@/core/api/base-query';
import type { Order, Product, Quote, QuoteRequest } from './shop.model';

/**
 * Server state for the storefront. The client talks to one API gateway (backend-for-frontend),
 * which fans out to the catalogue, pricing, payment and order services behind it.
 *
 * Catalogue data changes rarely and is cached for 10 minutes; quotes and orders are always fresh.
 */
export const shopApi = createApi({
  reducerPath: 'shopApi',
  baseQuery,
  tagTypes: ['Order'],
  keepUnusedDataFor: 600,
  refetchOnReconnect: true,
  endpoints: (build) => ({
    getProducts: build.query<Product[], { category?: string; q?: string }>({
      query: ({ category, q }) => ({ url: '/shop/products', query: { category: category || undefined, q: q || undefined } }),
    }),
    getProduct: build.query<Product, string>({
      query: (id) => `/shop/products/${encodeURIComponent(id)}`,
    }),
    getCategories: build.query<string[], void>({
      query: () => '/shop/categories',
    }),
    // A read, even though it is a POST: the body is the cart. Re-prices whenever the cart changes.
    getQuote: build.query<Quote, QuoteRequest>({
      query: (body) => ({ url: '/shop/quote', method: 'POST', body }),
      keepUnusedDataFor: 0,
    }),
    getOrders: build.query<Order[], void>({
      query: () => '/shop/orders',
      providesTags: [{ type: 'Order', id: 'LIST' }],
      keepUnusedDataFor: 60,
    }),
    getOrder: build.query<Order, string>({
      query: (id) => `/shop/orders/${encodeURIComponent(id)}`,
      providesTags: (_result, _error, id) => [{ type: 'Order', id }],
    }),
  }),
});

export const { useGetProductsQuery, useGetProductQuery, useGetCategoriesQuery, useGetQuoteQuery, useGetOrdersQuery, useGetOrderQuery } = shopApi;
