import { z } from "zod";
import { SystemAction, SystemModule } from "../../generated/prisma/index.js";

const createStaffZodSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(2).max(100),
  }),
});

const updateStaffZodSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    isDeleted: z.boolean().optional(),
  }),
});

const updatePermissionsZodSchema = z.object({
  body: z.object({
    permissions: z.array(
      z.object({
        module: z.nativeEnum(SystemModule),
        actions: z.array(z.nativeEnum(SystemAction)),
      }),
    ),
  }),
});

export type CreateStaffInput = z.infer<typeof createStaffZodSchema>["body"];
export type UpdateStaffInput = z.infer<typeof updateStaffZodSchema>["body"];
export type UpdatePermissionsInput = z.infer<typeof updatePermissionsZodSchema>["body"];

export const StaffValidation = {
  createStaffZodSchema,
  updateStaffZodSchema,
  updatePermissionsZodSchema,
};
