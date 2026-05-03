// Community request validation: post id, comment id, create/update post and comment body
const { body, param, validationResult } = require("express-validator");

// Post id in params
const postIdRules = () => [param("id").isMongoId().withMessage("Invalid post ID")];

// Create post: title, content required; tags optional array of strings
const createPostRules = () => [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("content").trim().notEmpty().withMessage("Content is required"),
  body("tags").optional(),
  body("poll")
    .optional()
    .custom((value) => {
      let poll = value;
      if (typeof poll === "string") {
        try {
          poll = JSON.parse(poll);
        } catch (_) {
          throw new Error("poll must be valid JSON");
        }
      }
      if (!poll || typeof poll !== "object") {
        throw new Error("poll must be an object");
      }
      const question = String(poll.question || "").trim();
      if (!question) {
        throw new Error("poll.question is required");
      }
      if (question.length > 200) {
        throw new Error("poll.question must be 200 characters or fewer");
      }
      const options = Array.isArray(poll.options) ? poll.options : [];
      if (options.length < 2) {
        throw new Error("poll.options must include at least 2 options");
      }
      if (options.length > 6) {
        throw new Error("poll.options must include at most 6 options");
      }
      const normalized = options
        .map((opt) => (typeof opt === "string" ? opt : opt && opt.text))
        .map((opt) => String(opt || "").trim())
        .filter(Boolean);
      if (normalized.length < 2) {
        throw new Error("poll.options must include at least 2 non-empty options");
      }
      return true;
    }),
];

// Update post: id in params; title, content, tags optional
const updatePostRules = () => [
  param("id").isMongoId().withMessage("Invalid post ID"),
  body("title").optional().trim().notEmpty().withMessage("Title cannot be empty"),
  body("content").optional().trim().notEmpty().withMessage("Content cannot be empty"),
  body("tags").optional().isArray().withMessage("tags must be an array"),
  body("tags.*").optional().isString().withMessage("tags must be an array of strings"),
];

const commentIdRules = () => [
  param("id").isMongoId().withMessage("Invalid post ID"),
  param("commentId").isMongoId().withMessage("Invalid comment ID"),
];

// Add comment: post id in params, content in body
const addCommentRules = () => [
  param("id").isMongoId().withMessage("Invalid post ID"),
  body("content").trim().notEmpty().withMessage("Comment content is required"),
];

// Update comment: post id, commentId in params; content in body
const updateCommentRules = () => [
  param("id").isMongoId().withMessage("Invalid post ID"),
  param("commentId").isMongoId().withMessage("Invalid comment ID"),
  body("content").trim().notEmpty().withMessage("Comment content is required"),
];

const pollVoteRules = () => [
  param("id").isMongoId().withMessage("Invalid post ID"),
  body("optionIndex")
    .isInt({ min: 0 })
    .withMessage("optionIndex must be a non-negative integer"),
];

// Run validation; 400 with joined message on error
function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const message = errors.array().map((e) => e.msg).join("; ");
  return res.status(400).json({ success: false, message });
}

module.exports = {
  postIdRules,
  createPostRules,
  updatePostRules,
  commentIdRules,
  addCommentRules,
  updateCommentRules,
  pollVoteRules,
  validate,
};
