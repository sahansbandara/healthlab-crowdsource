const Post = require("../models/Post");

const getPosts = async (req, res, next) => {
  try {
    const { sort = "latest", q } = req.query;
    const match = {};
    if (q && q.trim()) {
      match.$or = [
        { title: new RegExp(q.trim(), "i") },
        { content: new RegExp(q.trim(), "i") },
        { tags: new RegExp(q.trim(), "i") },
      ];
    }
    const sortStage =
      sort === "popular"
        ? { $sort: { likeCount: -1, createdAt: -1 } }
        : sort === "most_commented"
          ? { $sort: { commentCount: -1, createdAt: -1 } }
          : { $sort: { createdAt: -1 } };
    const pipeline = [
      { $match: Object.keys(match).length ? match : {} },
      { $addFields: { likeCount: { $size: { $ifNull: ["$likes", []] } }, commentCount: { $size: { $ifNull: ["$comments", []] } } } },
      sortStage,
      { $lookup: { from: "users", localField: "author", foreignField: "_id", as: "authorDoc" } },
      { $unwind: { path: "$authorDoc", preserveNullAndEmptyArrays: true } },
      { $addFields: { author: "$authorDoc" } },
      {
        $project: {
          _id: 1,
          title: 1,
          content: 1,
          tags: 1,
          likes: 1,
          shareCount: 1,
          savedBy: 1,
          createdAt: 1,
          updatedAt: 1,
          likeCount: 1,
          commentCount: 1,
          author: { _id: 1, name: 1, email: 1 },
        },
      },
    ];
    const posts = await Post.aggregate(pipeline);
    res.status(200).json({ posts });
  } catch (err) {
    next(err);
  }
};

const getSavedPosts = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const posts = await Post.find({ savedBy: userId })
      .populate("author", "name email")
      .sort({ createdAt: -1 })
      .lean();
    const withCounts = posts.map((p) => ({
      ...p,
      likeCount: (p.likes && p.likes.length) || 0,
      commentCount: (p.comments && p.comments.length) || 0,
    }));
    res.status(200).json({ posts: withCounts });
  } catch (err) {
    next(err);
  }
};

const getPostById = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).populate("author", "name email").lean();
    if (!post) return res.status(404).json({ message: "Post not found" });
    const withCounts = {
      ...post,
      likeCount: (post.likes && post.likes.length) || 0,
      commentCount: (post.comments && post.comments.length) || 0,
    };
    res.status(200).json(withCounts);
  } catch (err) {
    next(err);
  }
};

const createPost = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const { title, content, tags } = req.body;
    const post = await Post.create({
      title: title || "",
      content: content || "",
      tags: Array.isArray(tags) ? tags : [],
      author: userId,
    });
    const populated = await Post.findById(post._id).populate("author", "name email").lean();
    res.status(201).json({
      ...populated,
      likeCount: 0,
      commentCount: 0,
    });
  } catch (err) {
    next(err);
  }
};

const updatePost = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (String(post.author) !== String(userId)) {
      return res.status(403).json({ message: "Not authorized to update this post" });
    }
    const { title, content, tags } = req.body;
    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    if (tags !== undefined) post.tags = Array.isArray(tags) ? tags : [];
    await post.save();
    const populated = await Post.findById(post._id).populate("author", "name email").lean();
    res.status(200).json({
      ...populated,
      likeCount: (post.likes && post.likes.length) || 0,
      commentCount: (post.comments && post.comments.length) || 0,
    });
  } catch (err) {
    next(err);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (String(post.author) !== String(userId)) {
      return res.status(403).json({ message: "Not authorized to delete this post" });
    }
    await Post.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Post deleted" });
  } catch (err) {
    next(err);
  }
};

const likeToggle = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: "Authentication required" });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    const likes = post.likes || [];
    const idx = likes.findIndex((id) => String(id) === String(userId));
    let liked;
    if (idx >= 0) {
      likes.splice(idx, 1);
      liked = false;
    } else {
      likes.push(userId);
      liked = true;
    }
    post.likes = likes;
    await post.save();
    res.status(200).json({ likeCount: post.likes.length, liked });
  } catch (err) {
    next(err);
  }
};

const sharePost = async (req, res, next) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { shareCount: 1 } },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.status(200).json({ shareCount: post.shareCount });
  } catch (err) {
    next(err);
  }
};

const savePost = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: "Authentication required" });
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { savedBy: userId } },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.status(200).json({ message: "Post saved" });
  } catch (err) {
    next(err);
  }
};

const unsavePost = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: "Authentication required" });
    await Post.findByIdAndUpdate(req.params.id, { $pull: { savedBy: userId } });
    res.status(200).json({ message: "Post unsaved" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
};
