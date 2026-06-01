import {
  type Prisma,
  SystemAction,
  SystemModule,
} from "../../generated/prisma/index.js";
import prisma from "../../shared/utils/prisma.js";
import { ActivityLogService } from "../activityLog/activityLog.service.js";
import { TrashService } from "../trash/trash.service.js";
import type {
  CreateSupplierInput,
  UpdateSupplierInput,
} from "./supplier.validation.js";

const createSupplier = async (
  data: CreateSupplierInput,
  accountId: string,
  userId: string,
) => {
  const existing = await prisma.supplier.findFirst({
    where: { contact: data.contact, accountId, isDeleted: false },
  });
  if (existing) {
    throw new Error("A supplier with this contact already exists");
  }

  const supplier = await prisma.supplier.create({
    data: { ...data, accountId },
    include: { category: true },
  });

  await ActivityLogService.createLog({
    userId,
    module: SystemModule.SUPPLIER,
    action: SystemAction.CREATE,
    details: `Created supplier: ${supplier.name}`,
    accountId,
  });

  return supplier;
};

const getAllSuppliers = async (
  accountId: string,
  page = 1,
  limit = 10,
  search?: string,
  categoryId?: string,
  isActive?: boolean,
) => {
  const skip = (page - 1) * limit;

  const where: Prisma.SupplierWhereInput = {
    accountId,
    isDeleted: false,
    ...(categoryId && { categoryId }),
    ...(isActive !== undefined && { isActive }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { contact: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { companyName: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        _count: {
          select: { purchases: true, productStocks: true },
        },
      },
    }),
    prisma.supplier.count({ where }),
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

const getSingleSupplier = async (id: string, accountId: string) => {
  const supplier = await prisma.supplier.findFirst({
    where: { id, accountId, isDeleted: false },
    include: {
      category: true,
      purchases: {
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { productStocks: { include: { product: true } } },
      },
      productStocks: {
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { product: { include: { unit: true } }, unit: true },
      },
      _count: {
        select: { purchases: true, productStocks: true },
      },
    },
  });

  if (!supplier) throw new Error("Supplier not found");

  const totalPurchaseValue = supplier.purchases.reduce(
    (sum, p) => sum + Number(p.totalCost),
    0,
  );

  return { ...supplier, totalPurchaseValue };
};

const updateSupplier = async (
  id: string,
  accountId: string,
  data: UpdateSupplierInput,
  userId: string,
) => {
  const existing = await prisma.supplier.findFirst({
    where: { id, accountId, isDeleted: false },
  });
  if (!existing) throw new Error("Supplier not found");

  if (data.contact && data.contact !== existing.contact) {
    const contactConflict = await prisma.supplier.findFirst({
      where: {
        contact: data.contact,
        accountId,
        isDeleted: false,
        NOT: { id },
      },
    });
    if (contactConflict) {
      throw new Error("A supplier with this contact already exists");
    }
  }

  const updated = await prisma.supplier.update({
    where: { id },
    data,
    include: { category: true },
  });

  await ActivityLogService.createLog({
    userId,
    module: SystemModule.SUPPLIER,
    action: SystemAction.UPDATE,
    details: `Updated supplier: ${updated.name}`,
    accountId,
  });

  return updated;
};

const deleteSupplier = async (
  id: string,
  accountId: string,
  userId: string,
) => {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const supplier = await tx.supplier.findFirst({
      where: { id, accountId, isDeleted: false },
    });
    if (!supplier) throw new Error("Supplier not found");

    const activeStocks = await tx.productStock.count({
      where: { supplierId: id, isDeleted: false, quantity: { gt: 0 } },
    });
    if (activeStocks > 0) {
      throw new Error(
        "Cannot delete supplier with active stock entries. Remove or reassign stock first.",
      );
    }

    const result = await tx.supplier.update({
      where: { id },
      data: { isDeleted: true },
    });

    await TrashService.addToTrash({
      moduleName: SystemModule.SUPPLIER,
      itemName: supplier.name,
      itemId: supplier.id,
      deletedBy: userId,
      accountId,
    });

    await ActivityLogService.createLog({
      userId,
      module: SystemModule.SUPPLIER,
      action: SystemAction.DELETE,
      details: `Deleted supplier: ${supplier.name}`,
      accountId,
    });

    return result;
  });
};

const toggleActive = async (
  id: string,
  accountId: string,
  userId: string,
) => {
  const supplier = await prisma.supplier.findFirst({
    where: { id, accountId, isDeleted: false },
  });
  if (!supplier) throw new Error("Supplier not found");

  const updated = await prisma.supplier.update({
    where: { id },
    data: { isActive: !supplier.isActive },
    include: { category: true },
  });

  await ActivityLogService.createLog({
    userId,
    module: SystemModule.SUPPLIER,
    action: SystemAction.UPDATE,
    details: `${updated.isActive ? "Activated" : "Deactivated"} supplier: ${supplier.name}`,
    accountId,
  });

  return updated;
};

export const SupplierService = {
  createSupplier,
  getAllSuppliers,
  getSingleSupplier,
  updateSupplier,
  deleteSupplier,
  toggleActive,
};