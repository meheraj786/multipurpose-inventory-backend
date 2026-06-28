import { type Prisma, SystemAction, SystemModule } from "../../generated/prisma/index.js";
import prisma from "../../shared/utils/prisma.js";
import { ActivityLogService } from "../activityLog/activityLog.service.js";
import { TrashService } from "../trash/trash.service.js";
import type {
  CreateRawProductInput,
  UpdateRawProductInput,
  RawProductStockInInput,
} from "./rawProduct.validation.js";

const createRawProduct = async (data: CreateRawProductInput, accountId: string, userId: string) => {
  const unit = await prisma.unit.findUnique({ where: { id: data.unitId } });
  if (!unit) throw new Error("Unit not found");

  const rawProduct = await prisma.rawProduct.create({
    data: { ...data, accountId, totalStock: 0 },
    include: { category: true, subCategory: true, unit: true },
  });

  await ActivityLogService.createLog({
    userId,
    module: SystemModule.RAW_PRODUCT,
    action: SystemAction.CREATE,
    details: `Created raw product: ${rawProduct.name}`,
    accountId,
  });

  return rawProduct;
};

const getAllRawProducts = async (
  accountId: string,
  page = 1,
  limit = 10,
  search?: string,
  categoryId?: string,
  subCategoryId?: string,
) => {
  const skip = (page - 1) * limit;

  const where: Prisma.RawProductWhereInput = {
    accountId,
    isDeleted: false,
    ...(categoryId && { categoryId }),
    ...(subCategoryId && { subCategoryId }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.rawProduct.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        subCategory: true,
        unit: true,
        rawProductStocks: {
          where: { isDeleted: false },
          select: { quantity: true },
        },
      },
    }),
    prisma.rawProduct.count({ where }),
  ]);

  const dataWithStock = data.map((rp) => ({
    ...rp,
    currentStock: rp.rawProductStocks.reduce((sum, s) => sum + Number(s.quantity), 0),
  }));

  return {
    data: dataWithStock,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

const getSingleRawProduct = async (id: string, accountId: string) => {
  const rawProduct = await prisma.rawProduct.findFirst({
    where: { id, accountId, isDeleted: false },
    include: {
      category: true,
      subCategory: true,
      unit: true,
      rawProductStocks: {
        where: { isDeleted: false },
        include: { supplier: true, purchase: true },
        orderBy: { createdAt: "desc" },
      },
      preparedProductItems: {
        include: { preparedProduct: true },
      },
    },
  });

  if (!rawProduct) throw new Error("Raw product not found");

  const currentStock = rawProduct.rawProductStocks.reduce((sum, s) => sum + Number(s.quantity), 0);

  return { ...rawProduct, currentStock };
};

const updateRawProduct = async (
  id: string,
  accountId: string,
  data: UpdateRawProductInput,
  userId: string,
) => {
  const existing = await prisma.rawProduct.findFirst({
    where: { id, accountId, isDeleted: false },
  });
  if (!existing) throw new Error("Raw product not found");

  if (data.unitId) {
    const unit = await prisma.unit.findUnique({ where: { id: data.unitId } });
    if (!unit) throw new Error("Unit not found");
  }

  const updated = await prisma.rawProduct.update({
    where: { id },
    data,
    include: { category: true, subCategory: true, unit: true },
  });

  await ActivityLogService.createLog({
    userId,
    module: SystemModule.RAW_PRODUCT,
    action: SystemAction.UPDATE,
    details: `Updated raw product: ${updated.name}`,
    accountId,
  });

  return updated;
};

const deleteRawProduct = async (id: string, accountId: string, userId: string) => {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const rawProduct = await tx.rawProduct.findFirst({
      where: { id, accountId, isDeleted: false },
    });
    if (!rawProduct) throw new Error("Raw product not found");

    const usedInRecipe = await tx.preparedProductItem.count({
      where: { rawProductId: id },
    });
    if (usedInRecipe > 0) {
      throw new Error("Cannot delete raw product that is used in a prepared product recipe");
    }

    const result = await tx.rawProduct.update({
      where: { id },
      data: { isDeleted: true },
    });

    await TrashService.addToTrash({
      moduleName: SystemModule.RAW_PRODUCT,
      itemName: rawProduct.name,
      itemId: rawProduct.id,
      deletedBy: userId,
      accountId,
    });

    await ActivityLogService.createLog({
      userId,
      module: SystemModule.RAW_PRODUCT,
      action: SystemAction.DELETE,
      details: `Deleted raw product: ${rawProduct.name}`,
      accountId,
    });

    return result;
  });
};

const stockIn = async (
  rawProductId: string,
  accountId: string,
  userId: string,
  data: RawProductStockInInput,
) => {
  const rawProduct = await prisma.rawProduct.findFirst({
    where: { id: rawProductId, accountId, isDeleted: false },
    include: { unit: true },
  });
  if (!rawProduct) throw new Error("Raw product not found");

  const stock = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const newStock = await tx.rawProductStock.create({
      data: {
        rawProductId,
        accountId,
        quantity: data.quantity,
        totalCost: data.totalCost ?? null,
        supplierId: data.supplierId ?? null,
        purchaseId: data.purchaseId ?? null,
        batch: data.batch ?? null,
        lowStockAlert: data.lowStockAlert ?? null,
      },
      include: { supplier: true },
    });

    await tx.rawProduct.update({
      where: { id: rawProductId },
      data: {
        totalStock: {
          increment: data.quantity,
        },
      },
    });

    return newStock;
  });

  await ActivityLogService.createLog({
    userId,
    module: SystemModule.RAW_PRODUCT,
    action: SystemAction.STOCK_IN,
    details: `Stock in for raw product: ${rawProduct.name} — qty: ${data.quantity} ${rawProduct.unit.symbol}`,
    accountId,
  });

  return stock;
};
const getAllStocks = async (
  accountId: string,
  page = 1,
  limit = 10,
  search?: string,
  rawProductId?: string,
  supplierId?: string,
) => {
  const skip = (page - 1) * limit;

  const where: Prisma.RawProductStockWhereInput = {
    accountId,
    isDeleted: false,
    ...(rawProductId && { rawProductId }),
    ...(supplierId && { supplierId }),
    ...(search && {
      rawProduct: {
        name: { contains: search, mode: "insensitive" },
      },
    }),
  };

  const [data, total] = await Promise.all([
    prisma.rawProductStock.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        rawProduct: {
          select: {
            id: true,
            name: true,
            unit: { select: { id: true, name: true, symbol: true } },
          },
        },
        supplier: { select: { id: true, name: true } },
      },
    }),
    prisma.rawProductStock.count({ where }),
  ]);

  return {
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};
export const RawProductService = {
  createRawProduct,
  getAllRawProducts,
  getSingleRawProduct,
  updateRawProduct,
  deleteRawProduct,
  stockIn,
  getAllStocks,
};
