// Admin request validation: researcher id, user id, experiment id, optional body fields
const { body, param, validationResult } = require("express-validator");

// Approve/reject researcher: id in params, optional reviewNotes in body
const reviewResearcherRules = () => [
  param("id").isMongoId().withMessage("Invalid researcher ID"),
  body("reviewNotes").optional().trim(),
];

// Delete experiment: id in params, optional booleans rejectResearcher, reassignToParticipant
const deleteExperimentRules = () => [
  param("id").isMongoId().withMessage("Invalid experiment ID"),
  body("rejectResearcher").optional().isBoolean().withMessage("rejectResearcher must be boolean"),
  body("reassignToParticipant").optional().isBoolean().withMessage("reassignToParticipant must be boolean"),
];

// User approve/reject: id in params
const userActionRules = () => [param("id").isMongoId().withMessage("Invalid user ID")];

// Researcher by id in params
const researcherIdRules = () => [param("id").isMongoId().withMessage("Invalid researcher ID")];

// Run validation; on error respond 400 with joined message
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const message = errors.array().map((e) => e.msg).join("; ");
  return res.status(400).json({ success: false, message });
};

module.exports = {
  reviewResearcherRules,
  deleteExperimentRules,
  userActionRules,
  researcherIdRules,
  validate,
};
