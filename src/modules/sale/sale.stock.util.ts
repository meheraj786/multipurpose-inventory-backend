import type { Prisma } from "../../generated/prisma/index.js";

export type SaleStockItem = {
  itemType: "PRODUCT" | "PREPARED_PRODUCT";
  productId?: string | null;
  preparedProductId?: string | null;
  unitId?: string | null;
  quantity: number | string | { toString(): string };
  purchasePrice?: number | string | { toString(): string } | null;
};

const toNumber = (value: number | string | { toString(): string } | null | undefined) =>
  Number(value ?? 0);

export const deductSaleItemsStock = async (
  tx: Prisma.TransactionClient,
  items: SaleStockItem[],
  accountId: string,
): Promise<Record<string, number>> => {
  const costs: Record<string, number> = {};

  for (const item of items) {
    const quantity = toNumber(item.quantity);
    if (quantity <= 0) continue;

    if (item.itemType === "PREPARED_PRODUCT") {
      if (!item.preparedProductId) continue;

      const _preparedProduct = await tx.preparedProduct.findUnique({
        where: { id: item.preparedProductId },
        select: { rawMaterialCost: true },
      });

      let remaining = quantity;
      let totalCost = 0;

      const stocks = await tx.preparedProductStock.findMany({
        where: {
          preparedProductId: item.preparedProductId,
          accountId,
          isDeleted: false,
          quantity: { gt: 0 },
        },
        orderBy: { createdAt: "asc" },
      });

      for (const stock of stocks) {
        if (remaining <= 0) break;
        const deduct = Math.min(remaining, Number(stock.quantity));
        totalCost += deduct * Number(stock.costPerUnit);
        await tx.preparedProductStock.update({
          where: { id: stock.id },
          data: { quantity: { decrement: deduct } },
        });
        remaining -= deduct;
      }

      if (remaining > 0) {
        throw new Error(`Insufficient stock for prepared product: ${item.preparedProductId}`);
      }

      costs[item.preparedProductId] = totalCost / quantity;
    } else {
      if (!item.productId) continue;

      let remaining = quantity;
      let totalCost = 0;

      const stocks = await tx.productStock.findMany({
        where: {
          productId: item.productId,
          accountId,
          isDeleted: false,
          quantity: { gt: 0 },
        },
        orderBy: { createdAt: "asc" },
      });

      for (const stock of stocks) {
        if (remaining <= 0) break;
        const deduct = Math.min(remaining, Number(stock.quantity));
        totalCost += deduct * Number(stock.purchasePrice);
        await tx.productStock.update({
          where: { id: stock.id },
          data: { quantity: { decrement: deduct } },
        });
        remaining -= deduct;
      }

      if (remaining > 0) {
        throw new Error(`Insufficient stock for product: ${item.productId}`);
      }

      costs[item.productId] = totalCost / quantity;
    }
  }

  return costs;
};

export const readdSaleItemsStock = async (
  tx: Prisma.TransactionClient,
  items: SaleStockItem[],
  accountId: string,
) => {
  for (const item of items) {
    const quantity = toNumber(item.quantity);
    if (quantity <= 0) continue;

    if (item.itemType === "PREPARED_PRODUCT") {
      if (!item.preparedProductId) continue;

      const stock = await tx.preparedProductStock.findFirst({
        where: { preparedProductId: item.preparedProductId, accountId, isDeleted: false },
        orderBy: { createdAt: "desc" },
      });

      if (stock) {
        await tx.preparedProductStock.update({
          where: { id: stock.id },
          data: { quantity: { increment: quantity } },
        });
      } else {
        await tx.preparedProductStock.create({
          data: { preparedProductId: item.preparedProductId, accountId, quantity },
        });
      }
    } else {
      if (!item.productId) continue;

      const product = await tx.product.findFirst({
        where: { id: item.productId, accountId },
      });
      if (!product) throw new Error(`Product not found: ${item.productId}`);

      const unitId = item.unitId ?? product.unitId;
      const purchasePrice = toNumber(item.purchasePrice);

      const stock = await tx.productStock.findFirst({
        where: {
          productId: item.productId,
          unitId,
          accountId,
          isDeleted: false,
        },
        orderBy: { createdAt: "desc" },
      });

      if (stock) {
        await tx.productStock.update({
          where: { id: stock.id },
          data: { quantity: { increment: quantity } },
        });
        continue;
      }

      await tx.productStock.create({
        data: {
          productId: item.productId,
          unitId,
          quantity,
          purchasePrice,
          rate: 0,
          totalCost: quantity * purchasePrice,
          accountId,
        },
      });
    }
  }
};

export const assertSufficientStock = async (
  tx: Prisma.TransactionClient,
  items: SaleStockItem[],
  accountId: string,
) => {
  for (const item of items) {
    const quantity = toNumber(item.quantity);
    if (quantity <= 0) continue;

    if (item.itemType === "PREPARED_PRODUCT") {
      if (!item.preparedProductId) continue;

      const stocks = await tx.preparedProductStock.findMany({
        where: {
          preparedProductId: item.preparedProductId,
          accountId,
          isDeleted: false,
          quantity: { gt: 0 },
        },
      });
      const total = stocks.reduce((sum, s) => sum + Number(s.quantity), 0);

      if (total < quantity) {
        const preparedProduct = await tx.preparedProduct.findUnique({
          where: { id: item.preparedProductId },
          select: { name: true },
        });
        throw new Error(
          `Insufficient stock to restore sale. "${preparedProduct?.name ?? item.preparedProductId}" needs ${quantity} but only ${total} available.`,
        );
      }
    } else {
      if (!item.productId) continue;

      const stocks = await tx.productStock.findMany({
        where: {
          productId: item.productId,
          accountId,
          isDeleted: false,
          quantity: { gt: 0 },
        },
      });
      const total = stocks.reduce((sum, s) => sum + Number(s.quantity), 0);

      if (total < quantity) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { name: true },
        });
        throw new Error(
          `Insufficient stock to restore sale. "${product?.name ?? item.productId}" needs ${quantity} but only ${total} available.`,
        );
      }
    }
  }
};
