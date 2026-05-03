const { body, validationResult } = require("express-validator");
const { RESEARCHER_TYPES } = require("../models/Researcher");
const { isStrongPassword, STRONG_PASSWORD_MESSAGE } = require("../utils/passwordPolicy");

const registerParticipantRules = () => [
  body("name").trim().notEmpty().withMessage("Full name is required"),
  body("email").trim().isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("password")
    .custom((value) => isStrongPassword(value))
    .withMessage(STRONG_PASSWORD_MESSAGE),
];

const registerResearcherRules = () => [
  body("name").trim().notEmpty().withMessage("Full name is required"),
  body("email").trim().isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("password")
    .custom((value) => isStrongPassword(value))
    .withMessage(STRONG_PASSWORD_MESSAGE),
  body("fullName").trim().notEmpty().withMessage("Full name is required"),
  body("nic").trim().notEmpty().withMessage("NIC is required"),
  body("gender").trim().notEmpty().withMessage("Gender is required"),
  body("currentWorkplace").trim().notEmpty().withMessage("Current workplace is required"),
  body("highestAcademicQualification")
    .trim()
    .notEmpty()
    .withMessage("Highest academic qualification is required"),
  body("researcherType")
    .trim()
    .isIn(RESEARCHER_TYPES)
    .withMessage(`Researcher type must be one of: ${RESEARCHER_TYPES.join(", ")}`),
  body("otherResearcherTypeExplanation")
    .optional()
    .trim(),
  body("hasPublishedResearch")
    .custom((value) => value === true || value === false || value === "true" || value === "false")
    .withMessage("hasPublishedResearch must be true or false"),
  body("publicationSiteOrLink").optional().trim(),
  body("purpose").trim().notEmpty().withMessage("Purpose / need of research is required"),
];

const loginRules = () => [
  body("email").trim().isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const messages = errors.array().map((e) => e.msg);
  return res.status(400).json({ success: false, message: messages.join("; ") });
};

function validateRegisterConditionals(req, res, next) {
  const rt = (req.body.researcherType || "").trim();
  const hasPublished = parseBool(req.body.hasPublishedResearch);

  if (rt === "Other") {
    const other = (req.body.otherResearcherTypeExplanation || "").trim();
    if (!other) {
      return res.status(400).json({
        success: false,
        message: "Other researcher type explanation is required when researcher type is Other",
      });
    }
  }

  if (rt === "Affiliated to Organization") {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Affiliation proof (image or document upload) is required when researcher type is Affiliated to Organization",
      });
    }
  }

  if (hasPublished === true) {
    const siteOrLink = (req.body.publicationSiteOrLink || "").trim();
    if (!siteOrLink) {
      return res.status(400).json({
        success: false,
        message: "Publication site name or reference link is required when you have previously published research",
      });
    }
  }

  next();
}

function parseBool(val) {
  if (val === true || val === "true") return true;
  if (val === false || val === "false") return false;
  return undefined;
}

module.exports = {
  registerParticipantRules,
  registerResearcherRules,
  loginRules,
  validate,
  validateRegisterConditionals,
  parseBool,
};
