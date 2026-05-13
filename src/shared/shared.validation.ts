import { z } from "zod";
import { SystemModule, SystemAction } from "../generated/prisma/index.js";

export const createActivityLogZodSchema = z.object({
  body: z.object({
    userId: z.string({ required_error: "User ID is required" }),
    module: z.nativeEnum(SystemModule),
    action: z.nativeEnum(SystemAction),
    details: z.string().optional(),
    accountId: z.string({ required_error: "Account ID is required" }),
  }),
});

export const createTrashZodSchema = z.object({
  body: z.object({
    moduleName: z.nativeEnum(SystemModule),
    itemName: z.string(),
    itemId: z.string(),
    deletedBy: z.string(),
    accountId: z.string(),
  }),
});

export type ILogPayload = z.infer<typeof createActivityLogZodSchema>["body"];
export type ITrashPayload = z.infer<typeof createTrashZodSchema>["body"];
