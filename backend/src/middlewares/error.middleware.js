import { logger } from "../utils/logger.js";
import { HttpError } from "../utils/httpErrors.js";

export function errorHandler(err, req, res, next) {
  logger.error("Error:", err);
  console.error("[errorHandler] Full error details:", {
    message: err.message,
    stack: err.stack,
    code: err.code,
    status: err.statusCode,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        statusCode: err.statusCode,
      },
    });
  }

  if (err.code === "23505") {
    return res.status(409).json({
      error: {
        message: "Duplicate entry",
        statusCode: 409,
      },
    });
  }

  if (err.code === "23503") {
    return res.status(400).json({
      error: {
        message: "Foreign key constraint violation",
        statusCode: 400,
      },
    });
  }

  res.status(500).json({
    error: {
      message: "Internal server error",
      statusCode: 500,
    },
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      message: "Route not found",
      statusCode: 404,
    },
  });
}
