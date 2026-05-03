const express = require("express");
const router = express.Router({ mergeParams: true });

const { requireAuth, authorize, optionalAuth } = require("../middleware/authMiddleware");
const {
  addCoResearcher,
  listCoResearchers,
  updateCoResearcher,
  removeCoResearcher,
} = require("../controllers/coResearcherController");

// GET /experiments/:experimentId/co-researchers
router.get("/", optionalAuth, listCoResearchers);

// POST /experiments/:experimentId/co-researchers
router.post("/", requireAuth, authorize(["researcher", "admin"]), addCoResearcher);

// PUT /experiments/:experimentId/co-researchers/:coResearcherId
router.put(
  "/:coResearcherId",
  requireAuth,
  authorize(["researcher", "admin"]),
  updateCoResearcher
);

// DELETE /experiments/:experimentId/co-researchers/:coResearcherId
router.delete(
  "/:coResearcherId",
  requireAuth,
  authorize(["researcher", "admin"]),
  removeCoResearcher
);

module.exports = router;