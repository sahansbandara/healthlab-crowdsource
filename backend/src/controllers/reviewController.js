const asyncHandler = require("../utils/asyncHandler");
const Review = require("../models/Review");
const Experiment = require("../models/Experiment");
const reviewService = require("../services/reviewService");
const mongoose = require("mongoose");

// --- Validation helpers ---
function validateObjectId(id, name = "id") {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error(`Invalid ${name}`);
    err.statusCode = 400;
    throw err;
  }
}

function validateCreateUpdateBody(body, isUpdate = false) {
  const errors = [];
  const b = body || {};

  if (!isUpdate) {
    if (b.title === undefined || b.title === null) errors.push("title is required");
    else if (typeof b.title !== "string" || !b.title.trim()) {
      errors.push("title must be a non-empty string");
    }

    const summary = b.summary ?? b.abstract;
    if (summary === undefined || summary === null) {
      errors.push("summary is required");
    } else if (typeof summary !== "string" || !summary.trim()) {
      errors.push("summary must be a non-empty string");
    }

    if (b.content === undefined || b.content === null) errors.push("content is required");
    else if (typeof b.content !== "string" || !b.content.trim()) errors.push("content must be non-empty");

    // experiment is now optional – only validate if provided
    if (b.experiment !== undefined && b.experiment !== null) {
      if (!mongoose.Types.ObjectId.isValid(b.experiment)) {
        errors.push("experiment must be a valid ObjectId");
      }
    }
  } else {
    if (b.title !== undefined) {
      if (typeof b.title !== "string" || !b.title.trim()) {
        errors.push("title must be a non-empty string");
      }
    }
    if (b.summary !== undefined) {
      if (typeof b.summary !== "string" || !b.summary.trim()) {
        errors.push("summary must be a non-empty string");
      }
    }
    if (b.abstract !== undefined) {
      if (typeof b.abstract !== "string" || !b.abstract.trim()) {
        errors.push("abstract must be a non-empty string");
      }
    }
    if (b.content !== undefined) {
      if (typeof b.content !== "string" || !b.content.trim()) errors.push("content must be non-empty");
    }
    if (b.status !== undefined) {
      if (!["draft", "published"].includes(b.status)) errors.push("status must be draft or published");
    }
  }

  if (b.keywords !== undefined && !Array.isArray(b.keywords)) {
    errors.push("keywords must be an array of strings");
  }

  if (errors.length) {
    const err = new Error("Validation failed");
    err.statusCode = 400;
    err.errors = errors;
    throw err;
  }
}

function sendError(res, err) {
  const status = err.statusCode || 500;
  const payload = { success: false, message: err.message || "Internal server error" };
  if (err.errors) payload.errors = err.errors;
  res.status(status).json(payload);
}

// --- Handlers ---

// POST /reviews
const createReview = asyncHandler(async (req, res) => {
  try {
    // Rely primarily on Mongoose schema validation; do only minimal checks here.
    const { title, summary, content, status } = req.body || {};
    const errors = [];
    if (!title || typeof title !== "string" || !title.trim()) {
      errors.push("title must be a non-empty string");
    }
    if (!summary || typeof summary !== "string" || !summary.trim()) {
      errors.push("summary must be a non-empty string");
    }
    if (!content || typeof content !== "string" || !content.trim()) {
      errors.push("content must be a non-empty string");
    }
    if (status && !["draft", "published"].includes(status)) {
      errors.push("status must be draft or published");
    }
    if (errors.length) {
      return res.status(400).json({
        success: false,
        message: errors.join("; "),
        errors,
      });
    }

    const authorId = req.user && (req.user._id || req.user.id);
    const review = await reviewService.createReview(req.body, authorId);
    return res.status(201).json({ success: true, data: review });
  } catch (err) {
    console.error("CreateReview error:", err);
    if (err.statusCode) return sendError(res, err);
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors || {}).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join("; "),
        errors: messages,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});

// GET /reviews
const getReviews = asyncHandler(async (req, res) => {
  try {
    const opts = {
      page: req.query.page,
      limit: req.query.limit,
      q: req.query.q,
      experimentId: req.query.experimentId,
      status: req.query.status,
      sort: req.query.sort,
    };
    const viewerId = req.user ? (req.user._id || req.user.id) : null;
    const viewerRole = req.user ? req.user.role : null;
    const result = await reviewService.listReviews(opts, viewerId, viewerRole);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    if (err.statusCode) return sendError(res, err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET /reviews/:id
const getReviewById = asyncHandler(async (req, res) => {
  try {
    validateObjectId(req.params.id, "review id");
    const viewerId = req.user ? (req.user._id || req.user.id) : null;
    const viewerRole = req.user ? req.user.role : null;
    const review = await reviewService.getReviewById(req.params.id, viewerId, viewerRole);
    return res.status(200).json({ success: true, data: review });
  } catch (err) {
    if (err.statusCode) return sendError(res, err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// PUT /reviews/:id
const updateReview = asyncHandler(async (req, res) => {
  try {
    validateObjectId(req.params.id, "review id");
    validateCreateUpdateBody(req.body, true);
    const userId = req.user && (req.user._id || req.user.id);
    const review = await reviewService.updateReview(
      req.params.id,
      req.body,
      userId,
      req.user.role
    );
    return res.status(200).json({ success: true, data: review });
  } catch (err) {
    if (err.statusCode) return sendError(res, err);
    if (err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: Object.values(err.errors || {}).map((e) => e.message),
      });
    }
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// DELETE /reviews/:id
const deleteReview = asyncHandler(async (req, res) => {
  try {
    validateObjectId(req.params.id, "review id");
    const userId = req.user && (req.user._id || req.user.id);
    await reviewService.deleteReview(req.params.id, userId, req.user.role);
    return res.status(200).json({ success: true, data: { message: "Review deleted" } });
  } catch (err) {
    if (err.statusCode) return sendError(res, err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET /experiments/:experimentId/reviews
const getReviewsByExperiment = asyncHandler(async (req, res) => {
  try {
    validateObjectId(req.params.experimentId, "experiment id");
    const opts = {
      page: req.query.page,
      limit: req.query.limit,
      q: req.query.q,
      status: req.query.status,
      sort: req.query.sort,
    };
    const viewerId = req.user ? (req.user._id || req.user.id) : null;
    const viewerRole = req.user ? req.user.role : null;
    const result = await reviewService.listByExperiment(
      req.params.experimentId,
      opts,
      viewerId,
      viewerRole
    );
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    if (err.statusCode) return sendError(res, err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = {
  createReview,
  getReviews,
  getReviewById,
  updateReview,
  deleteReview,
  getReviewsByExperiment,
};
