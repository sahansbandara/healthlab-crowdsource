// Chat request validation: message required, optional history array
const { body, validationResult } = require("express-validator");

// message required (max 4000 chars); history optional array of { role, content }
const chatRules = () => [
  body("message").trim().notEmpty().withMessage("Message is required").isLength({ max: 4000 }).withMessage("Message must be at most 4000 characters"),
  body("history").optional().isArray().withMessage("History must be an array"),
  body("history.*.role").optional().isIn(["user", "model"]).withMessage("Each history item must have role 'user' or 'model'"),
  body("history.*.content").optional().trim().notEmpty().withMessage("History content cannot be empty"),
];

// Run validation; 400 with joined message on error
function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const message = errors.array().map((e) => e.msg).join("; ");
  return res.status(400).json({ success: false, message });
}

module.exports = { chatRules, validate };
