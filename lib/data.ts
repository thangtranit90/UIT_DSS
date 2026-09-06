import raw from "./products.generated.json";
import type { Category } from "./criteria";

export interface Product {
  id: string;
  category: Category;
  product: string;
  brand: string;
  price: number;
  criteria: Record<string, number>;
  raw: Record<string, string>;
}

const DATA = raw as unknown as Record<Category, Product[]>;

export const getProducts = (c: Category): Product[] => DATA[c];

export const priceStats = (c: Category) => {
  const p = DATA[c].map((x) => x.price).sort((a, b) => a - b);
  const q = (f: number) => p[Math.floor(f * (p.length - 1))];
  return { min: p[0], max: p[p.length - 1], p75: q(0.75), median: q(0.5), count: p.length };
};

export const money = (n: number) =>
  "$" + Math.round(n).toLocaleString("en-US");
