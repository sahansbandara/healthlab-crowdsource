import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Heart, Share2, Bookmark, ArrowLeft, Flag } from 'lucide-react';
import {
  getPostById,
  getPostImageUrl,
  getSavedPosts,
  addComment,
  likeToggle,
  votePoll,
  sharePost,
  savePost,
  unsavePost,
  deleteComment,
  updatePost,
  deletePost as deletePostApi,
  reportPost,
} from '../api/posts';
import ReportModal from '../components/ReportModal';
import {
  Button,
  Card,
  Input,
  Textarea,
  EmptyState,
  ErrorMessage,
  Skeleton,
} from '../components/ui';

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', content: '', tags: [] });
  const [reportOpen, setReportOpen] = useState(false);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchPost();
  }, [id, token]);

  const fetchPost = () => {
    getPostById(id)
      .then(({ data }) => {
        const p = data.post ?? data;
        console.log(`📖 Post fetched. Image field:`, p.image, 'URL would be:', p.image ? getPostImageUrl(p.image) : 'N/A');
        setPost(p);
        setLiked(p?.likes?.some((l) => String(l && (l._id || l)) === String(user._id)) || false);
        return getSavedPosts();
      })
      .then((res) => {
        const savedList = res?.data?.posts || [];
        setSaved(savedList.some((s) => s._id === id));
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load post'))
      .finally(() => setLoading(false));
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      setSubmitting(true);
      setError('');
      await addComment(id, commentText.trim());
      setCommentText('');
      fetchPost();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async () => {
    try {
      const { data } = await likeToggle(id);
      setPost((p) => (p ? { ...p, likeCount: data.likeCount } : p));
      setLiked(data.liked);
    } catch (_) {}
  };

  const handleShare = async () => {
    try {
      await sharePost(id);
      const url = `${window.location.origin}/community/${id}`;
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
      setPost((p) => (p ? { ...p, shareCount: (p.shareCount || 0) + 1 } : p));
    } catch (_) {
      alert('Could not copy link');
    }
  };

  const handleSave = async () => {
    try {
      if (saved) await unsavePost(id);
      else await savePost(id);
      setSaved(!saved);
    } catch (_) {}
  };

  const handleReport = async (data) => {
    await reportPost(id, data);
    alert('Post reported successfully. Thank you for helping us maintain a safe community.');
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteComment(id, commentId);
      fetchPost();
    } catch (_) {}
  };

  const handlePollVote = async (optionIndex) => {
    try {
      const { data } = await votePoll(id, optionIndex);
      const nextPoll = data?.poll;
      if (!nextPoll) return;
      setPost((p) => (p ? { ...p, poll: nextPoll } : p));
    } catch (_) {}
  };

  const isAuthor = post && user._id && (String((post.author && (post.author._id || post.author))) === String(user._id));
  const isAdmin = (user.role || '').toLowerCase() === 'admin';

  const handleStartEdit = () => {
    setEditForm({
      title: post.title || '',
      content: post.content || '',
      tags: Array.isArray(post.tags) ? post.tags.join(', ') : '',
    });
    setEditing(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: editForm.title.trim(),
        content: editForm.content.trim(),
        tags: editForm.tags ? editForm.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      };
      const { data } = await updatePost(id, payload);
      const updated = data.post ?? data;
      setPost(updated);
      setEditForm({ title: updated.title || '', content: updated.content || '', tags: Array.isArray(updated.tags) ? updated.tags.join(', ') : '' });
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update post');
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      await deletePostApi(id);
      navigate('/community');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete post');
    }
  };

  if (!token) return null;
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Skeleton className="h-5 w-40 mb-6" />
        <Card>
          <Skeleton className="h-6 w-3/4 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </Card>
      </div>
    );
  }
  if (error && !post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <ErrorMessage message={error} />
        <Link to="/community" className="inline-block mt-4 text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Back to Community">
          <ArrowLeft size={20} />
        </Link>
      </div>
    );
  }
  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <ErrorMessage message="Post not found." />
        <Link to="/community" className="inline-block mt-4 text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Back to Community">
          <ArrowLeft size={20} />
        </Link>
      </div>
    );
  }

  const comments = (post.comments || []).filter((c) => c.status !== 'hidden');
  const postImage = post.image || post.imageUrl;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <Link
        to="/community"
        className="inline-block text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-lg transition-colors mb-6"
        title="Back to Community"
      >
        <ArrowLeft size={20} />
      </Link>

      {postImage && !editing && (
        <div className="mb-6 rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg">
          <img
            src={getPostImageUrl(postImage)}
            alt="Post banner"
            className="w-full h-72 sm:h-96 object-cover"
            onError={(e) => {
              console.error(`❌ Image failed to load from URL:`, getPostImageUrl(postImage));
              e.target.style.display = 'none';
            }}
            onLoad={() => console.log(`✅ Image loaded successfully from:`, getPostImageUrl(postImage))}
          />
        </div>
      )}

      <Card className="relative">
        {post.category && !editing && (
          <span className="absolute -top-2.5 left-5 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-semibold uppercase tracking-wide shadow">
            {post.category}
          </span>
        )}
        <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
          <span className="text-sm text-gray-500">
            {post.author?.name || 'Unknown'} · {(post.author?.role || '').toLowerCase()}
          </span>
          <span className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleString()}</span>
          {isAuthor && (
            <div className="flex gap-2 ml-auto">
              {!editing ? (
                <>
                  <Button size="sm" variant="secondary" onClick={handleStartEdit}>
                    Edit
                  </Button>
                  <Button size="sm" variant="danger" onClick={handleDeletePost}>
                    Delete
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              )}
            </div>
          )}
        </div>

        {!editing ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">{post.title}</h1>
            {(post.aiTags && post.aiTags.length > 0) && (
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="text-xs text-gray-500 mr-1">AI tags:</span>
                {post.aiTags.map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
                    {t}
                  </span>
                ))}
              </div>
            )}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {post.tags.map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-full bg-primary-light text-primary text-xs font-medium">
                    {t}
                  </span>
                ))}
              </div>
            )}
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed mb-4">{post.content}</p>
            {post.poll?.question && Array.isArray(post.poll?.options) && post.poll.options.length > 0 && (
              <div className="mb-6 rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50 p-5 shadow-md">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🗳️</span>
                  <div>
                    <h3 className="text-lg font-bold text-blue-900">{post.poll.question}</h3>
                    <p className="text-xs text-blue-600">{post.poll.totalVotes || 0} total vote{post.poll.totalVotes === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {post.poll.options.map((opt, idx) => {
                    const isSelected = post.poll.selectedOptionIndex === idx;
                    const label = typeof opt === 'string' ? opt : opt?.text;
                    const voteCount = typeof opt === 'object' ? (opt.voteCount || 0) : 0;
                    const percentage = typeof opt === 'object' ? (opt.percentage || 0) : 0;
                    return (
                      <button
                        key={`poll-option-${idx}`}
                        type="button"
                        onClick={() => handlePollVote(idx)}
                        className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all transform hover:scale-102 ${
                          isSelected
                            ? 'border-blue-500 bg-white shadow-lg ring-2 ring-blue-200'
                            : 'border-blue-200 bg-white hover:border-blue-300 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <span className={`text-sm font-semibold ${
                            isSelected ? 'text-blue-900' : 'text-blue-800'
                          }`}>
                            {isSelected && '✓ '}{label}
                          </span>
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">{percentage}%</span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-xs text-blue-600 font-medium">{voteCount} vote{voteCount === 1 ? '' : 's'}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </>
        ) : (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <Input
              label="Title"
              value={editForm.title}
              onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
            <Textarea
              label="Content"
              rows={6}
              value={editForm.content}
              onChange={(e) => setEditForm((f) => ({ ...f, content: e.target.value }))}
              required
            />
            <Input
              label="Tags (comma-separated)"
              value={editForm.tags}
              onChange={(e) => setEditForm((f) => ({ ...f, tags: e.target.value }))}
            />
            <Button type="submit">Save changes</Button>
          </form>
        )}

        {!editing && (
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${liked ? 'text-red-600 bg-red-50' : 'text-gray-600 hover:bg-gray-100'}`}
              title="Like this post"
            >
              <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
              <span className="text-sm font-medium">{post.likeCount || 0}</span>
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={handleShare}
                className="text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                title="Share this post"
              >
                <Share2 size={18} />
              </button>
              <button
                type="button"
                onClick={handleSave}
                className={`p-2 rounded-lg transition-colors ${
                  saved ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-100'
                }`}
                title={saved ? 'Remove from bookmarks' : 'Bookmark this post'}
              >
                <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} />
              </button>
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                title="Report this post"
              >
                <Flag size={18} />
              </button>
            </div>
          </div>
        )}
      </Card>

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmit={handleReport}
        postId={id}
      />

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Comments ({comments.length})</h2>
        {error && <ErrorMessage message={error} onDismiss={() => setError('')} className="mb-4" />}
        <Card className="mb-6" id="comment-box">
          <form onSubmit={handleAddComment} className="space-y-3">
            <Textarea
              placeholder="Write a comment..."
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Posting...' : 'Post comment'}
            </Button>
          </form>
        </Card>
        <div className="space-y-3">
          {comments.length === 0 ? (
            <EmptyState
              icon="💬"
              title="No comments yet"
              description="Be the first to share your thoughts."
            />
          ) : (
            comments.map((c) => (
              <Card key={c._id} padding className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-gray-900">{c.author?.name || 'Unknown'}</strong>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleString()}</span>
                    {((c.author && (c.author._id || c.author) === user._id) || isAdmin) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(c._id)}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">{c.content}</p>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default PostDetail;
