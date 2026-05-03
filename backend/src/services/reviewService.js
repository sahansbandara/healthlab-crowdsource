const Review = require("../models/Review");
const Experiment = require("../models/Experiment");
const mongoose = require("mongoose");

const STATUS = { DRAFT: "draft", PUBLISHED: "published" };
const ROLES = { ADMIN: "admin", RESEARCHER: "researcher" };

function canSeeDraft(viewerId, viewerRole, authorId) {
  if (!viewerId) return false;
  if (viewerRole === ROLES.ADMIN) return true;
  const vId =
    viewerId instanceof mongoose.Types.ObjectId
      ? viewerId
      : new mongoose.Types.ObjectId(viewerId);
  const aId =
    authorId instanceof mongoose.Types.ObjectId
      ? authorId
      : new mongoose.Types.ObjectId(authorId);
  return vId.equals(aId);
}

/**
 * @param {Object} opts - { page, limit, q, experimentId, status, sort }
 * @param {mongoose.Types.ObjectId|null} viewerId
 * @param {string} viewerRole
 */
async function listReviews(opts, viewerId, viewerRole) {
  const page = Math.max(1, parseInt(opts.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(opts.limit, 10) || 10));
  const skip = (page - 1) * limit;
  const sortOrder = opts.sort === "oldest" ? 1 : -1;
  const query = {};

  // Visibility: unauthenticated => only published; admin => all; researcher => published + own drafts
  if (!viewerId) {
    query.status = STATUS.PUBLISHED;
  } else if (viewerRole === ROLES.ADMIN) {
    if (opts.status) query.status = opts.status;
  } else {
    // Researcher: published or own drafts
    if (opts.status === STATUS.PUBLISHED) {
      query.status = STATUS.PUBLISHED;
    } else if (opts.status === STATUS.DRAFT) {
      query.status = STATUS.DRAFT;
      query.author = viewerId;
    } else {
      query.$or = [{ status: STATUS.PUBLISHED }, { author: viewerId }];
    }
  }

  if (opts.experimentId) {
    if (!mongoose.Types.ObjectId.isValid(opts.experimentId)) {
      const err = new Error("Invalid experimentId");
      err.code = "VALIDATION";
      err.statusCode = 400;
      throw err;
    }
    query.experiment = new mongoose.Types.ObjectId(opts.experimentId);
  }

  if (opts.q && opts.q.trim()) {
    const q = opts.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const textFilter = {
      $or: [{ title: new RegExp(q, "i") }, { abstract: new RegExp(q, "i") }],
    };
    if (query.$or) {
      query.$and = [{ $or: query.$or }, textFilter];
      delete query.$or;
    } else {
      Object.assign(query, textFilter);
    }
  }

  const [items, total] = await Promise.all([
    Review.find(query)
      .sort({ createdAt: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate("author", "name email")
      .populate("experiment", "title")
      .lean(),
    Review.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit);
  return { items, page, limit, total, totalPages };
}

/**
 * List reviews for a specific experiment (same visibility rules).
 */
async function listByExperiment(experimentId, opts, viewerId, viewerRole) {
  if (!mongoose.Types.ObjectId.isValid(experimentId)) {
    const err = new Error("Invalid experimentId");
    err.code = "VALIDATION";
    err.statusCode = 400;
    throw err;
  }
  const experiment = await Experiment.findById(experimentId);
  if (!experiment) {
    const err = new Error("Experiment not found");
    err.code = "NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }
  return listReviews({ ...opts, experimentId }, viewerId, viewerRole);
}

async function getReviewById(id, viewerId, viewerRole) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error("Invalid review id");
    err.code = "VALIDATION";
    err.statusCode = 400;
    throw err;
  }
  const review = await Review.findById(id)
    .populate("author", "name email")
    .populate("experiment", "title description")
    .lean();
  if (!review) {
    const err = new Error("Review not found");
    err.code = "NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }
  const authorId = review.author && (review.author._id || review.author);
  if (review.status === STATUS.DRAFT && !canSeeDraft(viewerId, viewerRole, authorId)) {
    const err = new Error("Forbidden");
    err.code = "FORBIDDEN";
    err.statusCode = 403;
    throw err;
  }
  return review;
}

async function createReview(data, authorId) {
  // Experiment link is optional for Research Reviews UI; validate only if present
  let experiment = null;
  if (data.experiment) {
    if (!mongoose.Types.ObjectId.isValid(data.experiment)) {
      const err = new Error("Invalid experiment id");
      err.code = "VALIDATION";
      err.statusCode = 400;
      throw err;
    }
    experiment = await Experiment.findById(data.experiment);
    if (!experiment) {
      const err = new Error("Experiment not found");
      err.code = "NOT_FOUND";
      err.statusCode = 404;
      throw err;
    }
  }
  const summary = data.summary ?? data.abstract;
  const review = await Review.create({
    title: data.title,
    summary,
    abstract: summary,
    content: data.content,
    keywords: data.keywords || [],
    experiment: experiment ? experiment._id : undefined,
    author: authorId,
    authorId,
    status: data.status || STATUS.DRAFT,
  });
  return Review.findById(review._id)
    .populate("author", "name email")
    .populate("experiment", "title");
}

async function updateReview(id, data, userId, userRole) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error("Invalid review id");
    err.code = "VALIDATION";
    err.statusCode = 400;
    throw err;
  }
  const review = await Review.findById(id);
  if (!review) {
    const err = new Error("Review not found");
    err.code = "NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }
  if (userRole !== ROLES.ADMIN && !review.author.equals(userId)) {
    const err = new Error("Only the author or an admin can update this review");
    err.code = "FORBIDDEN";
    err.statusCode = 403;
    throw err;
  }
  const allowed = ["title", "abstract", "content", "keywords", "status"];
  allowed.forEach((key) => {
    if (data[key] !== undefined) review[key] = data[key];
  });
  await review.save();
  return Review.findById(review._id)
    .populate("author", "name email")
    .populate("experiment", "title");
}

async function deleteReview(id, userId, userRole) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error("Invalid review id");
    err.code = "VALIDATION";
    err.statusCode = 400;
    throw err;
  }
  const review = await Review.findById(id);
  if (!review) {
    const err = new Error("Review not found");
    err.code = "NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }
  if (userRole !== ROLES.ADMIN && !review.author.equals(userId)) {
    const err = new Error("Only the author or an admin can delete this review");
    err.code = "FORBIDDEN";
    err.statusCode = 403;
    throw err;
  }
  await Review.findByIdAndDelete(id);
  return { deleted: true };
}

module.exports = {
  listReviews,
  listByExperiment,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
};
