// Community routes: posts (list, get, create, update, delete), likes, share, save, comments, and chat
const router = require("express").Router();
const { protect } = require("../../middleware/authMiddleware");
const { uploadPostImage } = require("../../middleware/upload");
const {
  postIdRules,
  createPostRules,
  updatePostRules,
  commentIdRules,
  addCommentRules,
  updateCommentRules,
  pollVoteRules,
  validate,
} = require("./communityValidators");
const { reportRules } = require("./validators/reportValidators");
const {
  getPosts,
  getSearchSuggestions,
  getSavedPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  likeToggle,
  votePoll,
  sharePost,
  savePost,
  unsavePost,
  addComment,
  updateComment,
  deleteComment,
} = require("./communityController");
const {
  submitReport,
  getAllReports,
  getPostReportDetails,
  banUserForReport,
  deleteReportedPost,
} = require("./controllers/reportController");
const { chat } = require("./chatbot/chatbotController");
const { chatRules, validate: validateChat } = require("./chatbot/chatbotValidators");

// List posts, saved posts, and chat (all protected)
router.get("/", protect, getPosts);
router.get("/suggestions", protect, getSearchSuggestions);
router.get("/saved", protect, getSavedPosts);
router.post("/chat", protect, chatRules(), validateChat, chat);

// Single post by id
router.get("/:id", protect, postIdRules(), validate, getPostById);

// Create, update, delete post
router.post("/", protect, uploadPostImage, createPostRules(), validate, createPost);
router.put("/:id", protect, updatePostRules(), validate, updatePost);
router.delete("/:id", protect, postIdRules(), validate, deletePost);

// Like, share, save/unsave
router.put("/:id/like", protect, postIdRules(), validate, likeToggle);
router.put("/:id/poll/vote", protect, pollVoteRules(), validate, votePoll);
router.post("/:id/share", protect, postIdRules(), validate, sharePost);
router.post("/:id/save", protect, postIdRules(), validate, savePost);
router.delete("/:id/save", protect, postIdRules(), validate, unsavePost);

// Comments: add, update, delete
router.post("/:id/comments", protect, addCommentRules(), validate, addComment);
router.put("/:id/comments/:commentId", protect, updateCommentRules(), validate, updateComment);
router.delete("/:id/comments/:commentId", protect, commentIdRules(), validate, deleteComment);

// Report: report a post
router.post("/:id/report", protect, postIdRules(), reportRules(), validate, submitReport);

module.exports = router;
