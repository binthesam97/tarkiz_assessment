export const config = {
  port: Number(process.env.PORT ?? 3000),
  jwt: {
    secret: process.env.JWT_SECRET ?? 'local-dev-secret-change-me',
    accessTokenTtlSeconds: 15 * 60,
    refreshTokenTtlSeconds: 7 * 24 * 60 * 60,
  },
  notifications: {
    intervalMs: Number(process.env.NOTIFICATION_INTERVAL_MS ?? 8000),
  },
  /** When set, changing global fault-injection settings requires the `x-admin-key` header. */
  adminKey: process.env.ADMIN_KEY ?? null,
  catalogSize: 50_000,
} as const;
