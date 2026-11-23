import { z } from "zod";
import { SystemAction } from "../../generated/prisma/index.js";

export const ROLE_MANAGEABLE_MODULES = [
  "CATEGORY",
  "SUBCATEGORY",
  "SUPPLIER",
  "PRODUCT",
  "RAW_PRODUCT",
  "PREPARED_PRODUCT",
  "PURCHASE",
  "SERVICE",
  "CUSTOMER",
  "SALE",
  "WASTAGE",
  "INVOICE",
  "TRASH",
  "ACTIVITY_LOG",
] as const;

const permissionSchema = z
  .object({
    module: z.enum(ROLE_MANAGEABLE_MODULES),
    actions: z.array(z.nativeEnum(SystemAction)).min(1).max(9),
  })
  .superRefine(({ module, actions }, ctx) => {
    const allowedActions = new Set([
      ...(module === "ACTIVITY_LOG"
        ? ["READ"]
        : module === "TRASH"
          ? ["READ", "DELETE", "RESTORE"]
          : ["CREATE", "READ", "UPDATE", "DELETE"]),
      ...(["PURCHASE", "TRASH"].includes(module) ? ["RESTORE"] : []),
      ...(["PRODUCT", "RAW_PRODUCT", "PREPARED_PRODUCT"].includes(module) ? ["STOCK_IN"] : []),
      ...(["PRODUCT", "RAW_PRODUCT", "PREPARED_PRODUCT", "WASTAGE"].includes(module)
        ? ["STOCK_OUT"]
        : []),
    ]);
    actions.forEach((action, index) => {
      if (!allowedActions.has(action)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["actions", index],
          message: `${action} is not valid for ${module}`,
        });
      }
    });
    if (new Set(actions).size !== actions.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["actions"],
        message: "Duplicate actions are not allowed",
      });
    }
  });

const permissionsSchema = z
  .array(permissionSchema)
  .refine(
    (permissions) =>
      new Set(permissions.map((permission) => permission.module)).size === permissions.length,
    "Each module can only be listed once",
  );

const createRoleZodSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().max(250).nullable().optional(),
    permissions: permissionsSchema.default([]),
  }),
});

const updateRoleZodSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80).optional(),
    description: z.string().trim().max(250).nullable().optional(),
    permissions: permissionsSchema.optional(),
  }),
});

export type CreateRoleInput = z.infer<typeof createRoleZodSchema>["body"];
export type UpdateRoleInput = z.infer<typeof updateRoleZodSchema>["body"];

export const RoleValidation = {
  createRoleZodSchema,
  updateRoleZodSchema,
};
