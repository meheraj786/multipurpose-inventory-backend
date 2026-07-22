import { type Prisma, SystemAction, SystemModule } from "../../generated/prisma/index.js";
import prisma from "../../shared/utils/prisma.js";
import { ActivityLogService } from "../activityLog/activityLog.service.js";
import { TrashService } from "../trash/trash.service.js";

type CreateCustomerReturnInput = {
  saleId: string;
  itemType: "PRODUCT" | "PREPARED_PRODUCT";
  productId?: string;
  preparedProductId?: string;
  quantity: number;
  refundAmount: number;
  restocked?: boolean;
  reason?: string;
};

type UpdateCustomerReturnInput = {
  reason?: string;
};

const createCustomerReturn = async (data: CreateCustomerReturnInput, accountId: string, userId: string) => {
  const quantity = Number(data.quantity);
  const refundAmount = Number(data.refundAmount);

  if (quantity <= 0) throw new Error("Return quantity must be greater than 0");
  if (refundAmount < 0) throw new Error("Refund amount cannot be negative");

  return await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id: data.saleId, accountId, isDeleted: false },
      include: { saleItems: true },
    });

    if (!sale) throw new Error("Sale transaction records not found");

    const matchedItem = sale.saleItems.find((item) => {
      if (data.itemType === "PRODUCT") {
        return item.itemType === "PRODUCT" && item.productId === data.productId;
      }
      return item.itemType === "PREPARED_PRODUCT" && item.preparedProductId === data.preparedProductId;
    });

    if (!matchedItem) {
      throw new Error("Returned item was not found inside the designated sale details");
    }

    if (Number(matchedItem.quantity) < quantity) {
      throw new Error(`Cannot return more items than purchased. Purchased: ${matchedItem.quantity}`);
    }

    const totalItemRefundableValue = Number(matchedItem.sellPrice) * quantity;
    if (refundAmount > totalItemRefundableValue) {
      throw new Error(`Refund amount exceeds value of returned items: ${totalItemRefundableValue}`);
    }

    const restock = data.restocked !== false;

    if (restock) {
      if (data.itemType === "PREPARED_PRODUCT" && data.preparedProductId) {
        const stock = await tx.preparedProductStock.findFirst({
          where: { preparedProductId: data.preparedProductId, accountId, isDeleted: false },
          orderBy: { createdAt: "desc" },
        });

        if (stock) {
          await tx.preparedProductStock.update({
            where: { id: stock.id },
            data: { quantity: { increment: quantity } },
          });
        } else {
          await tx.preparedProductStock.create({
            data: { preparedProductId: data.preparedProductId, accountId, quantity },
          });
        }
      } else if (data.itemType === "PRODUCT" && data.productId) {
        const product = await tx.product.findUnique({
          where: { id: data.productId },
        });
        if (!product) throw new Error("Product not found");

        const stock = await tx.productStock.findFirst({
          where: { productId: data.productId, unitId: product.unitId, accountId, isDeleted: false },
          orderBy: { createdAt: "desc" },
        });

        if (stock) {
          await tx.productStock.update({
            where: { id: stock.id },
            data: { quantity: { increment: quantity } },
          });
        } else {
          await tx.productStock.create({
            data: {
              productId: data.productId,
              unitId: product.unitId,
              quantity,
              purchasePrice: Number(matchedItem.purchasePrice),
              rate: 0,
              totalCost: quantity * Number(matchedItem.purchasePrice),
              accountId,
            },
          });
        }
      }
    }

    const originalDue = Number(sale.due ?? 0);
    let newDue = originalDue;

    if (refundAmount > 0) {
      newDue = Math.max(0, Number((originalDue - refundAmount).toFixed(2)));
    }

    await tx.sale.update({
      where: { id: data.saleId },
      data: { due: newDue },
    });

    const customerReturn = await tx.customerReturn.create({
      data: {
        saleId: data.saleId,
        itemType: data.itemType,
        productId: data.productId || null,
        preparedProductId: data.preparedProductId || null,
        quantity,
        refundAmount,
        restocked: restock,
        reason: data.reason || null,
        accountId,
      },
      include: {
        product: true,
        preparedProduct: true,
      },
    });

    const targetName = customerReturn.product?.name ?? customerReturn.preparedProduct?.name ?? "";

    await ActivityLogService.createLog({
      userId,
      module: SystemModule.SALE,
      action: SystemAction.STOCK_IN,
      details: `Processed customer return for ${targetName} (${quantity} units) from Sale #${data.saleId.slice(0, 8)}. Refund: ${refundAmount}`,
      accountId,
    });

    return customerReturn;
  });
};

const getAllReturns = async (
  accountId: string,
  page = 1,
  limit = 10,
  search?: string,
) => {
  const skip = (page - 1) * limit;

  const where: Prisma.CustomerReturnWhereInput = {
    accountId,
    isDeleted: false,
    ...(search && {
      OR: [
        { reason: { contains: search, mode: "insensitive" } },
        { saleId: { contains: search, mode: "insensitive" } },
        { product: { name: { contains: search, mode: "insensitive" } } },
        { preparedProduct: { name: { contains: search, mode: "insensitive" } } },
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
      include: { product: true, preparedProduct: true, sale: true },
    });
    if (!customerReturn) throw new Error("Customer return record not found");

    const qty = Number(customerReturn.quantity);

    if (customerReturn.restocked) {
      if (customerReturn.itemType === "PREPARED_PRODUCT" && customerReturn.preparedProductId) {
        let remaining = qty;
        const stocks = await tx.preparedProductStock.findMany({
          where: { preparedProductId: customerReturn.preparedProductId, accountId, isDeleted: false, quantity: { gt: 0 } },
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
          throw new Error("Unable to delete return. Restocked prepared product inventory has already been consumed");
        }
      } else if (customerReturn.itemType === "PRODUCT" && customerReturn.productId) {
        let remaining = qty;
        const stocks = await tx.productStock.findMany({
          where: { productId: customerReturn.productId, accountId, isDeleted: false, quantity: { gt: 0 } },
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
          throw new Error("Unable to delete return. Restocked product inventory has already been consumed");
        }
      }
    }

    const refund = Number(customerReturn.refundAmount);
    if (refund > 0) {
      await tx.sale.update({
        where: { id: customerReturn.saleId },
        data: { due: { increment: refund } },
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