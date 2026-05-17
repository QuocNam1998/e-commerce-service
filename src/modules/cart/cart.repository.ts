import { prisma } from "../../lib/db/prisma.js";

const cartInclude = {
  items: {
    include: { product: { select: { name: true, price: true } } },
    orderBy: { createdAt: "asc" as const },
  },
};

type RawCart = Awaited<ReturnType<typeof findRawCart>>;
type NonNullRawCart = NonNullable<RawCart>;

async function findRawCart(userId: string) {
  return prisma.cart.findUnique({ where: { userId }, include: cartInclude });
}

export async function findOrCreateCart(userId: string) {
  const existing = await findRawCart(userId);
  if (existing) return mapCart(existing);

  const created = await prisma.cart.create({
    data: { userId },
    include: cartInclude,
  });
  return mapCart(created);
}

export async function upsertCartItem(
  userId: string,
  productId: string,
  quantity: number
) {
  const cart = await prisma.cart.upsert({
    where: { userId },
    create: {
      userId,
      items: { create: { productId, quantity } },
    },
    update: {},
    include: cartInclude,
  });

  // If cart already existed, upsert the item within it
  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    create: { cartId: cart.id, productId, quantity },
    update: { quantity },
  });

  return findOrCreateCart(userId);
}

export async function updateCartItemQuantity(
  userId: string,
  productId: string,
  quantity: number
) {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) return null;

  const item = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
  });
  if (!item) return null;

  await prisma.cartItem.update({
    where: { cartId_productId: { cartId: cart.id, productId } },
    data: { quantity },
  });

  return findOrCreateCart(userId);
}

export async function removeCartItem(userId: string, productId: string) {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) return null;

  const item = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
  });
  if (!item) return null;

  await prisma.cartItem.delete({
    where: { cartId_productId: { cartId: cart.id, productId } },
  });

  return findOrCreateCart(userId);
}

export async function clearCart(userId: string) {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) return;

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
}

function mapCart(cart: NonNullRawCart) {
  const items = cart.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    name: item.product.name,
    price: item.product.price,
    quantity: item.quantity,
  }));

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return {
    id: cart.id,
    userId: cart.userId,
    items,
    total,
    updatedAt: cart.updatedAt.toISOString(),
  };
}
