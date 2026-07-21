import {
  type Prisma,
  type ProductStock,
  type Purchase,
  type PurchasePayment,
  PaymentMethod,
  PurchasePaymentStatus,
  SystemAction,
  SystemModule,
} from "../../generated/prisma/index.js";
import prisma from "../../shared/utils/prisma.js";
import { ActivityLogService } from "../activityLog/activityLog.service.js";
import { TrashService } from "../trash/trash.service.js";
import type { CreatePurchaseInput, UpdatePurchaseInput } from "./purchase.validation.js";

type RecordPaymentInput = {
  amount: number;
  method?: PaymentMethod;
  note?: string | null;
  paidAt?: Date;
};

const resolveStatus = (due: number): PurchasePaymentStatus => {
  if (due <= 0) return PurchasePaymentStatus.PAID;
  return PurchasePaymentStatus.PARTIALLY_PAID;
};

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
          paidAmount: 0,
          due: totalCost,
          paymentStatus: PurchasePaymentStatus.UNPAID,
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

const getAllPurchases = async (
  accountId: string,
  page = 1,
  limit = 10,
  search?: string,
  paymentStatus?: PurchasePaymentStatus,
) => {
  const skip = (page - 1) * limit;

  const where: Prisma.PurchaseWhereInput = {
    accountId,
    isDeleted: false,
    ...(paymentStatus && { paymentStatus }),
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
        payments: { orderBy: { paidAt: "desc" } },
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
    include: {
      productStocks: { include: { product: true } },
      supplier: true,
      payments: { orderBy: { paidAt: "desc" } },
    },
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

    const paidAmount = Number(purchase.paidAmount);
    if (paidAmount > totalCost) {
      throw new Error(
        `Cannot reduce total cost below the amount already paid (${paidAmount}). ` +
          `Refund or adjust payments first.`,
      );
    }
    const due = totalCost - paidAmount;

    const result = await tx.purchase.update({
      where: { id },
      data: {
        qty: updatedQty,
        purchasePrice: updatedPrice,
        rate: data.rate ?? purchase.rate,
        totalCost,
        due,
        paymentStatus: resolveStatus(due),
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

    if (Number(purchase.paidAmount) > 0) {
      throw new Error(
        `Cannot delete purchase — ${Number(purchase.paidAmount)} has already been paid ` +
          `toward this purchase. Reverse the payments first.`,
      );
    }

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

    await tx.productStock.updateMany({
      where: { purchaseId: id, accountId },
      data: { isDeleted: true },
    });

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

    await tx.productStock.updateMany({
      where: { purchaseId: id, accountId },
      data: { isDeleted: false },
    });

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

const recordPayment = async (
  purchaseId: string,
  accountId: string,
  userId: string,
  input: RecordPaymentInput,
) => {
  if (input.amount <= 0) throw new Error("Payment amount must be greater than 0");

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const purchase = await tx.purchase.findFirst({
      where: { id: purchaseId, accountId, isDeleted: false },
    });
    if (!purchase) throw new Error("Purchase not found");

    const currentDue = Number(purchase.due);
    if (input.amount > currentDue) {
      throw new Error(
        `Payment (${input.amount}) exceeds remaining due (${currentDue}) for this purchase`,
      );
    }

    const newPaid = Number(purchase.paidAmount) + input.amount;
    const newDue = currentDue - input.amount;

    const updatedPurchase = await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        paidAmount: newPaid,
        due: newDue,
        paymentStatus: resolveStatus(newDue),
      },
    });

    const payment = await tx.purchasePayment.create({
      data: {
        purchaseId,
        amount: input.amount,
        method: input.method ?? PaymentMethod.CASH,
        note: input.note ?? null,
        paidAt: input.paidAt ?? new Date(),
        accountId,
      },
    });

    await ActivityLogService.createLog({
      userId,
      module: SystemModule.PURCHASE,
      action: SystemAction.UPDATE,
      details: `Recorded payment of ${input.amount} for purchase ${purchaseId} (remaining due: ${newDue})`,
      accountId,
    });

    return { purchase: updatedPurchase, payment };
  });
};

const getPurchasePayments = async (
  purchaseId: string,
  accountId: string,
): Promise<PurchasePayment[]> => {
  const purchase = await prisma.purchase.findFirst({
    where: { id: purchaseId, accountId, isDeleted: false },
  });
  if (!purchase) throw new Error("Purchase not found");

  return prisma.purchasePayment.findMany({
    where: { purchaseId, accountId },
    orderBy: { paidAt: "desc" },
  });
};

const getDueSummary = async (accountId: string) => {
  const [totals, unpaidCount] = await Promise.all([
    prisma.purchase.aggregate({
      where: { accountId, isDeleted: false },
      _sum: { totalCost: true, paidAmount: true, due: true },
    }),
    prisma.purchase.count({
      where: { accountId, isDeleted: false, due: { gt: 0 } },
    }),
  ]);

  return {
    totalPurchased: totals._sum.totalCost ?? 0,
    totalPaid: totals._sum.paidAmount ?? 0,
    totalDue: totals._sum.due ?? 0,
    unpaidPurchaseCount: unpaidCount,
  };
};

const getSupplierDueSummary = async (accountId: string) => {
  const grouped = await prisma.purchase.groupBy({
    by: ["supplierId"],
    where: { accountId, isDeleted: false, due: { gt: 0 }, supplierId: { not: null } },
    _sum: { due: true, totalCost: true, paidAmount: true },
    _count: { _all: true },
  });

  const supplierIds = grouped.map((g) => g.supplierId).filter((id): id is string => !!id);

  const suppliers = await prisma.supplier.findMany({
    where: { id: { in: supplierIds } },
    select: { id: true, name: true, contact: true, email: true },
  });

  return grouped
    .map((g) => ({
      supplier: suppliers.find((s) => s.id === g.supplierId) ?? null,
      totalDue: g._sum.due ?? 0,
      totalPurchased: g._sum.totalCost ?? 0,
      totalPaid: g._sum.paidAmount ?? 0,
      unpaidPurchaseCount: g._count._all,
    }))
    .sort((a, b) => Number(b.totalDue) - Number(a.totalDue));
};

const getSupplierPurchaseLedger = async (
  supplierId: string,
  accountId: string,
  onlyUnpaid = false,
) => {
  return prisma.purchase.findMany({
    where: {
      accountId,
      supplierId,
      isDeleted: false,
      ...(onlyUnpaid && { due: { gt: 0 } }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      productStocks: { include: { product: true } },
      payments: { orderBy: { paidAt: "desc" } },
    },
  });
};

export const PurchaseService = {
  createPurchases,
  getAllPurchases,
  getSinglePurchase,
  updatePurchase,
  deletePurchase,
  restorePurchase,
  recordPayment,
  getPurchasePayments,
  getDueSummary,
  getSupplierDueSummary,
  getSupplierPurchaseLedger,
};
