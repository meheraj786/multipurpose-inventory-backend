import { SystemAction, SystemModule } from "../../generated/prisma/index.js";
import prisma from "../../shared/utils/prisma.js";
import { ActivityLogService } from "../activityLog/activityLog.service.js";
import type { CreateRoleInput, UpdateRoleInput } from "./role.validation.js";

const getAllRoles = (accountId: string) =>
  prisma.role.findMany({
    where: { accountId },
    include: {
      permissions: { orderBy: { module: "asc" } },
      _count: { select: { users: { where: { isDeleted: false } } } },
    },
    orderBy: { name: "asc" },
  });

const getSingleRole = async (id: string, accountId: string) => {
  const role = await prisma.role.findFirst({
    where: { id, accountId },
    include: {
      permissions: { orderBy: { module: "asc" } },
      _count: { select: { users: { where: { isDeleted: false } } } },
    },
  });
  if (!role) throw new Error("Role not found");
  return role;
};

const createRole = async (data: CreateRoleInput, accountId: string, adminUserId: string) => {
  const role = await prisma.role.create({
    data: {
      name: data.name,
      description: data.description || null,
      accountId,
      permissions: {
        create: data.permissions.map((permission) => ({
          module: permission.module,
          actions: permission.actions,
        })),
      },
    },
    include: { permissions: true },
  });

  await ActivityLogService.createLog({
    userId: adminUserId,
    module: SystemModule.STAFF,
    action: SystemAction.CREATE,
    details: `Created role: ${role.name}`,
    accountId,
  });
  return role;
};

const updateRole = async (
  id: string,
  accountId: string,
  data: UpdateRoleInput,
  adminUserId: string,
) => {
  const existing = await prisma.role.findFirst({ where: { id, accountId } });
  if (!existing) throw new Error("Role not found");

  const role = await prisma.$transaction(async (tx) => {
    if (data.permissions) {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
    }

    return tx.role.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description || null,
        }),
        ...(data.permissions && {
          permissions: {
            create: data.permissions.map((permission) => ({
              module: permission.module,
              actions: permission.actions,
            })),
          },
        }),
      },
      include: { permissions: true },
    });
  });

  await ActivityLogService.createLog({
    userId: adminUserId,
    module: SystemModule.STAFF,
    action: SystemAction.UPDATE,
    details: `Updated role: ${existing.name}`,
    accountId,
  });
  return role;
};

const deleteRole = async (id: string, accountId: string, adminUserId: string) => {
  const role = await prisma.role.findFirst({
    where: { id, accountId },
    include: { _count: { select: { users: { where: { isDeleted: false } } } } },
  });
  if (!role) throw new Error("Role not found");
  if (role._count.users > 0) {
    throw new Error("Unassign this role from all active staff before deleting it");
  }

  await prisma.role.delete({ where: { id } });
  await ActivityLogService.createLog({
    userId: adminUserId,
    module: SystemModule.STAFF,
    action: SystemAction.DELETE,
    details: `Deleted role: ${role.name}`,
    accountId,
  });
  return { id };
};

export const RoleService = {
  getAllRoles,
  getSingleRole,
  createRole,
  updateRole,
  deleteRole,
};
