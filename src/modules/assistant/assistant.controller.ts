import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { sendResponse } from "../../shared/utils/response.js";
import { AssistantService } from "./assistant.service.js";

const askAssistant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.user?.accountId as string;
    const userId = req.user?.userId as string;

    const responseText = await AssistantService.askAssistant(accountId, userId, req.body);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Assistant response generated successfully",
      data: {
        response: responseText,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const AssistantController = {
  askAssistant,
};
