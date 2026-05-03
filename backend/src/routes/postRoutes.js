const router = require("express").Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getPosts,
  getSavedPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  likeToggle,
  sharePost,
  savePost,
  unsavePost,
} = require("../controllers/postController");

// List posts (auth optional for read; Community page requires login so we protect all)
router.get("/", protect, getPosts);
router.get("/saved", protect, getSavedPosts);
router.get("/:id", protect, getPostById);

router.post("/", protect, createPost);
router.put("/:id", protect, updatePost);
router.delete("/:id", protect, deletePost);

router.put("/:id/like", protect, likeToggle);
router.post("/:id/share", protect, sharePost);
router.post("/:id/save", protect, savePost);
router.delete("/:id/save", protect, unsavePost);

module.exports = router;
