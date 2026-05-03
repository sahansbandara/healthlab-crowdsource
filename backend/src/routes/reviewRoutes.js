const router = require("express").Router();
const { protect, requireAuth, authorize, optionalAuth } = require("../middleware/authMiddleware");
const {
  createReview,
  getReviews,
  getReviewById,
  updateReview,
  deleteReview,
} = require("../controllers/reviewController");

// List reviews (anyone can read; optional auth for draft visibility)
router.get("/", optionalAuth, getReviews);

// Get one review (anyone can read published; author/admin for drafts)
router.get("/:id", optionalAuth, getReviewById);

// Create: authenticated researcher or admin only
router.post("/", protect, requireAuth, authorize(["researcher", "admin"]), createReview);

// Update / Delete: require auth; author or admin check is done in service
router.put("/:id", protect, requireAuth, authorize(["researcher", "admin"]), updateReview);
router.delete("/:id", protect, requireAuth, authorize(["researcher", "admin"]), deleteReview);

module.exports = router;
