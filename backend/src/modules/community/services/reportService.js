const Report = require('../../../models/Report');
const Post = require('../../../models/Post');
const User = require('../../../models/User');

// Submit a report for a post
async function submitReport(postId, userId, data) {
  const { reason, customReason } = data;

  // Check if post exists
  const post = await Post.findById(postId);
  if (!post) {
    const err = new Error('Post not found');
    err.statusCode = 404;
    throw err;
  }

  // Check if user already reported this post
  const existingReport = await Report.findOne({ postId, reportedBy: userId });
  if (existingReport) {
    const err = new Error('You have already reported this post');
    err.statusCode = 400;
    throw err;
  }

  // Create report
  const report = await Report.create({
    postId,
    reportedBy: userId,
    reason,
    customReason: reason === 'other' ? customReason : null,
  });

  return report;
}

// Get all reported posts with aggregated data (for admin)
async function getAllReports(filters = {}) {
  const { status = 'pending' } = filters;

  const pipeline = [
    { $match: { status } },
    {
      $group: {
        _id: '$postId',
        reportCount: { $sum: 1 },
        reasons: { $push: '$reason' },
        reporters: { $push: '$reportedBy' },
        firstReportedAt: { $min: '$createdAt' },
        lastReportedAt: { $max: '$createdAt' },
      },
    },
    {
      $lookup: {
        from: 'posts',
        localField: '_id',
        foreignField: '_id',
        as: 'postData',
      },
    },
    { $unwind: { path: '$postData', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'users',
        localField: 'postData.author',
        foreignField: '_id',
        as: 'authorData',
      },
    },
    { $unwind: { path: '$authorData', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        postId: '$_id',
        postTitle: '$postData.title',
        authorId: '$postData.author',
        authorName: '$authorData.name',
        authorEmail: '$authorData.email',
        reportCount: 1,
        reasons: 1,
        firstReportedAt: 1,
        lastReportedAt: 1,
        _id: 0,
      },
    },
    { $sort: { reportCount: -1, lastReportedAt: -1 } },
  ];

  const reports = await Report.aggregate(pipeline);
  return reports;
}

// Get detailed reports for a specific post
async function getPostReportDetails(postId) {
  // Verify post exists
  const post = await Post.findById(postId).populate('author', 'name email _id');
  if (!post) {
    const err = new Error('Post not found');
    err.statusCode = 404;
    throw err;
  }

  // Get all reports for this post
  const reports = await Report.find({ postId })
    .populate('reportedBy', 'name email _id')
    .sort({ createdAt: -1 });

  // Aggregate reason counts
  const reasonCounts = {};
  reports.forEach((r) => {
    reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + 1;
  });

  return {
    postId,
    postTitle: post.title,
    postContent: post.content,
    authorId: post.author._id,
    authorName: post.author.name,
    authorEmail: post.author.email,
    totalReports: reports.length,
    reasonCounts,
    reports,
  };
}

// Ban user (mark as banned)
async function banUser(userId) {
  const user = await User.findByIdAndUpdate(userId, { banned: true }, { new: true });
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return user;
}

// Delete post and mark all reports as resolved
async function deletePost(postId) {
  const post = await Post.findByIdAndDelete(postId);
  if (!post) {
    const err = new Error('Post not found');
    err.statusCode = 404;
    throw err;
  }

  // Mark related reports as resolved
  await Report.updateMany({ postId }, { status: 'resolved' });

  return post;
}

module.exports = {
  submitReport,
  getAllReports,
  getPostReportDetails,
  banUser,
  deletePost,
};
