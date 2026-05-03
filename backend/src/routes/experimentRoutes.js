const router = require("express").Router();

const { protect, authorize, optionalAuth } = require('../middleware/authMiddleware');
const researcherApprovedForPublish = require("../middleware/researcherApproved");

const {
  createExperiment,
  getExperiments,
  getExperimentById,
  updateExperiment,
  deleteExperiment,
  generateExperimentAiSummary,
  getSafetyGuidelines,
} = require("../controllers/experimentController");

const { getReviewsByExperiment } = require("../controllers/reviewController");

const { getWallet } = require('../controllers/walletController');
const {
  createExperimentRules,
  validate,
} = require("../validators/experimentValidators");

router.get("/", getExperiments);
router.get("/:id", getExperimentById);

// List reviews for an experiment
router.get("/:experimentId/reviews", optionalAuth, getReviewsByExperiment);

// GET /api/experiments/:id/safety-guidelines (WGER API Integration)
router.get("/:id/safety-guidelines", optionalAuth, getSafetyGuidelines);

// Protected routes (Researcher / Admin)
router.use(protect);

// POST /api/experiments - Create a new experiment (researcher only)
router.post(
  "/",
  authorize("researcher"),
  researcherApprovedForPublish,
  createExperimentRules ? createExperimentRules() : [],
  validate || ((req, res, next) => next()),
  createExperiment
);

router.get("/:experimentId/wallet", getWallet); // Service handles ownership check
router.post("/:id/ai-summary", authorize(["researcher", "admin"]), generateExperimentAiSummary);
router.put("/:id", authorize(["researcher", "admin"]), researcherApprovedForPublish, updateExperiment);
router.delete("/:id", authorize(["researcher", "admin"]), researcherApprovedForPublish, deleteExperiment);



module.exports = router;

