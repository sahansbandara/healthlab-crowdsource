const { HTTP_STATUS } = require('../../../config/constants');
const { error: errorResponse } = require('../../../utils/response');
const reportService = require('../services/reportService');

// Get user ID from auth middleware
function getUserId(req) {
  return req.user && (req.user.id || req.user._id);
}

// Submit a report for a post
async function submitReport(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return errorResponse(res, HTTP_STATUS.UNAUTHORIZED, 'Authentication required');

    const { id: postId } = req.params;
    const { reason, customReason } = req.body;

    const report = await reportService.submitReport(postId, userId, { reason, customReason });
    return res.status(HTTP_STATUS.CREATED).json({ success: true, report, message: 'Post reported successfully' });
  } catch (err) {
    next(err);
  }
}

// Get all reported posts (admin only)
async function getAllReports(req, res, next) {
  try {
    const filters = req.query;
    const reports = await reportService.getAllReports(filters);
    return res.status(HTTP_STATUS.OK).json({ success: true, reports });
  } catch (err) {
    next(err);
  }
}

// Get detailed reports for a specific post (admin only)
async function getPostReportDetails(req, res, next) {
  try {
    const { postId } = req.params;
    const details = await reportService.getPostReportDetails(postId);
    return res.status(HTTP_STATUS.OK).json({ success: true, details });
  } catch (err) {
    next(err);
  }
}

// Ban user for reported post (admin only)
async function banUserForReport(req, res, next) {
  try {
    const { postId } = req.params;
    
    // Get post to find author
    const details = await reportService.getPostReportDetails(postId);
    const userId = details.authorId;

    const user = await reportService.banUser(userId);
    return res.status(HTTP_STATUS.OK).json({ success: true, user, message: 'User banned successfully' });
  } catch (err) {
    next(err);
  }
}

// Delete reported post (admin only)
async function deleteReportedPost(req, res, next) {
  try {
    const { postId } = req.params;
    const post = await reportService.deletePost(postId);
    return res.status(HTTP_STATUS.OK).json({ success: true, post, message: 'Post deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  submitReport,
  getAllReports,
  getPostReportDetails,
  banUserForReport,
  deleteReportedPost,
};
