import { type Prisma, SystemAction, SystemModule } from "../../generated/prisma/index.js";
import prisma from "../../shared/utils/prisma.js";
import { ActivityLogService } from "../activityLog/activityLog.service.js";
import {
  consumeProductStock,
  removeProductStockAllocations,
  restoreProductStockAllocations,
  type ProductStockAllocationInput,
} from "../product/product-stock.util.js";
import { TrashService } from "../trash/trash.service.js";

type ReturnItemInput = {
  itemType: "PRODUCT" | "PREPARED_PRODUCT";
  productId?: string;
  preparedProductId?: string;
  quantity: number;
};

type CreateCustomerReturnInput = {
  saleId: string;
  items: ReturnItemInput[];
  restocked?: boolean;
  reason?: string;
};

type UpdateCustomerReturnInput = {
  reason?: string;
};

const createCustomerReturn = async (
  data: CreateCustomerReturnInput,
  accountId: string,
  userId: string,
) => {
  const restock = data.restocked !== false;

  return await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id: data.saleId, accountId, isDeleted: false },
      include: {
        saleItems: {
          include: { stockAllocations: { orderBy: { createdAt: "desc" } } },
        },
      },
    });

    if (!sale) throw new Error("Sale transaction records not found");

    const existingReturns = await tx.customerReturn.findMany({
      where: { saleId: data.saleId, accountId, isDeleted: false },
      include: { stockAllocations: true },
    });

    const returnedBySaleItem = new Map<string, number>();
    const returnedByBatch = new Map<string, number>();
    const legacyReturns = existingReturns.filter((r) => !r.saleItemId);
    for (const returnRecord of existingReturns) {
      if (returnRecord.saleItemId) {
        returnedBySaleItem.set(
          returnRecord.saleItemId,
          (returnedBySaleItem.get(returnRecord.saleItemId) ?? 0) + Number(returnRecord.quantity),
        );
      }
      for (const allocation of returnRecord.stockAllocations) {
        returnedByBatch.set(
          `${returnRecord.saleItemId}:${allocation.productStockId}`,
          (returnedByBatch.get(`${returnRecord.saleItemId}:${allocation.productStockId}`) ?? 0) +
            Number(allocation.quantity),
        );
      }
    }

    for (const returnRecord of legacyReturns) {
      const candidates = sale.saleItems.filter(
        (saleItem) =>
          saleItem.itemType === returnRecord.itemType &&
          saleItem.productId === returnRecord.productId &&
          saleItem.preparedProductId === returnRecord.preparedProductId,
      );
      let remaining = Number(returnRecord.quantity);
      for (const saleItem of candidates) {
        if (remaining <= 0) break;
        const alreadyReturned = returnedBySaleItem.get(saleItem.id) ?? 0;
        const available = Math.max(0, Number(saleItem.quantity) - alreadyReturned);
        const allocated = Math.min(remaining, available);
        returnedBySaleItem.set(saleItem.id, alreadyReturned + allocated);
        remaining -= allocated;
      }
    }

    let totalRefundValue = 0;
    const createdReturns: Array<{ id: string; refundAmount: number }> = [];

    for (const item of data.items) {
      const quantity = Number(item.quantity);
      if (quantity <= 0) throw new Error("Return quantity must be greater than 0");

      const candidates = sale.saleItems.filter(
        (saleItem) =>
          saleItem.itemType === item.itemType &&
          saleItem.productId === (item.productId ?? null) &&
          saleItem.preparedProductId === (item.preparedProductId ?? null),
      );
      if (candidates.length === 0) {
        throw new Error(
          "One or more returned items were not found inside the designated sale details",
        );
      }

      const availableToReturn = candidates.reduce(
        (sum, candidate) =>
          sum +
          Math.max(0, Number(candidate.quantity) - (returnedBySaleItem.get(candidate.id) ?? 0)),
        0,
      );
      if (quantity > availableToReturn + 1e-9) {
        throw new Error(
          `Cannot return ${quantity} unit(s) for ${item.productId || item.preparedProductId}. Only ${availableToReturn} unit(s) remain returnable.`,
        );
      }

      let remaining = quantity;
      for (const matchedItem of candidates) {
        if (remaining <= 0) break;
        const alreadyReturned = returnedBySaleItem.get(matchedItem.id) ?? 0;
        const available = Math.max(0, Number(matchedItem.quantity) - alreadyReturned);
        const returnedQuantity = Math.min(remaining, available);
        if (returnedQuantity <= 0) continue;

        const itemRefundValue = Number(matchedItem.sellPrice) * returnedQuantity;
        totalRefundValue += itemRefundValue;
        const returnRecord = await tx.customerReturn.create({
          data: {
            saleId: data.saleId,
            saleItemId: matchedItem.id,
            itemType: item.itemType,
            productId: item.productId || null,
            preparedProductId: item.preparedProductId || null,
            quantity: returnedQuantity,
            refundAmount: itemRefundValue,
            excessRefundAmount: 0,
            requiresManualRefund: false,
            restocked: restock,
            reason: data.reason || null,
            accountId,
          },
        });
        createdReturns.push({ id: returnRecord.id, refundAmount: itemRefundValue });
        returnedBySaleItem.set(matchedItem.id, alreadyReturned + returnedQuantity);
        remaining -= returnedQuantity;

        if (!restock) continue;

        if (item.itemType === "PREPARED_PRODUCT" && item.preparedProductId) {
          const stock = await tx.preparedProductStock.findFirst({
            where: {
              preparedProductId: item.preparedProductId,
              accountId,
              isDeleted: false,
            },
            orderBy: { createdAt: "desc" },
          });
          if (stock) {
            await tx.preparedProductStock.update({
              where: { id: stock.id },
              data: { quantity: { increment: returnedQuantity } },
            });
          } else {
            await tx.preparedProductStock.create({
              data: {
                preparedProductId: item.preparedProductId,
                accountId,
                quantity: returnedQuantity,
              },
            });
          }
          continue;
        }

        if (item.itemType !== "PRODUCT" || !item.productId) continue;
        const existingSaleAllocations = matchedItem.stockAllocations;
        const stockAllocations: ProductStockAllocationInput[] = [];
        if (existingSaleAllocations.length > 0) {
          let leftToRestock = returnedQuantity;
          for (const allocation of existingSaleAllocations) {
            if (leftToRestock <= 0) break;
            const returnedFromBatch =
              returnedByBatch.get(`${matchedItem.id}:${allocation.productStockId}`) ?? 0;
            const batchQuantity = Number(allocation.quantity);
            const saleQuantity = Number(allocation.saleQuantity ?? allocation.quantity);
            const returnedSaleQuantity =
              batchQuantity > 0 ? (returnedFromBatch * saleQuantity) / batchQuantity : 0;
            const availableSaleQuantity = Math.max(0, saleQuantity - returnedSaleQuantity);
            const allocatedSaleQuantity = Math.min(leftToRestock, availableSaleQuantity);
            if (allocatedSaleQuantity <= 0 || saleQuantity <= 0) continue;
            const allocationQuantity = (allocatedSaleQuantity * batchQuantity) / saleQuantity;
            stockAllocations.push({
              productStockId: allocation.productStockId,
              quantity: allocationQuantity,
              unitCost: Number(allocation.unitCost),
            });
            returnedByBatch.set(
              `${matchedItem.id}:${allocation.productStockId}`,
              returnedFromBatch + allocationQuantity,
            );
            leftToRestock -= allocatedSaleQuantity;
          }
          if (leftToRestock > 1e-9) {
            throw new Error(
              "Returned quantity is not covered by the original FIFO stock allocations",
            );
          }
        } else {
          const product = await tx.product.findFirst({
            where: { id: item.productId, accountId },
          });
          if (!product) throw new Error("Product not found");
          const unitCost = Number(matchedItem.purchasePrice);
          const stock = await tx.productStock.create({
            data: {
              productId: item.productId,
              unitId: matchedItem.unitId || product.unitId,
              quantity: 0,
              purchasePrice: unitCost,
              rate: 0,
              totalCost: 0,
              accountId,
            },
          });
          stockAllocations.push({
            productStockId: stock.id,
            quantity: returnedQuantity,
            unitCost,
          });
        }

        await restoreProductStockAllocations(tx, accountId, stockAllocations);
        await tx.customerReturnStockAllocation.createMany({
          data: stockAllocations.map((allocation) => ({
            customerReturnId: returnRecord.id,
            ...allocation,
          })),
        });
      }

      if (remaining > 1e-9) throw new Error("Unable to allocate the full return quantity");
    }

    const originalDue = Number(sale.due ?? 0);
    const appliedToDue = Math.min(originalDue, totalRefundValue);
    const excessAmount = Number((totalRefundValue - appliedToDue).toFixed(2));
    const newDue = Number((originalDue - appliedToDue).toFixed(2));

    if (excessAmount > 0) {
      for (const record of createdReturns) {
        const share =
          totalRefundValue > 0
            ? Number(((record.refundAmount / totalRefundValue) * excessAmount).toFixed(2))
            : 0;
        await tx.customerReturn.update({
          where: { id: record.id },
          data: {
            excessRefundAmount: share,
            requiresManualRefund: share > 0,
          },
        });
      }
    }

    await tx.sale.update({
      where: { id: data.saleId },
      data: { due: newDue },
    });

    await ActivityLogService.createLog({
      userId,
      module: SystemModule.SALE,
      action: SystemAction.STOCK_IN,
      details: `Processed batch customer return for Sale #${data.saleId.slice(0, 8)}. Total Refund: ${totalRefundValue}${
        excessAmount > 0 ? ` (excess requiring manual refund: ${excessAmount})` : ""
      }`,
      accountId,
    });

    return {
      success: true,
      totalRefundValue,
      excessAmount,
      requiresManualRefund: excessAmount > 0,
      newDue,
    };
  });
};

const getAllReturns = async (accountId: string, page = 1, limit = 10, search?: string) => {
  const skip = (page - 1) * limit;

  const where: Prisma.CustomerReturnWhereInput = {
    accountId,
    isDeleted: false,
    ...(search && {
      OR: [
        { reason: { contains: search, mode: "insensitive" } },
        { saleId: { contains: search, mode: "insensitive" } },
        { product: { name: { contains: search, mode: "insensitive" } } },
        {
          preparedProduct: { name: { contains: search, mode: "insensitive" } },
        },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.customerReturn.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        product: true,
        preparedProduct: true,
        sale: true,
      },
    }),
    prisma.customerReturn.count({ where }),
  ]);

  return {
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

const getSingleReturn = async (id: string, accountId: string) => {
  const customerReturn = await prisma.customerReturn.findFirst({
    where: { id, accountId, isDeleted: false },
    include: {
      product: true,
      preparedProduct: true,
      sale: true,
    },
  });

  if (!customerReturn) throw new Error("Customer return record not found");
  return customerReturn;
};

const updateReturn = async (
  id: string,
  accountId: string,
  data: UpdateCustomerReturnInput,
  userId: string,
) => {
  const existing = await prisma.customerReturn.findFirst({
    where: { id, accountId, isDeleted: false },
  });
  if (!existing) throw new Error("Customer return record not found");

  const updated = await prisma.customerReturn.update({
    where: { id },
    data,
  });

  await ActivityLogService.createLog({
    userId,
    module: SystemModule.SALE,
    action: SystemAction.UPDATE,
    details: `Updated details for customer return #${id}`,
    accountId,
  });

  return updated;
};

const deleteReturn = async (id: string, accountId: string, userId: string) => {
  return await prisma.$transaction(async (tx) => {
    const customerReturn = await tx.customerReturn.findFirst({
      where: { id, accountId, isDeleted: false },
      include: {
        product: true,
        preparedProduct: true,
        sale: true,
        saleItem: { select: { unitId: true } },
        stockAllocations: true,
      },
    });
    if (!customerReturn) throw new Error("Customer return record not found");

    const qty = Number(customerReturn.quantity);

    if (customerReturn.restocked) {
      if (customerReturn.itemType === "PREPARED_PRODUCT" && customerReturn.preparedProductId) {
        let remaining = qty;
        const stocks = await tx.preparedProductStock.findMany({
          where: {
            preparedProductId: customerReturn.preparedProductId,
            accountId,
            isDeleted: false,
            quantity: { gt: 0 },
          },
          orderBy: { createdAt: "asc" },
        });

        for (const stock of stocks) {
          if (remaining <= 0) break;
          const deduct = Math.min(remaining, Number(stock.quantity));
          await tx.preparedProductStock.update({
            where: { id: stock.id },
            data: { quantity: { decrement: deduct } },
          });
          remaining -= deduct;
        }

        if (remaining > 0) {
          throw new Error(
            "Unable to delete return. Restocked prepared product inventory has already been consumed",
          );
        }
      } else if (customerReturn.itemType === "PRODUCT" && customerReturn.productId) {
        if (customerReturn.stockAllocations.length > 0) {
          await removeProductStockAllocations(
            tx,
            accountId,
            customerReturn.stockAllocations.map((allocation) => ({
              productStockId: allocation.productStockId,
              quantity: Number(allocation.quantity),
              unitCost: Number(allocation.unitCost),
            })),
          );
        } else {
          await consumeProductStock(
            tx,
            customerReturn.productId,
            accountId,
            qty,
            customerReturn.saleItem?.unitId,
          );
        }
      }
    }

    const refund = Number(customerReturn.refundAmount);
    const excess = Number(customerReturn.excessRefundAmount ?? 0);
    const appliedRefund = Number((refund - excess).toFixed(2));

    if (appliedRefund > 0) {
      await tx.sale.update({
        where: { id: customerReturn.saleId },
        data: { due: { increment: appliedRefund } },
      });
    }

    const result = await tx.customerReturn.update({
      where: { id },
      data: { isDeleted: true },
    });

    const targetName = customerReturn.product?.name ?? customerReturn.preparedProduct?.name ?? "";

    await TrashService.addToTrash({
      moduleName: SystemModule.SALE,
      itemName: `CustomerReturn-${targetName}`,
      itemId: customerReturn.id,
      deletedBy: userId,
      accountId,
    });

    await ActivityLogService.createLog({
      userId,
      module: SystemModule.SALE,
      action: SystemAction.DELETE,
      details: `Reversed and deleted customer return for ${targetName}`,
      accountId,
    });

    return result;
  });
};

export const CustomerReturnService = {
  createCustomerReturn,
  getAllReturns,
  getSingleReturn,
  updateReturn,
  deleteReturn,
};
