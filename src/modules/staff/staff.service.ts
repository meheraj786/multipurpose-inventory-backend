import bcrypt from "bcrypt";
import {
  type Prisma,
  type User,
  SystemAction,
  SystemModule,
} from "../../generated/prisma/index.js";
import prisma from "../../shared/utils/prisma.js";
import { ActivityLogService } from "../activityLog/activityLog.service.js";
import type {
  CreateStaffInput,
  UpdateStaffInput,
  UpdatePermissionsInput,
} from "./staff.validation.js";

const createStaff = async (
  data: CreateStaffInput,
  accountId: string,
  adminUserId: string,
): Promise<Omit<User, "password">> => {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("Email already in use");

  const account = await prisma.account.findFirst({
    where: { id: accountId, isDeleted: false },
    include: { pricingPlan: true },
  });

  if (!account) throw new Error("Account not found");

  if (account.pricingPlan?.userLimit !== null) {
    const currentStaffCount = await prisma.user.count({
      where: { accountId, role: "STAFF", isDeleted: false },
    });

    if (currentStaffCount >= (account.pricingPlan?.userLimit ?? 0)) {
      throw new Error(
        `Your plan allows a maximum of ${account.pricingPlan?.userLimit} staff members`,
      );
    }
  }

  const hashedPassword = await bcrypt.hash(data.password, 12);

  const staff = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      password: hashedPassword,
      accountId,
      role: "STAFF",
    },
    omit: { password: true },
  });

  await ActivityLogService.createLog({
    userId: adminUserId,
    module: SystemModule.USER,
    action: SystemAction.CREATE,
    details: `Created staff member: ${staff.email}`,
    accountId,
  });

  return staff;
};

const getAllStaff = async (
  accountId: string,
  page: number = 1,
  limit: number = 10,
  search?: string,
) => {
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {
    accountId,
    role: "STAFF",
    isDeleted: false,
    ...(search && {
      OR: [{ email: { contains: search, mode: "insensitive" } }],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      omit: { password: true },
      include: { permissions: true },
    }),
    prisma.user.count({ where }),
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

const getSingleStaff = async (id: string, accountId: string) => {
  const staff = await prisma.user.findFirst({
    where: { id, accountId, role: "STAFF", isDeleted: false },
    omit: { password: true },
    include: { permissions: true },
  });

  if (!staff) throw new Error("Staff member not found");
  return staff;
};

const updateStaff = async (
  id: string,
  accountId: string,
  data: UpdateStaffInput,
  adminUserId: string,
) => {
  const staff = await prisma.user.findFirst({
    where: { id, accountId, role: "STAFF", isDeleted: false },
  });

  if (!staff) throw new Error("Staff member not found");

  const updateData: Prisma.UserUpdateInput = { ...data };

  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 12);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    omit: { password: true },
  });

  await ActivityLogService.createLog({
    userId: adminUserId,
    module: SystemModule.USER,
    action: SystemAction.UPDATE,
    details: `Updated staff member: ${staff.email}`,
    accountId,
  });

  return updated;
};

const deleteStaff = async (id: string, accountId: string, adminUserId: string) => {
  const staff = await prisma.user.findFirst({
    where: { id, accountId, role: "STAFF", isDeleted: false },
  });

  if (!staff) throw new Error("Staff member not found");

  const result = await prisma.user.update({
    where: { id },
    data: { isDeleted: true },
    omit: { password: true },
  });

  await ActivityLogService.createLog({
    userId: adminUserId,
    module: SystemModule.USER,
    action: SystemAction.DELETE,
    details: `Deleted staff member: ${staff.email}`,
    accountId,
  });

  return result;
};
const updatePermissions = async (
  staffId: string,
  accountId: string,
  data: UpdatePermissionsInput,
  adminUserId: string,
) => {
  const staff = await prisma.user.findFirst({
    where: { id: staffId, accountId, role: "STAFF", isDeleted: false },
  });

  if (!staff) throw new Error("Staff member not found");

  const result = await prisma.$transaction(async (tx) => {
    await tx.permission.deleteMany({
      where: { userId: staffId },
    });

    if (data.permissions.length > 0) {
      return await tx.permission.createMany({
        data: data.permissions.map((p) => ({
          userId: staffId,
          accountId: accountId,
          module: p.module,
          actions: p.actions,
        })),
      });
    }
    return { count: 0 };
  });

  await ActivityLogService.createLog({
    userId: adminUserId,
    module: SystemModule.STAFF,
    action: SystemAction.UPDATE,
    details: `Updated permissions for staff: ${staff.email}`,
    accountId,
  });

  return result;
};

export const StaffService = {
  createStaff,
  getAllStaff,
  getSingleStaff,
  updateStaff,
  deleteStaff,
  updatePermissions,
};
