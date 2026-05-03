const { body, validationResult } = require("express-validator");

// Fields that the frontend is allowed to send when creating an experiment
const ALLOWED_CREATE_FIELDS = [
  "title",
  "description",
  "status",
  "eligibilityCriteria",
  "participantLimit",
  "conflictTags",
  "logFieldDefinitions",
  "startDate",
  "endDate",
  "applicationDeadline",
];

// System-managed fields that must NEVER be accepted from the frontend
const SYSTEM_FIELDS = [
  "_id",
  "ownerId",
  "currentParticipantCount",
  "publishedAt",
  "closedAt",
  "createdAt",
  "updatedAt",
  "__v",
];

// Validate a single log field definition object
const logFieldDefinitionRules = (fieldPath) => [
  body(`${fieldPath}.label`)
    .exists({ checkFalsy: true })
    .withMessage("Each log field must have a label")
    .bail()
    .isString()
    .withMessage("logFieldDefinitions.label must be a string"),

  body(`${fieldPath}.key`)
    .exists({ checkFalsy: true })
    .withMessage("Each log field must have a key")
    .bail()
    .isString()
    .withMessage("logFieldDefinitions.key must be a string")
    .bail()
    .matches(/^[a-zA-Z][a-zA-Z0-9_]*$/)
    .withMessage(
      "logFieldDefinitions.key must start with a letter and contain only letters, numbers, and underscores (e.g. workoutDuration)"
    ),

  body(`${fieldPath}.type`)
    .exists({ checkFalsy: true })
    .withMessage("Each log field must have a type")
    .bail()
    .isIn(["number", "text", "boolean", "date", "time", "select", "multi-select"])
    .withMessage(
      'logFieldDefinitions.type must be one of: "number", "text", "boolean", "date", "time", "select", "multi-select"'
    ),

  body(`${fieldPath}.required`)
    .optional()
    .isBoolean()
    .withMessage("logFieldDefinitions.required must be a boolean"),

  body(`${fieldPath}.unit`)
    .optional()
    .isString()
    .withMessage("logFieldDefinitions.unit must be a string"),

  body(`${fieldPath}.options`)
    .optional()
    .isArray()
    .withMessage("logFieldDefinitions.options must be an array of strings"),

  body(`${fieldPath}.options.*`)
    .optional()
    .isString()
    .withMessage("Each value in logFieldDefinitions.options must be a string"),
];

// Validation rules for creating an experiment
const createExperimentRules = () => [
  // Disallow system-managed fields explicitly
  ...SYSTEM_FIELDS.map((field) =>
    body(field)
      .not()
      .exists()
      .withMessage(`${field} is system-managed and must not be provided`)
  ),

  body("title")
    .exists({ checkFalsy: true })
    .withMessage("title is required")
    .bail()
    .isString()
    .withMessage("title must be a string")
    .bail()
    .isLength({ max: 200 })
    .withMessage("title must be at most 200 characters"),

  body("description")
    .exists({ checkFalsy: true })
    .withMessage("description is required")
    .bail()
    .isString()
    .withMessage("description must be a string"),

  body("status")
    .optional()
    .isString()
    .withMessage("status must be a string"),

  body("participantLimit")
    .exists()
    .withMessage("participantLimit is required")
    .bail()
    .isInt({ min: 0 })
    .withMessage("participantLimit must be an integer greater than or equal to 0"),

  body("conflictTags")
    .optional()
    .isArray()
    .withMessage("conflictTags must be an array of strings"),

  body("conflictTags.*")
    .optional()
    .isString()
    .withMessage("Each conflict tag must be a string"),

  body("eligibilityCriteria")
    .optional()
    .isObject()
    .withMessage("eligibilityCriteria must be an object"),

  body("startDate")
    .optional()
    .isISO8601()
    .withMessage("startDate must be a valid date"),

  body("endDate")
    .optional()
    .isISO8601()
    .withMessage("endDate must be a valid date"),

  body("applicationDeadline")
    .optional()
    .isISO8601()
    .withMessage("applicationDeadline must be a valid date"),

  body("logFieldDefinitions")
    .exists()
    .withMessage("logFieldDefinitions is required")
    .bail()
    .isArray({ min: 1 })
    .withMessage("logFieldDefinitions must be a non-empty array"),

  // Per-item validation for logFieldDefinitions[*]
  ...logFieldDefinitionRules("logFieldDefinitions.*"),

  // Ensure keys are unique across the array
  body("logFieldDefinitions").custom((value) => {
    if (!Array.isArray(value)) return true; // handled by previous rules
    const keys = value.map((v) => v && v.key).filter(Boolean);
    const unique = new Set(keys);
    if (keys.length !== unique.size) {
      throw new Error("Each log field definition must have a unique key");
    }
    return true;
  }),
];

// Generic validate middleware (same pattern as adminValidators)
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const messages = errors.array().map((e) => e.msg);
  return res.status(400).json({ success: false, message: messages.join("; ") });
};

// Helper to strip disallowed fields from the payload (used by controller/service)
const pickAllowedCreateFields = (payload = {}) => {
  const sanitized = {};
  for (const key of ALLOWED_CREATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      sanitized[key] = payload[key];
    }
  }
  return sanitized;
};

module.exports = {
  createExperimentRules,
  validate,
  pickAllowedCreateFields,
};

