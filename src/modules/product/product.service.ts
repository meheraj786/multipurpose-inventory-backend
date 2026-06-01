import {
  type Prisma,
  type Product,
  SystemAction,
  SystemModule,
} from "../../generated/prisma/index.js";
import prisma from "../../shared/utils/prisma.js";
import { ActivityLogService } from "../activityLog/activityLog.service.js";
import { TrashService } from "../trash/trash.service.js";
import type { CreateProductInput, UpdateProductInput, StockInInput } from "./product.validation.js";

const createProduct = async (
  data: CreateProductInput,
  accountId: string,
  userId: string,
): Promise<Product> => {
  if (data.sku) {
    const existing = await prisma.product.findFirst({
      where: { sku: data.sku, accountId, isDeleted: false },
    });
    if (existing) throw new Error("A product with this SKU already exists");
  }

  // If unitId was not provided, try to pick a default unit for the account
  let unitIdToUse = data.unitId;
  if (!unitIdToUse) {
    const defaultUnit = await prisma.unit.findFirst();
    if (!defaultUnit) throw new Error("Unit is required. Create a unit first or provide unitId");
    unitIdToUse = defaultUnit.id;
  }

  const unit = await prisma.unit.findUnique({ where: { id: unitIdToUse } });
  if (!unit) throw new Error("Unit not found");
  const product = await prisma.product.create({
    data: { ...data, unitId: unitIdToUse, accountId },
    include: { category: true, subCategory: true, unit: true },
  });

  await ActivityLogService.createLog({
    userId,
    module: SystemModule.PRODUCT,
    action: SystemAction.CREATE,
    details: `Created product: ${product.name}`,
    accountId,
  });

  return product;
};

const getAllProducts = async (
  accountId: string,
  page = 1,
  limit = 10,
  search?: string,
  categoryId?: string,
  subCategoryId?: string,
) => {
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {
    accountId,
    isDeleted: false,
    ...(categoryId && { categoryId }),
    ...(subCategoryId && { subCategoryId }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        subCategory: true,
        unit: true,
        productStocks: {
          where: { isDeleted: false },
          select: { quantity: true },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const dataWithStock = data.map((product) => ({
    ...product,
    totalStock: product.productStocks.reduce((sum, s) => sum + Number(s.quantity), 0),
  }));

  return {
    data: dataWithStock,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getSingleProduct = async (id: string, accountId: string) => {
  const product = await prisma.product.findFirst({
    where: { id, accountId, isDeleted: false },
    include: {
      category: true,
      subCategory: true,
      unit: true,
      productUnitConversions: {
        include: { unit: true },
      },
      productStocks: {
        where: { isDeleted: false },
        include: { supplier: true, purchase: true, unit: true },
        orderBy: { createdAt: "desc" },
      },
      saleItems: {
        include: {
          unit: true,
          sale: {
            include: {
              customer: { select: { id: true, name: true, phone: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!product) throw new Error("Product not found");

  const totalStock = product.productStocks.reduce((sum, s) => sum + Number(s.quantity), 0);

  return { ...product, totalStock };
};

const updateProduct = async (
  id: string,
  accountId: string,
  data: UpdateProductInput,
  userId: string,
): Promise<Product> => {
  const existing = await prisma.product.findFirst({
    where: { id, accountId, isDeleted: false },
  });
  if (!existing) throw new Error("Product not found");

  if (data.sku && data.sku !== existing.sku) {
    const skuConflict = await prisma.product.findFirst({
      where: { sku: data.sku, accountId, isDeleted: false, NOT: { id } },
    });
    if (skuConflict) throw new Error("A product with this SKU already exists");
  }

  if (data.unitId) {
    const unit = await prisma.unit.findUnique({ where: { id: data.unitId } });
    if (!unit) throw new Error("Unit not found");
  }

  const updated = await prisma.product.update({
    where: { id },
    data,
    include: { category: true, subCategory: true, unit: true },
  });

  await ActivityLogService.createLog({
    userId,
    module: SystemModule.PRODUCT,
    action: SystemAction.UPDATE,
    details: `Updated product: ${updated.name}`,
    accountId,
  });

  return updated;
};

const deleteProduct = async (id: string, accountId: string, userId: string) => {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const product = await tx.product.findFirst({
      where: { id, accountId, isDeleted: false },
    });
    if (!product) throw new Error("Product not found");

    const result = await tx.product.update({
      where: { id },
      data: { isDeleted: true },
    });

    await TrashService.addToTrash({
      moduleName: SystemModule.PRODUCT,
      itemName: product.name,
      itemId: product.id,
      deletedBy: userId,
      accountId,
    });

    await ActivityLogService.createLog({
      userId,
      module: SystemModule.PRODUCT,
      action: SystemAction.DELETE,
      details: `Deleted product: ${product.name}`,
      accountId,
    });

    return result;
  });
};

const stockIn = async (
  productId: string,
  accountId: string,
  userId: string,
  data: StockInInput,
) => {
  const product = await prisma.product.findFirst({
    where: { id: productId, accountId, isDeleted: false },
    include: { unit: true },
  });
  if (!product) throw new Error("Product not found");

  const stockUnitId = data.unitId ?? product.unitId;

  const stockUnit = await prisma.unit.findUnique({
    where: { id: stockUnitId },
  });
  if (!stockUnit) throw new Error("Unit not found");

  if (stockUnit.group !== product.unit.group) {
    throw new Error(
      `Unit mismatch: cannot stock ${product.name} in ${stockUnit.symbol}. Expected a ${product.unit.group} unit.`,
    );
  }

  const stock = await prisma.productStock.create({
    data: {
      productId,
      accountId,
      unitId: stockUnitId,
      quantity: data.quantity,
      purchasePrice: data.purchasePrice,
      rate: data.rate,
      totalCost: data.purchasePrice * data.quantity,
      supplierId: data.supplierId ?? null,
      purchaseId: data.purchaseId ?? null,
      batch: data.batch ?? null,
    },
    include: { supplier: true, unit: true },
  });

  await ActivityLogService.createLog({
    userId,
    module: SystemModule.PRODUCT,
    action: SystemAction.STOCK_IN,
    details: `Stock in for product: ${product.name} — qty: ${data.quantity} ${stockUnit.symbol}`,
    accountId,
  });

  return stock;
};

const getStockSummary = async (productId: string, accountId: string) => {
  const product = await prisma.product.findFirst({
    where: { id: productId, accountId, isDeleted: false },
    include: { unit: true },
  });
  if (!product) throw new Error("Product not found");

  const stocks = await prisma.productStock.findMany({
    where: { productId, accountId, isDeleted: false },
    select: { quantity: true, purchasePrice: true, totalCost: true },
  });

  const totalStock = stocks.reduce((sum, s) => sum + Number(s.quantity), 0);
  const totalCost = stocks.reduce((sum, s) => sum + Number(s.totalCost), 0);
  const avgPurchasePrice =
    stocks.length > 0
      ? stocks.reduce((sum, s) => sum + Number(s.purchasePrice), 0) / stocks.length
      : 0;

  return {
    totalStock,
    totalCost,
    avgPurchasePrice,
    unit: product.unit,
  };
};

export const ProductService = {
  createProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  stockIn,
  getStockSummary,
};
