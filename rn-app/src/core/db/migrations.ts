/** Append-only. Never edit a migration that has shipped; add a new one instead. */
export const MIGRATIONS: readonly string[] = [
  // 1 — Employee directory (offline-first) and the outbox of pending mutations.
  `
  CREATE TABLE employees (
    id TEXT PRIMARY KEY NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    department TEXT NOT NULL,
    designation TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT '',
    version INTEGER NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX idx_employees_name ON employees (first_name, last_name);

  CREATE TABLE outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL,
    base_version INTEGER,
    created_at TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT
  );
  CREATE INDEX idx_outbox_entity ON outbox (entity, entity_id);
  `,

  // 2 — Background location tracking.
  `
  CREATE TABLE route_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shift_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy REAL,
    speed REAL,
    recorded_at TEXT NOT NULL,
    -- NULL: not yet assigned to an upload. Set before upload so a retry reuses the same batch id.
    batch_id TEXT,
    synced INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX idx_route_points_sync ON route_points (synced, batch_id);
  CREATE INDEX idx_route_points_shift ON route_points (shift_id, recorded_at);
  `,

  // 3 — Chat message store.
  `
  CREATE TABLE chat_messages (
    id TEXT PRIMARY KEY NOT NULL,
    conversation_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    text TEXT NOT NULL,
    sent_at TEXT NOT NULL,
    server_time TEXT,
    status TEXT NOT NULL
  );
  CREATE INDEX idx_chat_messages_conversation ON chat_messages (conversation_id, sent_at);
  `,

  // 4 — Server sequence number: orders chat messages that share a timestamp.
  `
  ALTER TABLE chat_messages ADD COLUMN seq INTEGER;
  CREATE INDEX idx_chat_messages_order ON chat_messages (conversation_id, sent_at, seq);
  `,
];
