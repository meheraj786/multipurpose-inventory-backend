import {
  type Prisma,
  type Service,
  SystemAction,
  SystemModule,
} from "../../generated/prisma/index.js";
import prisma from "../../shared/utils/prisma.js";
import { ActivityLogService } from "../activityLog/activityLog.service.js";
import { TrashService } from "../trash/trash.service.js";
import type { CreateServiceInput, UpdateServiceInput } from "./service.validation.js";

const createService = async (data: CreateServiceInput, userId: string, accountId: string): Promise<Service> => {
  const service = await prisma.service.create({
    data: { ...data, accountId },
    include: { category: true, subCategory: true },
  });

  await ActivityLogService.createLog({
    userId,
    module: SystemModule.SERVICE,
    action: SystemAction.CREATE,
    details: `Created service: ${service.name}`,
    accountId: accountId,
  });

  return service;
};

const getAllServices = async (
  accountId: string,
  page: number = 1,
  limit: number = 10,
  search?: string,
  categoryId?: string,
  subCategoryId?: string,
) => {
  const skip = (page - 1) * limit;

  const where: Prisma.ServiceWhereInput = {
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
    prisma.service.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { category: true, subCategory: true },
    }),
    prisma.service.count({ where }),
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

const getSingleService = async (id: string, accountId: string) => {
  const service = await prisma.service.findFirst({
    where: { id, accountId, isDeleted: false },
    include: { category: true, subCategory: true },
  });

  if (!service) throw new Error("Service not found");
  return service;
};

const updateService = async (
  id: string,
  accountId: string,
  data: UpdateServiceInput,
  userId: string,
): Promise<Service> => {
  const existing = await prisma.service.findFirst({
    where: { id, accountId, isDeleted: false },
  });

  if (!existing) throw new Error("Service not found");

  const updated = await prisma.service.update({
    where: { id },
    data,
    include: { category: true, subCategory: true },
  });

  await ActivityLogService.createLog({
    userId,
    module: SystemModule.SERVICE,
    action: SystemAction.UPDATE,
    details: `Updated service: ${updated.name}`,
    accountId,
  });

  return updated;
};

const deleteService = async (id: string, accountId: string, userId: string) => {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const service = await tx.service.findFirst({
      where: { id, accountId, isDeleted: false },
    });

    if (!service) throw new Error("Service not found");

    const result = await tx.service.update({
      where: { id },
      data: { isDeleted: true },
    });

    await TrashService.addToTrash({
      moduleName: SystemModule.SERVICE,
      itemName: service.name,
      itemId: service.id,
      deletedBy: userId,
      accountId,
    });

    await ActivityLogService.createLog({
      userId,
      module: SystemModule.SERVICE,
      action: SystemAction.DELETE,
      details: `Deleted service: ${service.name}`,
      accountId,
    });

    return result;
  });
};

export const ServiceService = {
  createService,
  getAllServices,
  getSingleService,
  updateService,
  deleteService,
};
