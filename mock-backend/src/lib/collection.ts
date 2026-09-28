export interface Entity {
  id: string;
  updatedAt: string;
}

export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} "${id}" was not found`);
  }
}

/** Minimal in-memory repository. Insertion order is preserved for stable listings. */
export class Collection<T extends Entity> {
  private readonly items = new Map<string, T>();

  constructor(
    private readonly resource: string,
    seed: readonly T[] = [],
  ) {
    seed.forEach((item) => this.items.set(item.id, item));
  }

  list(): T[] {
    return [...this.items.values()];
  }

  get(id: string): T {
    const item = this.items.get(id);
    if (!item) throw new NotFoundError(this.resource, id);
    return item;
  }

  create(item: T): T {
    this.items.set(item.id, item);
    return item;
  }

  /** Applies a partial update; `undefined` values are ignored rather than clearing fields. */
  update(id: string, changes: Partial<Omit<T, 'id'>>): T {
    const defined = Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined));
    const updated = { ...this.get(id), ...defined, id, updatedAt: new Date().toISOString() } as T;
    this.items.set(id, updated);
    return updated;
  }

  remove(id: string): void {
    if (!this.items.delete(id)) throw new NotFoundError(this.resource, id);
  }
}
