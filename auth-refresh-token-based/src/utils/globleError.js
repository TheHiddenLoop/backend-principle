class AppError extends Error {
  constructor(
    statusCode = 500,
    message = "Internal Server Error"
  ) {
    super(message);

    this.statusCode = statusCode;
    this.message = message;
    this.success = false;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  sendResponse(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      message: this.message
    });
  }

  static badRequest(message = "Bad Request") {
    return new AppError(400, message);
  }

  static unauthorized(message = "Unauthorized") {
    return new AppError(401, message);
  }

  static forbidden(message = "Forbidden") {
    return new AppError(403, message);
  }

  static notFound(message = "Resource not found") {
    return new AppError(404, message);
  }

  static conflict(message = "Conflict") {
    return new AppError(409, message);
  }

  static internalServerError(message = "Internal Server Error") {
    return new AppError(500, message);
  }
}

export default AppError;