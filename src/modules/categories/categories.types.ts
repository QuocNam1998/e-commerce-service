export type CategoryRecord = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
};

export type CreateCategoryInput = {
  slug: string;
  name: string;
  sortOrder: number;
};
