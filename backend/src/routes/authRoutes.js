const router = require("express").Router();
const authController = require("../controllers/authController");
// Merging controller function names if they differ
const {
  registerResearcher,
  registerUser,
  login,
  loginUser
} = require("../controllers/authController");

const {
  registerParticipantRules,
  registerResearcherRules,
  loginRules,
  validate,
  validateRegisterConditionals,
} = require("../validators/authValidators");

const { uploadAffiliationProof } = require("../middleware/upload");
const { protect } = require("../middleware/authMiddleware");

/**
 * Participant registration (simple)
 */
router.post(
  "/register-participant",
  registerParticipantRules ? registerParticipantRules() : [],
  validate || ((req, res, next) => next()),
  authController.registerParticipant
);

/**
 * Researcher registration (with upload + validation)
 */
router.post(
  "/register",
  uploadAffiliationProof,
  registerResearcherRules ? registerResearcherRules() : [],
  validate || ((req, res, next) => next()),
  validateRegisterConditionals || ((req, res, next) => next()),
  registerResearcher || registerUser
);

/**
 * Login (validated)
 */
router.post("/login", loginRules ? loginRules() : [], validate || ((req, res, next) => next()), login || loginUser);

/**
 * Profile management
 */
router.get("/profile", protect, (req, res) => {
  res.json({ success: true, user: req.user });
});
router.put("/profile", protect, authController.updateProfile);

/**
 * Flag a researcher
 */
router.post("/researchers/:id/flag", protect, authController.flagResearcher);

module.exports = router;
