const router = require("express").Router();
const { protect, requireAuth, authorize } = require("../middleware/authMiddleware");

const {
  joinExperiment,
  getMyStudies,
  leaveExperiment,
  getParticipantsList,
  getParticipationDetail,
  submitDailyLog,
  deleteDailyLog,
  getPreJoinAnalysis,
} = require("../controllers/participationController");


// GET /participations/preview-analysis/:experimentId - Get clinical insight before joining
router.get("/preview-analysis/:experimentId", protect, requireAuth, getPreJoinAnalysis);

// POST /participations/join - Join an experiment (authenticated users)
router.post("/join", protect, requireAuth, joinExperiment);

// GET /participations/my-studies - Get user's studies (authenticated users)
router.get("/my-studies", protect, requireAuth, getMyStudies);

// PUT /participations/:id/leave - Leave a study (authenticated users)
router.put("/:id/leave", protect, requireAuth, leaveExperiment);

router.get(
  "/experiment/:experimentId/participants",
  protect,
  requireAuth,
  authorize(["researcher", "admin"]),
  getParticipantsList
);

// GET /participations/:id - Get specific study dashboard data
router.get("/:id", protect, requireAuth, getParticipationDetail);

// POST /participations/:id/logs - Submit daily log
router.post("/:id/logs", protect, requireAuth, submitDailyLog);

// DELETE /participations/:id/logs/today - Delete today's log
router.delete("/:id/logs/today", protect, requireAuth, deleteDailyLog);

module.exports = router;

