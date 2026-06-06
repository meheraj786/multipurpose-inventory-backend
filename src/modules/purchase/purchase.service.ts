import {
  type Prisma,
  type ProductStock,
  type Purchase,
  SystemAction,
  SystemModule,
} from "../../generated/prisma/index.js";
import prisma from "../../shared/utils/prisma.js";
import { ActivityLogService } from "../activityLog/activityLog.service.js";
import { TrashService } from "../trash/trash.service.js";
import type { CreatePurchaseInput, UpdatePurchaseInput } from "./purchase.validation.js";

const createPurchases = async (data: CreatePurchaseInput, accountId: string, userId: string) => {
  if (!accountId) throw new Error("accountId is required");

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created: { purchase: Purchase; stock: ProductStock }[] = [];

    for (const item of data.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new Error(`Product not found: ${item.productId}`);

      const unitId = item.unitId ?? product.unitId;
      const totalCost = Number(item.quantity) * Number(item.purchasePrice);

      const purchase = await tx.purchase.create({
        data: {
          productId: item.productId,
          qty: item.quantity,
          purchasePrice: item.purchasePrice,
          rate: item.rate ?? 0,
          totalCost,
          supplierId: data.supplierId ?? null,
          notes: item.notes ?? data.notes ?? null,
          accountId,
        },
      });

      const stock = await tx.productStock.create({
        data: {
          productId: item.productId,
          purchaseId: purchase.id,
          supplierId: data.supplierId ?? null,
          unitId,
          quantity: item.quantity,
          purchasePrice: item.purchasePrice,
          rate: item.rate ?? 0,
          totalCost,
          batch: item.batch ?? null,
          accountId,
        },
      });

      await tx.product.update({
        where: { id: product.id },
        data: { defaultPurchasePrice: item.purchasePrice },
      });

      created.push({ purchase, stock });
    }

    await ActivityLogService.createLog({
      userId,
      module: SystemModule.PURCHASE,
      action: SystemAction.CREATE,
      details: `Created ${data.items.length} purchase item(s)`,
      accountId,
    });

    return created;
  });
};

const getAllPurchases = async (accountId: string, page = 1, limit = 10, search?: string) => {
  const skip = (page - 1) * limit;

  const where: Prisma.PurchaseWhereInput = {
    accountId,
    isDeleted: false,
    ...(search && {
      OR: [
        { notes: { contains: search, mode: "insensitive" } },
        { supplier: { name: { contains: search, mode: "insensitive" } } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        productStocks: { include: { product: true } },
        supplier: true,
      },
    }),
    prisma.purchase.count({ where }),
  ]);

  return {
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

const getSinglePurchase = async (id: string, accountId: string) => {
  const purchase = await prisma.purchase.findFirst({
    where: { id, accountId, isDeleted: false },
    include: { productStocks: { include: { product: true } }, supplier: true },
  });
  if (!purchase) throw new Error("Purchase not found");
  return purchase;
};

const updatePurchase = async (
  id: string,
  accountId: string,
  userId: string,
  data: UpdatePurchaseInput,
) => {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const purchase = await tx.purchase.findFirst({
      where: { id, accountId, isDeleted: false },
    });
    if (!purchase) throw new Error("Purchase not found");

    const updatedQty = data.qty ?? Number(purchase.qty);
    const updatedPrice = data.purchasePrice ?? Number(purchase.purchasePrice);
    const totalCost = updatedQty * updatedPrice;
    let supplierId = data.supplierId === undefined ? purchase.supplierId : data.supplierId;
    if (supplierId === "") supplierId = null;

    const result = await tx.purchase.update({
      where: { id },
      data: {
        qty: updatedQty,
        purchasePrice: updatedPrice,
        rate: data.rate ?? purchase.rate,
        totalCost,
        supplierId,
        notes: data.notes === undefined ? purchase.notes : data.notes,
      },
    });

    await tx.productStock.updateMany({
      where: { purchaseId: id, accountId },
      data: {
        quantity: updatedQty,
        purchasePrice: updatedPrice,
        rate: data.rate ?? purchase.rate,
        totalCost,
        supplierId,
      },
    });

    await ActivityLogService.createLog({
      userId,
      module: SystemModule.PURCHASE,
      action: SystemAction.UPDATE,
      details: `Updated purchase: ${id}`,
      accountId,
    });

    return result;
  });
};

const deletePurchase = async (id: string, accountId: string, userId: string) => {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const purchase = await tx.purchase.findFirst({
      where: { id, accountId, isDeleted: false },
      include: { productStocks: true },
    });
    if (!purchase) throw new Error("Purchase not found");

    // Guard: prevent deletion if any stock from this purchase has already
    // been (partially) sold — sold stock quantity will be less than original
    for (const stock of purchase.productStocks) {
      if (stock.isDeleted) continue;
      const original = Number(purchase.qty);
      const current = Number(stock.quantity);
      if (current < original) {
        const product = await tx.product.findUnique({
          where: { id: stock.productId },
          select: { name: true },
        });
        throw new Error(
          `Cannot delete purchase — stock for "${product?.name ?? stock.productId}" ` +
            `has already been partially sold (${original - current} unit(s) sold). ` +
            `Delete or void the related sales first.`,
        );
      }
    }

    // Soft-delete all ProductStock entries linked to this purchase
    await tx.productStock.updateMany({
      where: { purchaseId: id, accountId },
      data: { isDeleted: true },
    });

    // Soft-delete the purchase itself
    const result = await tx.purchase.update({
      where: { id },
      data: { isDeleted: true },
    });

    await TrashService.addToTrash({
      moduleName: SystemModule.PURCHASE,
      itemName: `Purchase-${purchase.id}`,
      itemId: purchase.id,
      deletedBy: userId,
      accountId,
    });

    await ActivityLogService.createLog({
      userId,
      module: SystemModule.PURCHASE,
      action: SystemAction.DELETE,
      details: `Deleted purchase ${purchase.id} — removed ${purchase.productStocks.length} stock entry(ies)`,
      accountId,
    });

    return result;
  });
};

const restorePurchase = async (id: string, accountId: string, userId: string) => {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const purchase = await tx.purchase.findFirst({
      where: { id, accountId, isDeleted: true },
      include: { productStocks: true },
    });
    if (!purchase) throw new Error("Purchase not found in trash");

    // Restore all linked stock entries
    await tx.productStock.updateMany({
      where: { purchaseId: id, accountId },
      data: { isDeleted: false },
    });

    // Restore the purchase
    const result = await tx.purchase.update({
      where: { id },
      data: { isDeleted: false },
    });

    await ActivityLogService.createLog({
      userId,
      module: SystemModule.PURCHASE,
      action: SystemAction.RESTORE,
      details: `Restored purchase ${id} — re-enabled ${purchase.productStocks.length} stock entry(ies)`,
      accountId,
    });

    return result;
  });
};

export const PurchaseService = {
  createPurchases,
  getAllPurchases,
  getSinglePurchase,
  updatePurchase,
  deletePurchase,
  restorePurchase,
};
