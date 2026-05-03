// Community controller: HTTP handlers for posts, likes, save, comments; delegates to communityService
const { HTTP_STATUS } = require("../../config/constants");
const { error: errorResponse } = require("../../utils/response");
const communityService = require("./services/communityService");

// Get current user id from auth middleware
function getUserId(req) {
  return req.user && (req.user.id || req.user._id);
}

// List posts with query (sort, q, page, limit); returns { success, posts, pagination }
async function getPosts(req, res, next) {
  try {
    const userId = getUserId(req);
    const result = await communityService.getPosts(req.query, userId);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      posts: result.posts,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

async function getSearchSuggestions(req, res, next) {
  try {
    const suggestions = await communityService.getSearchSuggestions(req.query);
    return res.status(HTTP_STATUS.OK).json({ success: true, suggestions });
  } catch (err) {
    next(err);
  }
}

// List posts saved by current user
async function getSavedPosts(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return errorResponse(res, HTTP_STATUS.UNAUTHORIZED, "Authentication required");
    const posts = await communityService.getSavedPosts(userId);
    return res.status(HTTP_STATUS.OK).json({ success: true, posts });
  } catch (err) {
    next(err);
  }
}

// Get single post by id; 404 if not found
async function getPostById(req, res, next) {
  try {
    const userId = getUserId(req);
    const post = await communityService.getPostById(req.params.id, userId);
    if (!post) return errorResponse(res, HTTP_STATUS.NOT_FOUND, "Post not found");
    return res.status(HTTP_STATUS.OK).json({ success: true, post });
  } catch (err) {
    next(err);
  }
}

// Create post; may include ai category/tags in response
async function createPost(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return errorResponse(res, HTTP_STATUS.UNAUTHORIZED, "Authentication required");
    const body = req.body || {};
    const payload = {
      title: body.title,
      content: body.content,
      tags: body.tags,
    };
    if (body.poll !== undefined) {
      let parsedPoll = body.poll;
      if (typeof parsedPoll === "string") {
        try {
          parsedPoll = JSON.parse(parsedPoll);
        } catch (_) {
          return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "poll must be valid JSON");
        }
      }
      payload.poll = parsedPoll;
    }
    // Handle image upload from multipart form
    console.log(`🔍 createPost - req.file:`, req.file ? `Yes (${req.file.mimetype}, ${req.file.size} bytes)` : 'No');
    if (req.file && req.file.filename) {
      payload.image = `post-images/${req.file.filename}`;
      console.log(`✅ Image file processed: ${payload.image}`);
    } else if (req.file) {
      console.log(`⚠️ File received but no filename - full object:`, JSON.stringify(req.file, null, 2));
    } else {
      console.log(`📝 No file in request (headers:`, req.headers['content-type'] || 'no content-type', `)` );
    }
    const result = await communityService.createPost(userId, payload);
    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      post: result.post,
      ai: result.ai ? { category: result.ai.category, tags: result.ai.aiTags } : undefined,
    });
  } catch (err) {
    next(err);
  }
}

// Update post; author only; 403 if not owner
async function updatePost(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return errorResponse(res, HTTP_STATUS.UNAUTHORIZED, "Authentication required");
    const result = await communityService.updatePost(req.params.id, userId, req.body);
    if (!result) return errorResponse(res, HTTP_STATUS.NOT_FOUND, "Post not found");
    if (result.forbidden) return errorResponse(res, HTTP_STATUS.FORBIDDEN, "Not authorized to update this post");
    return res.status(HTTP_STATUS.OK).json({ success: true, post: result });
  } catch (err) {
    next(err);
  }
}

// Delete post; author only; 403 if not owner
async function deletePost(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return errorResponse(res, HTTP_STATUS.UNAUTHORIZED, "Authentication required");
    const result = await communityService.deletePost(req.params.id, userId);
    if (!result) return errorResponse(res, HTTP_STATUS.NOT_FOUND, "Post not found");
    if (result.forbidden) return errorResponse(res, HTTP_STATUS.FORBIDDEN, "Not authorized to delete this post");
    return res.status(HTTP_STATUS.OK).json({ success: true, message: "Post deleted" });
  } catch (err) {
    next(err);
  }
}

// Toggle like on post; returns likeCount and liked
async function likeToggle(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return errorResponse(res, HTTP_STATUS.UNAUTHORIZED, "Authentication required");
    const vote = req.body && req.body.vote ? String(req.body.vote).toLowerCase() : "up";
    const result = await communityService.voteToggle(req.params.id, userId, vote);
    if (!result) return errorResponse(res, HTTP_STATUS.NOT_FOUND, "Post not found");
    return res.status(HTTP_STATUS.OK).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

// Vote on poll option; one vote per user per poll
async function votePoll(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return errorResponse(res, HTTP_STATUS.UNAUTHORIZED, "Authentication required");
    const optionIndex = Number(req.body && req.body.optionIndex);
    const result = await communityService.votePoll(req.params.id, userId, optionIndex);
    if (!result) return errorResponse(res, HTTP_STATUS.NOT_FOUND, "Post not found");
    if (result.noPoll) return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "This post has no poll");
    if (result.invalidOption) return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "Invalid poll option");
    return res.status(HTTP_STATUS.OK).json({ success: true, poll: result.poll });
  } catch (err) {
    next(err);
  }
}

// Increment share count for post
async function sharePost(req, res, next) {
  try {
    const result = await communityService.sharePost(req.params.id);
    if (!result) return errorResponse(res, HTTP_STATUS.NOT_FOUND, "Post not found");
    return res.status(HTTP_STATUS.OK).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

// Add post to current user's saved list
async function savePost(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return errorResponse(res, HTTP_STATUS.UNAUTHORIZED, "Authentication required");
    const result = await communityService.savePost(req.params.id, userId);
    if (!result) return errorResponse(res, HTTP_STATUS.NOT_FOUND, "Post not found");
    return res.status(HTTP_STATUS.OK).json({ success: true, message: "Post saved" });
  } catch (err) {
    next(err);
  }
}

// Remove post from saved list
async function unsavePost(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return errorResponse(res, HTTP_STATUS.UNAUTHORIZED, "Authentication required");
    await communityService.unsavePost(req.params.id, userId);
    return res.status(HTTP_STATUS.OK).json({ success: true, message: "Post unsaved" });
  } catch (err) {
    next(err);
  }
}

// Add comment to post; returns updated post and commentCount
async function addComment(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return errorResponse(res, HTTP_STATUS.UNAUTHORIZED, "Authentication required");
    const content = (req.body && req.body.content) ? String(req.body.content).trim() : "";
    if (!content) return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "Comment content is required");
    const result = await communityService.addComment(req.params.id, userId, content);
    if (!result) return errorResponse(res, HTTP_STATUS.NOT_FOUND, "Post not found");
    return res.status(HTTP_STATUS.CREATED).json({ success: true, post: result, commentCount: result.commentCount });
  } catch (err) {
    next(err);
  }
}

// Update comment; author only; 403/404 on failure
async function updateComment(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return errorResponse(res, HTTP_STATUS.UNAUTHORIZED, "Authentication required");
    const content = (req.body && req.body.content) ? String(req.body.content).trim() : "";
    if (!content) return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "Comment content is required");
    const result = await communityService.updateComment(req.params.id, req.params.commentId, userId, content);
    if (!result) return errorResponse(res, HTTP_STATUS.NOT_FOUND, "Post not found");
    if (result.notFound) return errorResponse(res, HTTP_STATUS.NOT_FOUND, "Comment not found");
    if (result.forbidden) return errorResponse(res, HTTP_STATUS.FORBIDDEN, "Not authorized to update this comment");
    return res.status(HTTP_STATUS.OK).json({ success: true, message: "Comment updated" });
  } catch (err) {
    next(err);
  }
}

// Delete comment; author only; 403/404 on failure
async function deleteComment(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return errorResponse(res, HTTP_STATUS.UNAUTHORIZED, "Authentication required");
    const result = await communityService.deleteComment(req.params.id, req.params.commentId, userId);
    if (!result) return errorResponse(res, HTTP_STATUS.NOT_FOUND, "Post not found");
    if (result.notFound) return errorResponse(res, HTTP_STATUS.NOT_FOUND, "Comment not found");
    if (result.forbidden) return errorResponse(res, HTTP_STATUS.FORBIDDEN, "Not authorized to delete this comment");
    return res.status(HTTP_STATUS.OK).json({ success: true, message: "Comment deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
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
};
