import type { CatalogItem } from './catalog.model';

const ADJECTIVES = ['Classic', 'Pro', 'Ultra', 'Eco', 'Smart', 'Compact', 'Premium', 'Essential', 'Deluxe', 'Lite'];
const NOUNS = ['Headphones', 'Sneakers', 'Backpack', 'Watch', 'Speaker', 'Jacket', 'Blender', 'Lamp', 'Camera', 'Keyboard'];
const BRANDS = ['Acme', 'Globex', 'Initech', 'Umbrella', 'Stark', 'Wayne', 'Hooli', 'Vandelay'];

/** Generates the full dataset on-device for the "all in memory" mode. Deterministic per index. */
export function generateLocalCatalog(count: number): CatalogItem[] {
  const items = new Array<CatalogItem>(count);
  for (let index = 0; index < count; index++) {
    const n = index + 1;
    items[index] = {
      id: `local-${n}`,
      sku: `SKU-${String(n).padStart(6, '0')}`,
      name: `${ADJECTIVES[n % ADJECTIVES.length]} ${NOUNS[(n * 7) % NOUNS.length]} ${n}`,
      brand: BRANDS[(n * 3) % BRANDS.length]!,
      category: NOUNS[(n * 7) % NOUNS.length]!,
      price: Math.round(((n * 7919) % 99_900) + 100) / 100,
      rating: Math.round((((n * 31) % 40) / 10 + 1) * 10) / 10,
      imageUrl: `https://picsum.photos/seed/${n}/96`,
    };
  }
  return items;
}
