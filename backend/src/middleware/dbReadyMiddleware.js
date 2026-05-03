const mongoose = require("mongoose");

/**
 * Middleware to ensure the MongoDB connection (af_project_db) is established before proceeding.
 * Returns 503 Service Unavailable if the database is not ready.
 */
const dbReadyMiddleware = (req, res, next) => {
  // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: {
        code: "DB_NOT_READY",
        message: "Database connection is not established. Please try again shortly.",
        state: mongoose.connection.readyState,
      },
    });
  }
  next();
};

module.exports = dbReadyMiddleware;
