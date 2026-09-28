import { createRandom, pick } from '../lib/random.js';
import type { CatalogItem, Employee, Product, User } from './models.js';

const FIRST_NAMES = ['Aarav', 'Priya', 'Rahul', 'Ananya', 'Vikram', 'Sneha', 'Arjun', 'Meera', 'Karthik', 'Divya', 'Rohan', 'Nisha', 'Aditya', 'Kavya', 'Sanjay', 'Lakshmi', 'John', 'Emma', 'Liam', 'Olivia', 'Noah', 'Sophia', 'Ethan', 'Mia'];
const LAST_NAMES = ['Sharma', 'Iyer', 'Nair', 'Menon', 'Reddy', 'Patel', 'Gupta', 'Kumar', 'Das', 'Joseph', 'Thomas', 'Smith', 'Brown', 'Wilson', 'Taylor', 'Clark'];
const DEPARTMENTS = ['Engineering', 'HR', 'Finance', 'Sales', 'Marketing', 'Operations', 'IT'];
const DESIGNATIONS = ['Associate', 'Senior Associate', 'Lead', 'Manager', 'Senior Manager', 'Director'];
const LOCATIONS = ['Bengaluru', 'Kochi', 'Chennai', 'Hyderabad', 'Pune', 'London', 'Dubai'];

const PRODUCT_CATEGORIES = ['Electronics', 'Furniture', 'Stationery', 'Apparel', 'Kitchen'];
const PRODUCT_NAMES = ['Wireless Mouse', 'Mechanical Keyboard', 'Standing Desk', 'Ergonomic Chair', 'Notebook A5', 'Gel Pen Set', 'Hoodie', 'Laptop Sleeve', 'Coffee Mug', 'Water Bottle', 'USB-C Hub', '27" Monitor', 'Desk Lamp', 'Whiteboard', 'Backpack', 'Noise Cancelling Headphones', 'Webcam HD', 'Bookshelf', 'Polo T-Shirt', 'Lunch Box'];

const BRANDS = ['Acme', 'Globex', 'Initech', 'Umbrella', 'Stark', 'Wayne', 'Hooli', 'Vandelay', 'Soylent', 'Tyrell'];
const CATALOG_ADJECTIVES = ['Classic', 'Pro', 'Ultra', 'Eco', 'Smart', 'Compact', 'Premium', 'Essential', 'Deluxe', 'Lite'];
const CATALOG_NOUNS = ['Headphones', 'Sneakers', 'Backpack', 'Watch', 'Speaker', 'Jacket', 'Blender', 'Lamp', 'Camera', 'Keyboard', 'Monitor', 'Tablet', 'Bottle', 'Sunglasses', 'Wallet'];
const CATALOG_CATEGORIES = ['Audio', 'Footwear', 'Bags', 'Wearables', 'Home', 'Apparel', 'Kitchen', 'Photography', 'Computing', 'Accessories'];

export const SEARCH_TERMS: readonly string[] = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahrain', 'Bangladesh',
  'Belgium', 'Bhutan', 'Bolivia', 'Brazil', 'Bulgaria', 'Cambodia', 'Cameroon', 'Canada', 'Chile', 'China',
  'Colombia', 'Croatia', 'Cuba', 'Cyprus', 'Czechia', 'Denmark', 'Ecuador', 'Egypt', 'Estonia', 'Ethiopia',
  'Fiji', 'Finland', 'France', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Hungary', 'Iceland', 'India',
  'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan',
  'Kenya', 'Kuwait', 'Latvia', 'Lebanon', 'Lithuania', 'Luxembourg', 'Malaysia', 'Maldives', 'Malta', 'Mexico',
  'Monaco', 'Mongolia', 'Morocco', 'Myanmar', 'Nepal', 'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Oman',
  'Pakistan', 'Panama', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda',
  'Saudi Arabia', 'Serbia', 'Singapore', 'Slovakia', 'Slovenia', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sweden',
  'Switzerland', 'Taiwan', 'Tanzania', 'Thailand', 'Tunisia', 'Turkey', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom',
  'United States', 'Uruguay', 'Uzbekistan', 'Vietnam', 'Zambia', 'Zimbabwe',
];

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export function seedProducts(): Product[] {
  const random = createRandom(42);
  return PRODUCT_NAMES.map((name, index) => ({
    id: `p-${index + 1}`,
    name,
    category: pick(PRODUCT_CATEGORIES, random),
    price: Math.round((5 + random() * 495) * 100) / 100,
    stock: Math.floor(random() * 200),
    updatedAt: isoDaysAgo(Math.floor(random() * 30)),
  }));
}

export function seedEmployees(count = 60): Employee[] {
  const random = createRandom(7);
  return Array.from({ length: count }, (_, index) => {
    const firstName = pick(FIRST_NAMES, random);
    const lastName = pick(LAST_NAMES, random);
    const id = `e-${String(index + 1).padStart(4, '0')}`;
    return {
      id,
      firstName,
      lastName,
      email: `${firstName}.${lastName}${index + 1}@acme.test`.toLowerCase(),
      phone: `+91 9${String(Math.floor(random() * 1e9)).padStart(9, '0')}`,
      department: pick(DEPARTMENTS, random),
      designation: pick(DESIGNATIONS, random),
      location: pick(LOCATIONS, random),
      version: 1,
      updatedAt: isoDaysAgo(30),
    };
  });
}

export function seedUsers(): User[] {
  return [
    { id: 'u-1', email: 'admin@acme.test', password: 'Admin@123', name: 'Asha Admin', roles: ['ADMIN', 'HR', 'EMPLOYEE'], employeeId: 'e-0001' },
    { id: 'u-2', email: 'hr@acme.test', password: 'Hr@12345', name: 'Harish HR', roles: ['HR', 'EMPLOYEE'], employeeId: 'e-0002' },
    { id: 'u-3', email: 'employee@acme.test', password: 'Emp@12345', name: 'Esha Employee', roles: ['EMPLOYEE'], employeeId: 'e-0003' },
  ];
}

/** Derives a catalog item purely from its index, so every page is reproducible across restarts. */
export function catalogItemAt(index: number): CatalogItem {
  const random = createRandom(index + 1);
  const noun = pick(CATALOG_NOUNS, random);
  return {
    id: `c-${index + 1}`,
    sku: `SKU-${String(index + 1).padStart(6, '0')}`,
    name: `${pick(CATALOG_ADJECTIVES, random)} ${noun} ${index + 1}`,
    brand: pick(BRANDS, random),
    category: pick(CATALOG_CATEGORIES, random),
    price: Math.round((1 + random() * 999) * 100) / 100,
    rating: Math.round((1 + random() * 4) * 10) / 10,
    imageUrl: `https://picsum.photos/seed/${index + 1}/96`,
  };
}
