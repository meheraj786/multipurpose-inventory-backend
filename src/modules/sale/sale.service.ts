import {
  type Prisma,
  type Sale,
  SystemAction,
  SystemModule,
} from "../../generated/prisma/index.js";
import prisma from "../../shared/utils/prisma.js";
import { ActivityLogService } from "../activityLog/activityLog.service.js";
import { TrashService } from "../trash/trash.service.js";
import type { CreateSaleInput, UpdateSaleInput } from "./sale.validation.js";

const createSale = async (data: CreateSaleInput, accountId: string, userId: string) => {
  if (!accountId) throw new Error("accountId is required");

  return await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        customerId:
          data.customerId && data.customerId.trim() !== ""
            ? data.customerId
            : null,
        customerNumber: data.customerNumber ?? null,
        paymentMethod: data.paymentMethod,
        payments: data.payments ? JSON.parse(JSON.stringify(data.payments)) : null,
        discount: data.discount ?? 0,
        due: data.due ?? 0,
        accountId,
      },
    });

    // --- Sale Items (products) ---
    if (data.saleItems && data.saleItems.length > 0) {
      for (const item of data.saleItems) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (!product) throw new Error(`Product not found: ${item.productId}`);

        // Fetch purchasePrice from latest ProductStock entry
        const latestStock = await tx.productStock.findFirst({
          where: {
            productId: item.productId,
            accountId,
            isDeleted: false,
          },
          orderBy: { createdAt: "desc" },
        });

        const purchasePrice = latestStock
          ? Number(latestStock.purchasePrice)
          : 0;

        const unitId = item.unitId ?? product.unitId;

        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.productId,
            unitId,
            quantity: item.quantity,
            convertedQty: item.quantity,
            purchasePrice,
            sellPrice: item.sellPrice,
            discount: item.discount ?? 0,
            accountId,
          },
        });

        // Deduct stock FIFO
        let remaining = item.quantity;

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
          await tx.productStock.update({
            where: { id: stock.id },
            data: { quantity: { decrement: deduct } },
          });
          remaining -= deduct;
        }

        if (remaining > 0) {
          throw new Error(`Insufficient stock for product: ${item.productId}`);
        }
      }
    }

    // --- Sale Services ---
    if (data.saleServices && data.saleServices.length > 0) {
      for (const service of data.saleServices) {
        const total =
          service.unitPrice * service.quantity - (service.discount ?? 0);

        await tx.saleService.create({
          data: {
            saleId: sale.id,
            serviceId: service.serviceId,
            quantity: service.quantity,
            unitPrice: service.unitPrice,
            discount: service.discount ?? 0,
            total,
            accountId,
          },
        });
      }
    }

    await ActivityLogService.createLog({
      userId,
      module: SystemModule.SALE,
      action: SystemAction.CREATE,
      details: `Created sale with ${data.saleItems?.length ?? 0} item(s) and ${data.saleServices?.length ?? 0} service(s)`,
      accountId,
    });

    return await tx.sale.findUnique({
      where: { id: sale.id },
      include: {
        customer: true,
        saleItems: { include: { product: true } },
        saleServices: { include: { service: true } },
      },
    });
  });
};

const getAllSales = async (
  accountId: string,
  page: number = 1,
  limit: number = 10,
  search?: string,
) => {
  const skip = (page - 1) * limit;

  const where: Prisma.SaleWhereInput = {
    accountId,
    isDeleted: false,
    ...(search && {
      OR: [
        { customerNumber: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        saleItems: { include: { product: true } },
        saleServices: { include: { service: true } },
      },
    }),
    prisma.sale.count({ where }),
  ]);

  return {
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

const getSingleSale = async (id: string, accountId: string) => {
  const sale = await prisma.sale.findFirst({
    where: { id, accountId, isDeleted: false },
    include: {
      customer: true,
      saleItems: { include: { product: true } },
      saleServices: { include: { service: true } },
      invoices: true,
    },
  });

  if (!sale) throw new Error("Sale not found");
  return sale;
};

const updateSale = async (
  id: string,
  accountId: string,
  userId: string,
  data: UpdateSaleInput,
): Promise<Sale> => {
  const existing = await prisma.sale.findFirst({
    where: { id, accountId, isDeleted: false },
  });
  if (!existing) throw new Error("Sale not found");

  const updated = await prisma.sale.update({
    where: { id },
    data: {
      ...(data.customerId !== undefined && { customerId: data.customerId }),
      ...(data.customerNumber !== undefined && { customerNumber: data.customerNumber }),
      ...(data.paymentMethod && { paymentMethod: data.paymentMethod }),
      ...(data.payments !== undefined && {
        payments: data.payments ? JSON.parse(JSON.stringify(data.payments)) : null,
      }),
      ...(data.discount !== undefined && { discount: data.discount }),
      ...(data.due !== undefined && { due: data.due }),
    },
  });

  await ActivityLogService.createLog({
    userId,
    module: SystemModule.SALE,
    action: SystemAction.UPDATE,
    details: `Updated sale: ${id}`,
    accountId,
  });

  return updated;
};

const deleteSale = async (id: string, accountId: string, userId: string) => {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const sale = await tx.sale.findFirst({
      where: { id, accountId, isDeleted: false },
    });
    if (!sale) throw new Error("Sale not found");

    const result = await tx.sale.update({
      where: { id },
      data: { isDeleted: true },
    });

    await TrashService.addToTrash({
      moduleName: SystemModule.SALE,
      itemName: `Sale-${sale.id}`,
      itemId: sale.id,
      deletedBy: userId,
      accountId,
    });

    await ActivityLogService.createLog({
      userId,
      module: SystemModule.SALE,
      action: SystemAction.DELETE,
      details: `Deleted sale: ${sale.id}`,
      accountId,
    });

    return result;
  });
};

export const SaleService = {
  createSale,
  getAllSales,
  getSingleSale,
  updateSale,
  deleteSale,
};