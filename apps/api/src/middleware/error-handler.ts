import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export class AppError extends Error implements ApiError {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(message: string, statusCode: number = 500, code: string = "INTERNAL_ERROR", details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = "AppError";
  }
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = req.headers["x-request-id"] as string;

  // Log error (but not in production for security)
  if (process.env.NODE_ENV !== "production") {
    console.error("Error:", {
      message: err.message,
      code: err.code,
      stack: err.stack,
      requestId,
    });
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: err.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
        requestId,
      },
    });
  }

  // Handle known application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
      },
    });
  }

  // Handle Prisma errors
  if (err.name === "PrismaClientKnownRequestError") {
    const prismaErr = err as any;
    if (prismaErr.code === "P2025") {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Resource not found",
          requestId,
        },
      });
    }
    if (prismaErr.code === "P2002") {
      return res.status(409).json({
        error: {
          code: "CONFLICT",
          message: "Resource already exists",
          requestId,
        },
      });
    }
  }

  // Default error response
  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: process.env.NODE_ENV === "production" 
        ? "An unexpected error occurred" 
        : err.message,
      requestId,
    },
  });
}
