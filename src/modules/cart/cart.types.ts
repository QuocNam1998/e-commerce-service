export type CartItemRecord = {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

export type CartRecord = {
  id: string;
  userId: string;
  items: CartItemRecord[];
  total: number;
  updatedAt: string;
};

export type UpsertCartItemInput = {
  userId: string;
  productId: string;
  quantity: number;
};

export type UpdateCartItemInput = {
  userId: string;
  productId: string;
  quantity: number;
};

export type RemoveCartItemInput = {
  userId: string;
  productId: string;
};
