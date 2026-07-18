import { z } from "zod";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const askAssistantZodSchema = z.object({
  body: z.object({
    message: z.string().min(1, "Message cannot be empty"),
    history: z.array(chatMessageSchema).optional().default([]),
  }),
});

export type AskAssistantInput = z.infer<typeof askAssistantZodSchema>["body"];

export const AssistantValidation = {
  askAssistantZodSchema,
};
