import { type Prisma, SystemAction, SystemModule } from "../../generated/prisma/index.js";
import prisma from "../../shared/utils/prisma.js";
import { ActivityLogService } from "../activityLog/activityLog.service.js";
import { TrashService } from "../trash/trash.service.js";

type CreateWastageInput = {
  productId?: string;
  rawProductId?: string;
  preparedProductId?: string;
  quantity: number;
  reason: string;
  notes?: string;
};

type UpdateWastageInput = {
  reason?: string;
  notes?: string;
};

const createWastage = async (data: CreateWastageInput, accountId: string, userId: string) => {
  if (!data.productId && !data.rawProductId && !data.preparedProductId) {
    throw new Error("Specify at least one product asset to record wastage");
  }

  const quantity = Number(data.quantity);
  if (quantity <= 0) throw new Error("Wastage quantity must be greater than 0");

  return await prisma.$transaction(async (tx) => {
    if (data.productId) {
      let remaining = quantity;
      const stocks = await tx.productStock.findMany({
        where: {
          productId: data.productId,
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
        throw new Error("Insufficient stock to record product wastage");
      }
    } else if (data.rawProductId) {
      const rawProduct = await tx.rawProduct.findFirst({
        where: { id: data.rawProductId, accountId, isDeleted: false },
      });
      if (!rawProduct) throw new Error("Raw product not found");
      if (Number(rawProduct.totalStock) < quantity) {
        throw new Error("Insufficient stock to record raw product wastage");
      }

      await tx.rawProduct.update({
        where: { id: data.rawProductId },
        data: { totalStock: { decrement: quantity } },
      });

      let remaining = quantity;
      const stocks = await tx.rawProductStock.findMany({
        where: {
          rawProductId: data.rawProductId,
          accountId,
          isDeleted: false,
          quantity: { gt: 0 },
        },
        orderBy: { createdAt: "asc" },
      });

      for (const stock of stocks) {
        if (remaining <= 0) break;
        const deduct = Math.min(remaining, Number(stock.quantity));
        await tx.rawProductStock.update({
          where: { id: stock.id },
          data: { quantity: { decrement: deduct } },
        });
        remaining -= deduct;
      }
    } else if (data.preparedProductId) {
      let remaining = quantity;
      const stocks = await tx.preparedProductStock.findMany({
        where: {
          preparedProductId: data.preparedProductId,
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
        throw new Error("Insufficient stock to record prepared product wastage");
      }
    }

    const wastage = await tx.wastage.create({
      data: {
        productId: data.productId || null,
        rawProductId: data.rawProductId || null,
        preparedProductId: data.preparedProductId || null,
        quantity,
        reason: data.reason,
        notes: data.notes || null,
        accountId,
      },
      include: {
        product: true,
        rawProduct: true,
        preparedProduct: true,
      },
    });

    const targetName =
      wastage.product?.name ?? wastage.rawProduct?.name ?? wastage.preparedProduct?.name ?? "";

    await ActivityLogService.createLog({
      userId,
      module: SystemModule.WASTAGE,
      action: SystemAction.STOCK_OUT,
      details: `Recorded wastage for ${targetName}: ${quantity} units. Reason: ${data.reason}`,
      accountId,
    });

    return wastage;
  });
};

const getAllWastages = async (accountId: string, page = 1, limit = 10, search?: string) => {
  const skip = (page - 1) * limit;

  const where: Prisma.WastageWhereInput = {
    accountId,
    isDeleted: false,
    ...(search && {
      OR: [
        { reason: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
        { product: { name: { contains: search, mode: "insensitive" } } },
        { rawProduct: { name: { contains: search, mode: "insensitive" } } },
        {
          preparedProduct: { name: { contains: search, mode: "insensitive" } },
        },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.wastage.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        product: true,
        rawProduct: true,
        preparedProduct: true,
      },
    }),
    prisma.wastage.count({ where }),
  ]);

  return {
    data: {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    },
  };
};

const getSingleWastage = async (id: string, accountId: string) => {
  const wastage = await prisma.wastage.findFirst({
    where: { id, accountId, isDeleted: false },
    include: {
      product: true,
      rawProduct: true,
      preparedProduct: true,
    },
  });

  if (!wastage) throw new Error("Wastage record not found");
  return wastage;
};

const updateWastage = async (
  id: string,
  accountId: string,
  data: UpdateWastageInput,
  userId: string,
) => {
  const existing = await prisma.wastage.findFirst({
    where: { id, accountId, isDeleted: false },
  });
  if (!existing) throw new Error("Wastage record not found");

  const updated = await prisma.wastage.update({
    where: { id },
    data,
  });

  await ActivityLogService.createLog({
    userId,
    module: SystemModule.WASTAGE,
    action: SystemAction.UPDATE,
    details: `Updated wastage record #${id}`,
    accountId,
  });

  return updated;
};

const deleteWastage = async (id: string, accountId: string, userId: string) => {
  return await prisma.$transaction(async (tx) => {
    const wastage = await tx.wastage.findFirst({
      where: { id, accountId, isDeleted: false },
      include: { product: true, rawProduct: true, preparedProduct: true },
    });
    if (!wastage) throw new Error("Wastage record not found");

    const qty = Number(wastage.quantity);

    if (wastage.productId) {
      const stock = await tx.productStock.findFirst({
        where: { productId: wastage.productId, accountId, isDeleted: false },
        orderBy: { createdAt: "desc" },
      });
      if (stock) {
        await tx.productStock.update({
          where: { id: stock.id },
          data: { quantity: { increment: qty } },
        });
      } else {
        const product = await tx.product.findUnique({
          where: { id: wastage.productId },
        });
        if (product) {
          await tx.productStock.create({
            data: {
              productId: wastage.productId,
              unitId: product.unitId,
              quantity: qty,
              purchasePrice: 0,
              rate: 0,
              totalCost: 0,
              accountId,
            },
          });
        }
      }
    } else if (wastage.rawProductId) {
      await tx.rawProduct.update({
        where: { id: wastage.rawProductId },
        data: { totalStock: { increment: qty } },
      });

      const stock = await tx.rawProductStock.findFirst({
        where: {
          rawProductId: wastage.rawProductId,
          accountId,
          isDeleted: false,
        },
        orderBy: { createdAt: "desc" },
      });
      if (stock) {
        await tx.rawProductStock.update({
          where: { id: stock.id },
          data: { quantity: { increment: qty } },
        });
      } else {
        await tx.rawProductStock.create({
          data: {
            rawProductId: wastage.rawProductId,
            quantity: qty,
            accountId,
          },
        });
      }
    } else if (wastage.preparedProductId) {
      const stock = await tx.preparedProductStock.findFirst({
        where: {
          preparedProductId: wastage.preparedProductId,
          accountId,
          isDeleted: false,
        },
        orderBy: { createdAt: "desc" },
      });
      if (stock) {
        await tx.preparedProductStock.update({
          where: { id: stock.id },
          data: { quantity: { increment: qty } },
        });
      } else {
        await tx.preparedProductStock.create({
          data: {
            preparedProductId: wastage.preparedProductId,
            quantity: qty,
            accountId,
          },
        });
      }
    }

    const result = await tx.wastage.update({
      where: { id },
      data: { isDeleted: true },
    });

    const targetName =
      wastage.product?.name ?? wastage.rawProduct?.name ?? wastage.preparedProduct?.name ?? "";

    await TrashService.addToTrash({
      moduleName: SystemModule.WASTAGE,
      itemName: `Wastage-${targetName}`,
      itemId: wastage.id,
      deletedBy: userId,
      accountId,
    });

    await ActivityLogService.createLog({
      userId,
      module: SystemModule.WASTAGE,
      action: SystemAction.DELETE,
      details: `Reversed and deleted wastage record for ${targetName}`,
      accountId,
    });

    return result;
  });
};

export const WastageService = {
  createWastage,
  getAllWastages,
  getSingleWastage,
  updateWastage,
  deleteWastage,
};
