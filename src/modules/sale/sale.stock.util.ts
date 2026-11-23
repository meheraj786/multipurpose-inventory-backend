import type { Prisma } from "../../generated/prisma/index.js";
import {
  consumeProductStock,
  getAvailableProductStock,
  removeProductStockAllocations,
  restoreProductStockAllocations,
  type ProductStockAllocationInput,
} from "../product/product-stock.util.js";

type PersistedStockAllocation = {
  productStockId: string;
  quantity: number | string | { toString(): string };
  unitCost: number | string | { toString(): string };
  saleQuantity?: number | string | { toString(): string } | null;
};

export type SaleStockItem = {
  id?: string;
  itemType: "PRODUCT" | "PREPARED_PRODUCT";
  productId?: string | null;
  preparedProductId?: string | null;
  unitId?: string | null;
  quantity: number | string | { toString(): string };
  purchasePrice?: number | string | { toString(): string } | null;
  stockAllocations?: PersistedStockAllocation[];
};

const toNumber = (value: number | string | { toString(): string } | null | undefined) =>
  Number(value ?? 0);

export type SaleStockDeduction = {
  unitCosts: number[];
  productAllocations: Array<ProductStockAllocationInput & { itemIndex: number }>;
};

export const deductSaleItemsStock = async (
  tx: Prisma.TransactionClient,
  items: SaleStockItem[],
  accountId: string,
): Promise<SaleStockDeduction> => {
  const unitCosts = items.map(() => 0);
  const productAllocations: SaleStockDeduction["productAllocations"] = [];

  for (const [itemIndex, item] of items.entries()) {
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

      unitCosts[itemIndex] = totalCost / quantity;
    } else {
      if (!item.productId) continue;

      if (item.stockAllocations?.length) {
        let allocatedSaleQuantity = 0;
        let allocatedCost = 0;
        const normalizedAllocations = item.stockAllocations.map((allocation) => ({
          productStockId: allocation.productStockId,
          quantity: toNumber(allocation.quantity),
          unitCost: toNumber(allocation.unitCost),
        }));
        for (const allocation of item.stockAllocations) {
          const allocationQuantity = toNumber(allocation.quantity);
          const unitCost = toNumber(allocation.unitCost);
          const stock = await tx.productStock.findFirst({
            where: {
              id: allocation.productStockId,
              productId: item.productId,
              accountId,
              isDeleted: false,
            },
            select: { quantity: true },
          });
          if (!stock || Number(stock.quantity) < allocationQuantity) {
            throw new Error(
              `Insufficient stock in the original batch for product: ${item.productId}`,
            );
          }
          allocatedSaleQuantity += toNumber(allocation.saleQuantity ?? allocation.quantity);
          allocatedCost += allocationQuantity * unitCost;
        }
        if (Math.abs(allocatedSaleQuantity - quantity) > 1e-9) {
          throw new Error(
            `Original FIFO allocations do not match sale quantity for product: ${item.productId}`,
          );
        }
        await removeProductStockAllocations(tx, accountId, normalizedAllocations);
        unitCosts[itemIndex] = allocatedCost / quantity;
      } else {
        const consumption = await consumeProductStock(
          tx,
          item.productId,
          accountId,
          quantity,
          item.unitId,
        );
        unitCosts[itemIndex] = consumption.totalCost / quantity;
        productAllocations.push(
          ...consumption.allocations.map((allocation) => ({
            ...allocation,
            itemIndex,
          })),
        );
        const saleItemId = item.id;
        if (saleItemId && consumption.allocations.length) {
          await tx.saleItemStockAllocation.createMany({
            data: consumption.allocations.map((allocation) => ({
              saleItemId,
              ...allocation,
            })),
          });
        }
      }
    }
  }

  return { unitCosts, productAllocations };
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

      if (item.stockAllocations?.length) {
        const allocatedSaleQuantity = item.stockAllocations.reduce(
          (sum, allocation) => sum + toNumber(allocation.saleQuantity ?? allocation.quantity),
          0,
        );
        if (Math.abs(allocatedSaleQuantity - quantity) > 1e-9) {
          throw new Error(
            `Original FIFO allocations do not match sale quantity for product: ${item.productId}`,
          );
        }
        await restoreProductStockAllocations(
          tx,
          accountId,
          item.stockAllocations.map((allocation) => ({
            productStockId: allocation.productStockId,
            quantity: toNumber(allocation.quantity),
            unitCost: toNumber(allocation.unitCost),
          })),
        );
      } else {
        const stock = await tx.productStock.create({
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
        if (item.id) {
          await tx.saleItemStockAllocation.create({
            data: {
              saleItemId: item.id,
              productStockId: stock.id,
              quantity,
              unitCost: purchasePrice,
            },
          });
        }
      }
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

      if (item.stockAllocations?.length) continue;

      const total = await getAvailableProductStock(tx, item.productId, accountId, item.unitId);

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
