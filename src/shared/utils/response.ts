import type { Response } from "express";

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = "Success",
  statusCode = 200,
  meta?: ApiResponse<T>["meta"],
) => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

export const sendCreated = <T>(res: Response, data: T, message = "Created successfully") => {
  return sendSuccess(res, data, message, 201);
};

export const sendNoContent = (res: Response) => {
  return res.status(204).send();
};
