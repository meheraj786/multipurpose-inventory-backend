import {
  type Prisma,
  type Product,
  SystemAction,
  SystemModule,
} from "../../generated/prisma/index.js";
import prisma from "../../shared/utils/prisma.js";
import { ActivityLogService } from "../activityLog/activityLog.service.js";
import { TrashService } from "../trash/trash.service.js";
import type { CreateProductInput, UpdateProductInput } from "./product.validation.js";

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

  const product = await prisma.product.create({
    data: { ...data, accountId },
    include: { category: true, subCategory: true },
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
    totalStock: product.productStocks.reduce((sum, s) => sum + s.quantity, 0),
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
      productStocks: {
        where: { isDeleted: false },
        include: { supplier: true, purchase: true },
        orderBy: { createdAt: "desc" },
      },
      saleItems: {
        include: {
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

  const totalStock = product.productStocks.reduce(
    (sum, s) => sum + s.quantity,
    0,
  );

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

  const updated = await prisma.product.update({
    where: { id },
    data,
    include: { category: true, subCategory: true },
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

const deleteProduct = async (
  id: string,
  accountId: string,
  userId: string,
) => {
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
  data: {
    quantity: number;
    purchasePrice: number;
    rate: number;
    supplierId?: string;
    purchaseId?: string;
    batch?: string;
  },
) => {
  const product = await prisma.product.findFirst({
    where: { id: productId, accountId, isDeleted: false },
  });
  if (!product) throw new Error("Product not found");

  const stock = await prisma.productStock.create({
    data: {
      productId,
      accountId,
      quantity: data.quantity,
      purchasePrice: data.purchasePrice,
      rate: data.rate,
      totalCost: data.purchasePrice * data.quantity,
      supplierId: data.supplierId ?? null,
      purchaseId: data.purchaseId ?? null,
      batch: data.batch ?? null,
    },
    include: { supplier: true },
  });

  await ActivityLogService.createLog({
    userId,
    module: SystemModule.PRODUCT,
    action: SystemAction.STOCK_IN,
    details: `Stock in for product: ${product.name} — qty: ${data.quantity}`,
    accountId,
  });

  return stock;
};

const getStockSummary = async (productId: string, accountId: string) => {
  const stocks = await prisma.productStock.findMany({
    where: { productId, accountId, isDeleted: false },
    select: { quantity: true, purchasePrice: true, totalCost: true },
  });

  const totalStock = stocks.reduce((sum, s) => sum + s.quantity, 0);
  const totalCost = stocks.reduce((sum, s) => sum + Number(s.totalCost), 0);
  const avgPurchasePrice =
    stocks.length > 0
      ? stocks.reduce((sum, s) => sum + Number(s.purchasePrice), 0) /
        stocks.length
      : 0;

  return { totalStock, totalCost, avgPurchasePrice };
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