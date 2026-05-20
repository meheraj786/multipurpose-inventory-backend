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

const createSale = async (data: CreateSaleInput, accountId: string): Promise<Sale> => {
  return await prisma.$transaction(async (tx) => {
    
    const sale = await tx.sale.create({
      data: {
        customerId: data.customerId,
        customerNumber: data.customerNumber,
        paymentMethod: data.paymentMethod,
        discount: data.discount,
        due: data.due,
        accountId,
      },
      include: {
        customer: true,
      }
    });

    for (const item of data.saleItems) {
      await tx.saleItem.create({
        data: {
          saleId: sale.id,
          productId: item.productId,
          quantity: item.quantity,
          purchasePrice: item.purchasePrice,
          sellPrice: item.sellPrice,
          discount: item.discount,
          accountId,
        }
      });

      let remaining = item.quantity;

      const stocks = await tx.productStock.findMany({
        where: {
          productId: item.productId,
          accountId,
          isDeleted: false,
          quantity: { gt: 0 }
        },
        orderBy: { createdAt: 'asc' },
      });

      for (const stock of stocks) {
        if (remaining <= 0) break;

        const deduct = Math.min(remaining, stock.quantity);

        await tx.productStock.update({
          where: { id: stock.id },
          data: { quantity: { decrement: deduct } }
        });

        remaining -= deduct;
      }

      if (remaining > 0) {
        throw new Error(`Insufficient stock for product: ${item.productId}`);
      }
    }

    return sale;
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
      include: { customer: true },
    }),
    prisma.sale.count({ where }),
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getSingleSale = async (id: string, accountId: string) => {
  return await prisma.sale.findFirst({
    where: { id, accountId, isDeleted: false },
    include: { customer: true },
  });
};

const updateSale = async (id: string, accountId: string, data: UpdateSaleInput): Promise<Sale> => {
  return await prisma.sale.update({
    where: { id, accountId },
    data,
  });
};

const deleteSale = async (id: string, accountId: string, userId: string) => {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const sale = await tx.sale.findUnique({ where: { id } });
    if (!sale || sale.accountId !== accountId) {
      throw new Error("Sale not found");
    }

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
