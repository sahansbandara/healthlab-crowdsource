/**
 * Application constants and configuration.
 * Centralizes magic strings and config for consistency and maintainability.
 */

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const RESEARCHER_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

const USER_ROLE = {
  RESEARCHER: "researcher",
  ADMIN: "admin",
  PARTICIPANT: "participant",
  MEDICAL_REVIEWER: "medical_reviewer",
};

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SERVER_ERROR: 500,
};

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  RESEARCHER_STATUS,
  USER_ROLE,
  HTTP_STATUS,
};
