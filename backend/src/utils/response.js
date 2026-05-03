/**
 * Consistent API response helpers.
 * Ensures all endpoints return a uniform shape: { success, message?, data? }.
 */

const { HTTP_STATUS } = require("../config/constants");

/**
 * Send a success response with optional data and message.
 * @param {object} res - Express response object
 * @param {number} status - HTTP status code (default 200)
 * @param {object|array} data - Payload to send
 * @param {string} [message] - Optional message
 */
const success = (res, status = HTTP_STATUS.OK, data = null, message = null) => {
  const body = { success: true };
  if (message) body.message = message;
  if (data !== null && data !== undefined) body.data = data;
  return res.status(status).json(body);
};

/**
 * Send an error response.
 * @param {object} res - Express response object
 * @param {number} status - HTTP status code (default 500)
 * @param {string} message - Error message
 */
const error = (res, status = HTTP_STATUS.SERVER_ERROR, message = "Internal Server Error") => {
  return res.status(status).json({ success: false, message });
};

module.exports = {
  success,
  error,
};
