const { HTTP_STATUS } = require("../config/constants");

const errorHandler = (err, req, res, next) => {
  let status = err.status || err.statusCode || HTTP_STATUS.SERVER_ERROR;
  let message = err.message || "Internal Server Error";

  if (err.name === "ValidationError") {
    status = HTTP_STATUS.BAD_REQUEST;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join("; ");
  }
  if (err.code === 11000) {
    status = HTTP_STATUS.CONFLICT;
    message = "Duplicate field value (e.g. email already registered)";
  }
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    status = HTTP_STATUS.UNAUTHORIZED;
    message = "Invalid or expired token";
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    status = HTTP_STATUS.BAD_REQUEST;
    message = "File too large. Maximum size is 5MB.";
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE" || (err.message && err.message.includes("Invalid file type"))) {
    status = HTTP_STATUS.BAD_REQUEST;
    message = err.message || "Invalid file. Allowed: images (JPEG, PNG, GIF, WebP) or PDF.";
  }

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
