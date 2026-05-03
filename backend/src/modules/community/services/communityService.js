// Community service: post CRUD, likes, share, save, comments; no HTTP
const Post = require("../model/Post");
const User = require("../../../models/User");
const { generateSmartTags } = require("./aiTaggingService");

const DEFAULT_ADMIN_EMAIL = "admin@healthlab.com";

// Escape special regex characters so search term is matched literally (e.g. "C++", "health (study)")
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseCsvLike(value) {
  if (value == null) return [];
  return String(value)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function normalizePoll(poll) {
  if (!poll || typeof poll !== "object") return null;
  const question = String(poll.question || "").trim();
  if (!question) return null;

  const options = (Array.isArray(poll.options) ? poll.options : [])
    .map((opt) => (typeof opt === "string" ? opt : opt && opt.text))
    .map((text) => String(text || "").trim())
    .filter(Boolean)
    .slice(0, 6);

  if (options.length < 2) return null;

  return {
    question: question.slice(0, 200),
    options: options.map((text) => ({ text, voters: [] })),
  };
}

function formatPollForUser(poll, userId = null) {
  if (!poll || !Array.isArray(poll.options) || poll.options.length === 0) return null;

  const myId = userId != null ? String(userId) : null;
  const options = poll.options.map((option) => {
    const text = typeof option === "string" ? option : option && option.text;
    const voters = Array.isArray(option && option.voters) ? option.voters : [];
    return {
      text: String(text || "").trim(),
      voteCount: voters.length,
      votedByMe: myId ? voters.some((id) => String(id) === myId) : false,
    };
  });

  const totalVotes = options.reduce((sum, option) => sum + option.voteCount, 0);
  const selectedOptionIndex = options.findIndex((option) => option.votedByMe);

  return {
    question: String(poll.question || "").trim(),
    options: options.map((option) => ({
      text: option.text,
      voteCount: option.voteCount,
      percentage: totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0,
    })),
    totalVotes,
    selectedOptionIndex: selectedOptionIndex >= 0 ? selectedOptionIndex : null,
  };
}

async function resolvePublishingAuthorId(fallbackUserId) {
  const admin = await User.findOne({
    role: { $in: ["admin", "ADMIN"] },
    email: DEFAULT_ADMIN_EMAIL,
  }).select("_id");

  if (admin && admin._id) {
    return admin._id;
  }

  const anyAdmin = await User.findOne({ role: { $in: ["admin", "ADMIN"] } }).select("_id");
  return (anyAdmin && anyAdmin._id) || fallbackUserId;
}

// List posts with optional sort (latest|popular|most_commented) and search q, with pagination support
async function getPosts(query = {}, userId = null) {
  const { sort = "latest", q, tag, tags, followingTags, author, page = 1, limit = 10 } = query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);
  const skip = (pageNum - 1) * limitNum;
  
  const match = {};
  if (q && String(q).trim()) {
    const term = String(q).trim();
    const regex = new RegExp(escapeRegex(term), "i");
    match.$or = [
      { title: regex },
      { content: regex },
      { tags: regex },
      { aiTags: regex },
    ];
  }

  const selectedTags = [...parseCsvLike(tag), ...parseCsvLike(tags), ...parseCsvLike(followingTags)];
  if (selectedTags.length > 0) {
    const tagRegexList = selectedTags.map((t) => new RegExp(`^${escapeRegex(t)}$`, "i"));
    match.$and = match.$and || [];
    match.$and.push({
      $or: [{ tags: { $in: tagRegexList } }, { aiTags: { $in: tagRegexList } }],
    });
  }

  const authorTerm = String(author || "").trim();
  if (authorTerm) {
    match.$and = match.$and || [];
    match.$and.push({ "authorDoc.name": new RegExp(escapeRegex(authorTerm), "i") });
  }

  const sortStage =
    sort === "popular" || sort === "top"
      ? { $sort: { likeCount: -1, createdAt: -1 } }
      : sort === "most_commented" || sort === "most_discussed"
      ? { $sort: { commentCount: -1, createdAt: -1 } }
      : sort === "trending"
      ? { $sort: { trendingScore: -1, createdAt: -1 } }
      : { $sort: { createdAt: -1 } };

  const pipeline = [
    { $lookup: { from: "users", localField: "author", foreignField: "_id", as: "authorDoc" } },
    { $unwind: { path: "$authorDoc", preserveNullAndEmptyArrays: true } },
    { $match: Object.keys(match).length ? match : {} },
    {
      $addFields: {
        upvoteCount: { $size: { $ifNull: ["$likes", []] } },
        downvoteCount: { $size: { $ifNull: ["$downvotes", []] } },
        visibleComments: {
          $filter: {
            input: { $ifNull: ["$comments", []] },
            as: "c",
            cond: { $ne: ["$$c.status", "hidden"] },
          },
        },
      },
    },
    {
      $addFields: {
        likeCount: "$upvoteCount",
        commentCount: { $size: { $ifNull: ["$visibleComments", []] } },
        score: { $subtract: ["$upvoteCount", "$downvoteCount"] },
        topCommentRaw: { $arrayElemAt: ["$visibleComments", -1] },
        ageHours: {
          $divide: [{ $subtract: [new Date(), "$createdAt"] }, 1000 * 60 * 60],
        },
      },
    },
    {
      $addFields: {
        trendingScore: {
          $subtract: [
            {
              $add: [
                { $multiply: ["$upvoteCount", 2] },
                { $multiply: ["$commentCount", 3] },
                { $ifNull: ["$shareCount", 0] },
              ],
            },
            { $multiply: ["$ageHours", 0.05] },
          ],
        },
      },
    },
    { $lookup: { from: "users", localField: "topCommentRaw.author", foreignField: "_id", as: "topCommentAuthorDoc" } },
    { $unwind: { path: "$topCommentAuthorDoc", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        topComment: {
          $cond: [
            { $ifNull: ["$topCommentRaw", false] },
            {
              _id: "$topCommentRaw._id",
              content: "$topCommentRaw.content",
              createdAt: "$topCommentRaw.createdAt",
              author: {
                _id: "$topCommentAuthorDoc._id",
                name: "$topCommentAuthorDoc.name",
              },
            },
            null,
          ],
        },
      },
    },
    sortStage,
    { $addFields: { author: "$authorDoc" } },
    {
      $project: {
        _id: 1,
        title: 1,
        content: 1,
        tags: 1,
        aiTags: 1,
        image: 1,
        poll: 1,
        category: 1,
        likes: 1,
        downvotes: 1,
        shareCount: 1,
        savedBy: 1,
        createdAt: 1,
        updatedAt: 1,
        score: 1,
        upvoteCount: 1,
        downvoteCount: 1,
        likeCount: 1,
        commentCount: 1,
        topComment: 1,
        author: { _id: 1, name: 1, email: 1 },
      },
    },
  ];
  
  // Get total count before pagination
  const countPipeline = pipeline.slice(0, pipeline.length - 1); // Remove $project stage
  countPipeline.push({ $count: "total" });
  const countResult = await Post.aggregate(countPipeline);
  const total = countResult.length > 0 ? countResult[0].total : 0;
  const totalPages = Math.ceil(total / limitNum);
  
  // Add pagination stages
  const paginatedPipeline = [...pipeline, { $skip: skip }, { $limit: limitNum }];
  const posts = await Post.aggregate(paginatedPipeline);
  
  return {
    posts: posts.map((p) => ({
      ...p,
      image: p.image || null,
      poll: formatPollForUser(p.poll, userId),
    })),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
  };
}

// Posts saved by user; includes likeCount, commentCount
async function getSearchSuggestions(query = {}) {
  const term = String(query.q || "").trim();
  if (term.length < 2) return [];
  const regex = new RegExp(escapeRegex(term), "i");

  const [tagRows, aiTagRows, titleRows, authorRows] = await Promise.all([
    Post.aggregate([
      { $unwind: { path: "$tags", preserveNullAndEmptyArrays: false } },
      { $match: { tags: regex } },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    Post.aggregate([
      { $unwind: { path: "$aiTags", preserveNullAndEmptyArrays: false } },
      { $match: { aiTags: regex } },
      { $group: { _id: "$aiTags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    Post.aggregate([
      { $match: { title: regex } },
      { $group: { _id: "$title", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    Post.aggregate([
      { $lookup: { from: "users", localField: "author", foreignField: "_id", as: "authorDoc" } },
      { $unwind: { path: "$authorDoc", preserveNullAndEmptyArrays: false } },
      { $match: { "authorDoc.name": regex } },
      { $group: { _id: "$authorDoc.name", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
  ]);

  const suggestions = [
    ...tagRows.map((r) => ({ type: "tag", value: r._id, count: r.count })),
    ...aiTagRows.map((r) => ({ type: "tag", value: r._id, count: r.count })),
    ...authorRows.map((r) => ({ type: "user", value: r._id, count: r.count })),
    ...titleRows.map((r) => ({ type: "keyword", value: r._id, count: r.count })),
  ];

  const seen = new Set();
  return suggestions
    .filter((s) => {
      const key = `${s.type}:${String(s.value).toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}
async function getSavedPosts(userId) {
  const posts = await Post.find({ savedBy: userId }).populate("author", "name email").sort({ createdAt: -1 }).lean();
  return posts.map((p) => ({
    ...p,
    image: p.image || null,
    poll: formatPollForUser(p.poll, userId),
    upvoteCount: (p.likes && p.likes.length) || 0,
    downvoteCount: (p.downvotes && p.downvotes.length) || 0,
    score: ((p.likes && p.likes.length) || 0) - ((p.downvotes && p.downvotes.length) || 0),
    likeCount: (p.likes && p.likes.length) || 0,
    commentCount: (p.comments && p.comments.length) || 0,
    topComment: (p.comments || []).filter((c) => c.status !== "hidden").slice(-1)[0] || null,
  }));
}

// Single post with author and comments populated; likeCount, commentCount
async function getPostById(postId, userId = null) {
  const post = await Post.findById(postId).populate("author", "name email").populate("comments.author", "name").lean();
  if (!post) return null;
  const visibleComments = (post.comments || []).filter((c) => c.status !== "hidden");
  return {
    ...post,
    image: post.image || null,
    poll: formatPollForUser(post.poll, userId),
    upvoteCount: (post.likes && post.likes.length) || 0,
    downvoteCount: (post.downvotes && post.downvotes.length) || 0,
    score: ((post.likes && post.likes.length) || 0) - ((post.downvotes && post.downvotes.length) || 0),
    likeCount: (post.likes && post.likes.length) || 0,
    commentCount: visibleComments.length,
    topComment: visibleComments.length > 0 ? visibleComments[visibleComments.length - 1] : null,
  };
}

// Create post; optional AI tags from title/content; returns post and ai object
async function createPost(userId, data) {
  const { title, content, tags, image, poll } = data;
  const publishingAuthorId = await resolvePublishingAuthorId(userId);
  const tagArray = Array.isArray(tags)
    ? tags
    : typeof tags === "string"
    ? tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];
  let ai = null;
  try {
    ai = await generateSmartTags({ title, content });
  } catch (_) {}
  const normalizedPoll = normalizePoll(poll);
  const post = await Post.create({
    title: title || "",
    content: content || "",
    tags: tagArray,
    image: image && String(image).trim() ? String(image).trim() : null,
    poll: normalizedPoll,
    category: (ai && ai.category) || null,
    aiTags: Array.isArray(ai && ai.aiTags) ? ai.aiTags : [],
    author: publishingAuthorId,
  });
  const populated = await Post.findById(post._id).populate("author", "name email").lean();
  return {
    post: {
      ...populated,
      image: populated.image || null,
      poll: formatPollForUser(populated.poll, publishingAuthorId),
      upvoteCount: 0,
      downvoteCount: 0,
      score: 0,
      likeCount: 0,
      commentCount: 0,
      topComment: null,
    },
    ai,
  };
}

// Update post; returns null if not found, { forbidden: true } if not author
async function updatePost(postId, userId, data) {
  const post = await Post.findById(postId);
  if (!post) return null;
  if (String(post.author) !== String(userId)) return { forbidden: true };
  if (data.title !== undefined) post.title = data.title;
  if (data.content !== undefined) post.content = data.content;
  if (data.tags !== undefined) post.tags = Array.isArray(data.tags) ? data.tags : [];
  await post.save();
  const populated = await Post.findById(postId).populate("author", "name email").lean();
  return {
    ...populated,
    likeCount: (post.likes && post.likes.length) || 0,
    commentCount: (post.comments && post.comments.length) || 0,
  };
}

// Delete post; returns null if not found, { forbidden: true } if not author
async function deletePost(postId, userId) {
  const post = await Post.findById(postId);
  if (!post) return null;
  if (String(post.author) !== String(userId)) return { forbidden: true };
  await Post.findByIdAndDelete(postId);
  return true;
}

// Add or remove user from likes; returns { likeCount, liked }
async function likeToggle(postId, userId) {
  return voteToggle(postId, userId, "up");
}

async function voteToggle(postId, userId, vote = "up") {
  const post = await Post.findById(postId);
  if (!post) return null;

  const normalizedVote = vote === "down" ? "down" : "up";
  const likes = [...(post.likes || [])];
  const downvotes = [...(post.downvotes || [])];
  const likeIdx = likes.findIndex((id) => String(id) === String(userId));
  const downIdx = downvotes.findIndex((id) => String(id) === String(userId));

  if (normalizedVote === "up") {
    if (likeIdx >= 0) likes.splice(likeIdx, 1);
    else likes.push(userId);
    if (downIdx >= 0) downvotes.splice(downIdx, 1);
  } else {
    if (downIdx >= 0) downvotes.splice(downIdx, 1);
    else downvotes.push(userId);
    if (likeIdx >= 0) likes.splice(likeIdx, 1);
  }

  post.likes = likes;
  post.downvotes = downvotes;
  await post.save();

  const upvoteCount = likes.length;
  const downvoteCount = downvotes.length;
  let voted = null;
  if (likes.some((id) => String(id) === String(userId))) voted = "up";
  else if (downvotes.some((id) => String(id) === String(userId))) voted = "down";

  return {
    likeCount: upvoteCount,
    upvoteCount,
    downvoteCount,
    score: upvoteCount - downvoteCount,
    liked: voted === "up",
    voted,
  };
}

async function votePoll(postId, userId, optionIndex) {
  const post = await Post.findById(postId);
  if (!post) return null;
  if (!post.poll || !Array.isArray(post.poll.options) || post.poll.options.length < 2) {
    return { noPoll: true };
  }

  const nextOptionIndex = Number(optionIndex);
  if (!Number.isInteger(nextOptionIndex) || nextOptionIndex < 0 || nextOptionIndex >= post.poll.options.length) {
    return { invalidOption: true };
  }

  const uid = String(userId);
  let existingOptionIndex = null;

  post.poll.options = post.poll.options.map((option, idx) => {
    const text = typeof option === "string" ? option : option && option.text;
    const currentVoters = Array.isArray(option.voters) ? [...option.voters] : [];
    const hasUser = currentVoters.some((id) => String(id) === uid);
    if (hasUser) {
      existingOptionIndex = idx;
    }
    return {
      text: String(text || "").trim(),
      voters: currentVoters.filter((id) => String(id) !== uid),
    };
  });

  const finalIndex = existingOptionIndex === nextOptionIndex ? existingOptionIndex : nextOptionIndex;
  if (finalIndex !== null && finalIndex >= 0) {
    const existing = Array.isArray(post.poll.options[finalIndex].voters)
      ? post.poll.options[finalIndex].voters
      : [];
    post.poll.options[finalIndex].voters = [...existing, userId];
  }

  await post.save();
  return { poll: formatPollForUser(post.poll, userId) };
}

// Increment shareCount; returns { shareCount } or null
async function sharePost(postId) {
  const post = await Post.findByIdAndUpdate(postId, { $inc: { shareCount: 1 } }, { new: true });
  return post ? { shareCount: post.shareCount } : null;
}

// Add user to savedBy; returns {} or null
async function savePost(postId, userId) {
  const post = await Post.findByIdAndUpdate(postId, { $addToSet: { savedBy: userId } }, { new: true });
  return post ? {} : null;
}

// Remove user from savedBy
async function unsavePost(postId, userId) {
  await Post.findByIdAndUpdate(postId, { $pull: { savedBy: userId } });
  return {};
}

// Append comment to post; returns updated post with commentCount
async function addComment(postId, userId, content) {
  const post = await Post.findById(postId);
  if (!post) return null;
  post.comments = post.comments || [];
  post.comments.push({ author: userId, content: String(content).trim(), status: "visible" });
  await post.save();
  const updated = await Post.findById(postId).populate("author", "name email").populate("comments.author", "name").lean();
  return { ...updated, commentCount: (updated.comments && updated.comments.length) || 0 };
}

// Update comment content; author only; returns { notFound } or { forbidden } on failure
async function updateComment(postId, commentId, userId, content) {
  const post = await Post.findById(postId);
  if (!post) return null;
  const comment = (post.comments || []).find((c) => String(c._id) === String(commentId));
  if (!comment) return { notFound: true };
  if (String(comment.author) !== String(userId)) return { forbidden: true };
  comment.content = String(content).trim();
  await post.save();
  return {};
}

// Delete comment; author only; returns { notFound } or { forbidden } on failure
async function deleteComment(postId, commentId, userId) {
  const post = await Post.findById(postId);
  if (!post) return null;
  const comment = (post.comments || []).find((c) => String(c._id) === String(commentId));
  if (!comment) return { notFound: true };
  if (String(comment.author) !== String(userId)) return { forbidden: true };
  post.comments = post.comments.filter((c) => String(c._id) !== String(commentId));
  await post.save();
  return {};
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
  sharePost,
  savePost,
  unsavePost,
  addComment,
  updateComment,
  deleteComment,
  voteToggle,
  votePoll,
};
