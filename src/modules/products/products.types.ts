export type ProductRecord = {
  id: string;
  sortOrder: number;
  slug: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
  image: string;
  highlights: string[];
  includes: string[];
};

export type CreateProductInput = {
  id: string;
  sortOrder: number;
  slug: string;
  name: string;
  categorySlug: string;
  price: number;
  stock: number;
  description: string;
  image: string;
  highlights: string[];
  includes: string[];
};

export type UpdateProductInput = {
  sortOrder?: number;
  name?: string;
  categorySlug?: string;
  price?: number;
  stock?: number;
  description?: string;
  image?: string;
  highlights?: string[];
  includes?: string[];
};

export type ProductFilterInput = {
  category?: string;
  search?: string;
};
