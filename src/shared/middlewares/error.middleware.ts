import type { ErrorRequestHandler } from "express";
import { env } from "@/config/env.js";
import { AppError, ValidationError } from "../errors/AppError.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let statusCode = 500;
  let message = "Internal server error";
  let code = "INTERNAL_ERROR";
  let errors: Record<string, string[]> | undefined;

  if (err instanceof ValidationError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code || "VALIDATION_ERROR";
    errors = err.errors;
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code || "APP_ERROR";
  } else if (err instanceof Error) {
    message = err.message;
  }

  if (env.NODE_ENV === "development") {
    console.error("Error:", err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(errors && { errors }),
    ...(env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
