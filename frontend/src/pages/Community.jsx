import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Bookmark, Heart, MessageSquare, Share2, Sparkles, Users } from 'lucide-react';
import {
  getPosts,
  getPostSuggestions,
  createPost,
  likeToggle,
  votePoll,
  sharePost,
  savePost,
  unsavePost,
  getSavedPosts,
  deletePost,
  sendChatMessage,
} from '../api/posts';
import {
  Button,
  Card,
  Modal,
  Input,
  Textarea,
  PostCardSkeleton,
  EmptyState,
  ErrorMessage,
} from '../components/ui';

const Community = () => {
  const [posts, setPosts] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('latest');
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [activeAuthor, setActiveAuthor] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '', tags: '' });
  const [postImageFile, setPostImageFile] = useState(null);
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('feed');
  const [likedPostIds, setLikedPostIds] = useState(new Set());
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [voteStateByPost, setVoteStateByPost] = useState({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [pageSize] = useState(10);
  const [pageWindowStart, setPageWindowStart] = useState(1);
  const suggestionHideTimerRef = useRef(null);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user._id;
  const [followedTopics, setFollowedTopics] = useState(() => {
    try {
      const raw = localStorage.getItem('community_followed_topics');
      const parsed = JSON.parse(raw || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  });

  useEffect(() => {
    if (!token) {
      setError('auth');
      setLoading(false);
      return;
    }

    if (activeTab === 'feed') {
      setPage(1);
      setPageWindowStart(1);
      fetchFeed({ newPage: 1 });
    }
  }, [token, sort, activeTab, activeTag, activeAuthor, followedTopics]);

  useEffect(() => {
    if (token && activeTab === 'saved') {
      setPage(1);
      setPageWindowStart(1);
      fetchSaved();
    }
  }, [token, activeTab]);

  useEffect(() => {
    if (!token) {
      setSearchSuggestions([]);
      return;
    }

    if (activeTab !== 'feed') {
      setSearchSuggestions([]);
      return;
    }
    const term = search.trim();
    if (term.length < 2) {
      setSearchSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const { data } = await getPostSuggestions(term);
        setSearchSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
      } catch (_) {
        setSearchSuggestions([]);
      }
    }, 220);
    return () => clearTimeout(handle);
  }, [search, activeTab]);

  const fetchFeed = async (overrides = {}) => {
    try {
      setLoading(true);
      const appliedSort = overrides.sort ?? sort;
      const appliedSearch = overrides.search ?? search;
      const appliedTag = overrides.tag ?? activeTag;
      const appliedAuthor = overrides.author ?? activeAuthor;
      const appliedPage = overrides.newPage ?? page;

      const params = { sort: appliedSort, page: appliedPage, limit: pageSize };
      if (String(appliedSearch || '').trim()) params.q = String(appliedSearch).trim();
      if (appliedTag) params.tag = appliedTag;
      if (appliedAuthor) params.author = appliedAuthor;
      if (appliedSort === 'following' && followedTopics.length > 0) {
        params.followingTags = followedTopics.join(',');
      }
      const { data } = await getPosts(params);
      const list = data.posts || [];
      setPosts(list);
      
      // Handle pagination metadata
      if (data.pagination) {
        setTotal(data.pagination.total || 0);
        setTotalPages(data.pagination.totalPages || 0);
        setHasNextPage(data.pagination.hasNextPage || false);
        setHasPrevPage(data.pagination.hasPrevPage || false);
        setPage(appliedPage);
      }
      
      const liked = new Set();
      const voteState = {};
      list.forEach((p) => {
        const likeIds = Array.isArray(p.likes) ? p.likes : [];
        const downvoteIds = Array.isArray(p.downvotes) ? p.downvotes : [];
        const likedByMe = likeIds.some((l) => String(l && (l._id || l)) === String(userId));
        const downvotedByMe = downvoteIds.some((l) => String(l && (l._id || l)) === String(userId));
        if (likedByMe) liked.add(p._id);
        voteState[p._id] = likedByMe ? 'up' : (downvotedByMe ? 'down' : null);
      });
      setLikedPostIds(liked);
      setVoteStateByPost(voteState);
      setError('');
    } catch (err) {
      if ([401, 403].includes(err.response?.status)) {
        setError('auth');
      } else {
        setError(err.response?.data?.message || 'Failed to load posts');
      }
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSaved = async () => {
    try {
      setLoading(true);
      const { data } = await getSavedPosts();
      const list = data.posts || [];
      setPosts(list);
      setSavedIds(new Set(list.map((p) => p._id)));
      const voteState = {};
      list.forEach((p) => {
        const likeIds = Array.isArray(p.likes) ? p.likes : [];
        const downvoteIds = Array.isArray(p.downvotes) ? p.downvotes : [];
        const likedByMe = likeIds.some((l) => String(l && (l._id || l)) === String(userId));
        const downvotedByMe = downvoteIds.some((l) => String(l && (l._id || l)) === String(userId));
        voteState[p._id] = likedByMe ? 'up' : (downvotedByMe ? 'down' : null);
      });
      setVoteStateByPost(voteState);
      setError('');
    } catch (err) {
      if ([401, 403].includes(err.response?.status)) {
        setError('auth');
      } else {
        setError(err.response?.data?.message || 'Failed to load saved posts');
      }
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Title and content are required');
      return;
    }
    if (pollEnabled) {
      const question = pollQuestion.trim();
      const options = pollOptions.map((opt) => opt.trim()).filter(Boolean);
      if (!question) {
        setError('Poll question is required when poll is enabled');
        return;
      }
      if (options.length < 2) {
        setError('Add at least 2 poll options');
        return;
      }
    }
    try {
      setSubmitting(true);
      const payload = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      };
      if (pollEnabled) {
        payload.poll = {
          question: pollQuestion.trim(),
          options: pollOptions.map((opt) => opt.trim()).filter(Boolean),
        };
      }
      if (postImageFile) {
        console.log(`🖼️ Image file selected for post:`, postImageFile.name, `(${(postImageFile.size/1024).toFixed(1)}KB)`);
        payload.imageFile = postImageFile;
      } else {
        console.log(`🖼️ No image file selected`);
      }
      console.log(`📤 Creating post with payload:`, { hasTitle: !!payload.title, hasContent: !!payload.content, hasPoll: !!payload.poll, hasImage: !!payload.imageFile});
      const result = await createPost(payload);
      console.log(`✅ Post created successfully. Response image field:`, result?.data?.post?.image || 'undefined');
      setFormData({ title: '', content: '', tags: '' });
      setPostImageFile(null);
      setPollEnabled(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      setCreateOpen(false);
      fetchFeed();
    } catch (err) {
      console.error(`❌ Failed to create post:`, err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const persistFollowedTopics = (topics) => {
    if (!Array.isArray(topics) || topics.length === 0) return;
    try {
      const next = Array.from(new Set([...(followedTopics || []), ...topics.map((t) => String(t).trim()).filter(Boolean)])).slice(0, 30);
      localStorage.setItem('community_followed_topics', JSON.stringify(next));
      setFollowedTopics(next);
    } catch (_) {}
  };

  const handleLike = async (postId, vote = 'up') => {
    try {
      const { data } = await likeToggle(postId, { vote });
      setPosts((prev) => prev.map((p) => (
        p._id === postId
          ? {
              ...p,
              likeCount: data.upvoteCount ?? data.likeCount ?? p.likeCount ?? 0,
              upvoteCount: data.upvoteCount ?? p.upvoteCount ?? p.likeCount ?? 0,
              downvoteCount: data.downvoteCount ?? p.downvoteCount ?? 0,
              score: data.score ?? ((data.upvoteCount ?? p.upvoteCount ?? 0) - (data.downvoteCount ?? p.downvoteCount ?? 0)),
            }
          : p
      )));
      setLikedPostIds((prev) => {
        const next = new Set(prev);
        if (data.voted === 'up' || data.liked) next.add(postId);
        else next.delete(postId);
        return next;
      });
      setVoteStateByPost((prev) => ({ ...prev, [postId]: data.voted || null }));
      const target = posts.find((p) => p._id === postId);
      if (vote === 'up' && target) {
        const tags = [...(target.tags || []), ...(target.aiTags || [])];
        persistFollowedTopics(tags);
      }
    } catch (_) {}
  };

  const handleShare = async (postId) => {
    try {
      await sharePost(postId);
      const url = `${window.location.origin}/community/${postId}`;
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
      setPosts((prev) => prev.map((p) => (p._id === postId ? { ...p, shareCount: (p.shareCount || 0) + 1 } : p)));
    } catch (_) {
      alert('Could not copy link');
    }
  };

  const handlePollVote = async (postId, optionIndex) => {
    try {
      const { data } = await votePoll(postId, optionIndex);
      const nextPoll = data?.poll;
      if (!nextPoll) return;
      setPosts((prev) => prev.map((p) => (p._id === postId ? { ...p, poll: nextPoll } : p)));
    } catch (_) {}
  };

  const handleSave = async (postId, isSaved) => {
    try {
      if (isSaved) await unsavePost(postId);
      else await savePost(postId);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (isSaved) next.delete(postId);
        else next.add(postId);
        return next;
      });
    } catch (_) {}
  };

  const handleTagClick = (tag) => {
    setActiveTag(tag);
    setActiveAuthor('');
    setSort('latest');
  };

  const clearDiscoveryFilters = () => {
    setActiveTag('');
    setActiveAuthor('');
  };

  const applySuggestion = (suggestion) => {
    if (!suggestion) return;
    if (suggestion.type === 'tag') {
      setActiveTag(suggestion.value);
      setActiveAuthor('');
      setSearch('');
      setPage(1);
      setPageWindowStart(1);
    } else if (suggestion.type === 'user') {
      setActiveAuthor(suggestion.value);
      setActiveTag('');
      setSearch('');
      setPage(1);
      setPageWindowStart(1);
    } else {
      setSearch(suggestion.value);
      setPage(1);
      setPageWindowStart(1);
      fetchFeed({ search: suggestion.value, newPage: 1 });
    }
    setShowSuggestions(false);
  };

  const highlightText = (text, term) => {
    const value = String(text || '');
    const query = String(term || '').trim();
    if (!query) return value;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'i');
    const parts = value.split(regex);
    return parts.map((part, idx) => (
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={`m-${idx}`} className="bg-amber-100 text-amber-900 px-0.5 rounded-sm">{part}</mark>
        : <React.Fragment key={`t-${idx}`}>{part}</React.Fragment>
    ));
  };

  const isLiked = (post) => likedPostIds.has(post._id);
  const isAuthor = (post) => {
    if (!userId || !post.author) return false;
    const authorId = post.author._id || post.author;
    return String(authorId) === String(userId);
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      await deletePost(postId);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete post');
    }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    const text = (chatInput || '').trim();
    if (!text || chatLoading) return;
    setChatError('');
    setChatMessages((prev) => [...prev, { role: 'user', content: text }]);
    setChatInput('');
    setChatLoading(true);
    try {
      const history = chatMessages.map((m) => ({ role: m.role, content: m.content }));
      const { data } = await sendChatMessage({ message: text, history });
      const reply = (data && data.reply) ? data.reply : 'No response.';
      setChatMessages((prev) => [...prev, { role: 'model', content: reply }]);
    } catch (err) {
      setChatError(err.response?.data?.message || 'Failed to get reply');
      setChatMessages((prev) => prev.slice(0, -1));
    } finally {
      setChatLoading(false);
    }
  };

  if (error === 'auth') {
    return (
      <section className="relative min-h-[calc(100vh-76px)] overflow-hidden bg-[#e6f2ff]">
        <motion.div
          className="pointer-events-none absolute left-1/2 top-8 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-400/20 blur-3xl"
          animate={{ scale: [1, 1.12, 1], opacity: [0.55, 0.85, 0.55] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        />
        <motion.div
          className="pointer-events-none absolute right-6 top-28 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl"
          animate={{ y: [0, 18, 0], opacity: [0.45, 0.75, 0.45] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        />
        <motion.div
          className="pointer-events-none absolute bottom-10 left-8 h-48 w-48 rounded-full bg-cyan-300/20 blur-3xl"
          animate={{ y: [0, -16, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        />

        <div className="relative mx-auto flex min-h-[calc(100vh-76px)] max-w-7xl items-center px-4 py-14 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[2.5rem] border border-blue-200/70 bg-white/82 shadow-[0_30px_90px_rgba(37,99,235,0.18)] backdrop-blur-sm lg:grid-cols-[1.05fr_0.95fr]"
          >
            <div className="p-8 sm:p-10 lg:p-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-blue-700">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                HealthLab Community
              </div>
              <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                Log in to see communities and join the feed
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Sign in to explore HealthLab discussions, follow research topics, create posts, comment on findings, and connect with participants and researchers.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.24)] transition hover:bg-blue-500"
                >
                  Sign In
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                >
                  Create Account
                </Link>
              </div>
            </div>

            <div className="relative border-t border-blue-100 bg-gradient-to-br from-blue-700 via-blue-600 to-emerald-600 p-8 text-white lg:border-l lg:border-t-0 sm:p-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_34%)]" aria-hidden />
              <div className="relative space-y-4">
                {[
                  { icon: MessageSquare, title: 'Join discussions', text: 'Read and reply to posts from active HealthLab communities.' },
                  { icon: Users, title: 'Connect with people', text: 'Meet participants, researchers, and health-focused groups.' },
                  { icon: Heart, title: 'Share experiences', text: 'Create posts that support real-world health research conversations.' },
                ].map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, x: 18 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.18 + index * 0.1, duration: 0.45 }}
                      className="rounded-2xl border border-white/18 bg-white/12 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/18 text-white">
                          <Icon className="h-5 w-5" aria-hidden />
                        </div>
                        <div>
                          <h2 className="text-base font-bold">{item.title}</h2>
                          <p className="mt-1 text-sm leading-6 text-blue-50/90">{item.text}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:gap-8">
      <header className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[1.6rem] border border-blue-200/40 bg-gradient-to-br from-[#173a74] via-[#29518f] to-[#3b6ab2] p-5 text-white shadow-[0_30px_80px_-48px_rgba(30,64,175,0.55)] xl:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(191,219,254,0.24),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(147,197,253,0.14),transparent_28%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-50 shadow-sm backdrop-blur-sm">
              Community hub
            </span>
            <h1 className="mt-3 max-w-2xl text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-[2.55rem] lg:leading-[1.04]">
              Connect around health studies, questions, and shared progress
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-blue-50/92">
              Explore participant conversations, discover trending topics, and share research updates in a cleaner community space aligned with the rest of HealthLab.
            </p>
          </div>
          <div className="grid min-w-[250px] grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-[1.15rem] border border-white/18 bg-white/12 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.14)] backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-50">Posts</p>
              <p className="mt-2 text-3xl font-black text-white">{total || posts.length}</p>
              <p className="mt-1 text-sm text-blue-50/82">Visible across the current feed</p>
            </div>
            <div className="rounded-[1.15rem] border border-white/18 bg-white/12 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.14)] backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-50">Saved</p>
              <p className="mt-2 text-3xl font-black text-white">{savedIds.size}</p>
              <p className="mt-1 text-sm text-blue-50/82">Quick-access discussions</p>
            </div>
            <div className="rounded-[1.15rem] border border-white/18 bg-white/12 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.14)] backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-50">Following</p>
              <p className="mt-2 text-3xl font-black text-white">{followedTopics.length}</p>
              <p className="mt-1 text-sm text-blue-50/82">Topics shaped by your activity</p>
            </div>
          </div>
        </div>
      </header>

      <div className="sticky top-4 z-20 rounded-[1.75rem] border border-white/65 bg-white/80 p-3 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)] backdrop-blur sm:p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl border border-slate-200/80 bg-slate-50/90 p-1 shadow-inner shadow-white/70">
            <button
              type="button"
              onClick={() => setActiveTab('feed')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'feed' ? 'bg-[linear-gradient(135deg,#2563eb,#1d4ed8)] text-white shadow-sm' : 'text-slate-600 hover:bg-white'
              }`}
            >
              Feed
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'saved' ? 'bg-[linear-gradient(135deg,#2563eb,#1d4ed8)] text-white shadow-sm' : 'text-slate-600 hover:bg-white'
              }`}
            >
              Saved
            </button>
          </div>
          {activeTab === 'feed' && (
            <>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-transparent focus:ring-2 focus:ring-blue-400"
              >
                <option value="latest">Latest</option>
                <option value="trending">Trending</option>
                <option value="most_discussed">Most Discussed</option>
                <option value="following">Following</option>
              </select>
              <div className="relative flex min-w-0 max-w-md flex-1">
                <input
                  type="text"
                  placeholder="Search posts, tags, users..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => {
                    if (suggestionHideTimerRef.current) clearTimeout(suggestionHideTimerRef.current);
                    suggestionHideTimerRef.current = setTimeout(() => setShowSuggestions(false), 150);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && fetchFeed({ newPage: 1 })}
                  className="block w-full rounded-l-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 shadow-sm focus:border-transparent focus:ring-2 focus:ring-blue-400"
                />
                <Button type="button" size="sm" onClick={() => fetchFeed({ newPage: 1 })} className="rounded-l-none rounded-r-xl border-0 bg-[linear-gradient(135deg,#2563eb,#1d4ed8)] px-4 shadow-none hover:bg-[linear-gradient(135deg,#1d4ed8,#1e40af)]">
                  Search
                </Button>
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-20 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
                    {searchSuggestions.map((s, idx) => (
                      <button
                        key={`${s.type}-${s.value}-${idx}`}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applySuggestion(s)}
                        className="w-full border-b border-slate-100 px-3 py-2 text-left hover:bg-slate-50 last:border-b-0"
                      >
                        <p className="text-sm text-slate-800">{s.value}</p>
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">{s.type} · {s.count || 0} posts</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {(activeTag || activeAuthor) && (
                <button
                  type="button"
                  onClick={clearDiscoveryFilters}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Clear filters
                </button>
              )}
            </>
          )}
        </div>
        <Button
          onClick={() => setCreateOpen(!createOpen)}
          className="shrink-0 rounded-xl bg-[linear-gradient(135deg,#2563eb,#1d4ed8)] px-5 py-3 text-base font-semibold shadow-[0_18px_34px_-20px_rgba(37,99,235,0.8)] hover:bg-[linear-gradient(135deg,#1d4ed8,#1e40af)]"
        >
          {createOpen ? 'Cancel' : '+ New Post'}
        </Button>
      </div>
      </div>

      <div className="rounded-[1.5rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(243,248,255,0.92))] px-5 py-4 shadow-[0_20px_50px_-36px_rgba(30,64,175,0.4)]">
        <p className="text-sm leading-7 text-slate-700">
          Share your research question, findings, or a quick discussion point to get feedback from the community.
        </p>
      </div>

      {(activeTag || activeAuthor || sort === 'following') && (
        <div className="flex flex-wrap items-center gap-2">
          {sort === 'following' && (
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              Following topics
            </span>
          )}
          {activeTag && (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Tag: {activeTag}
            </span>
          )}
          {activeAuthor && (
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              User: {activeAuthor}
            </span>
          )}
        </div>
      )}

      {error && (
        <ErrorMessage message={error} onDismiss={() => setError('')} className="mb-4" />
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create discussion" size="md">
        <form onSubmit={handleCreatePost} className="space-y-4">
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Post title"
            className="bg-white"
            required
          />
          <Textarea
            label="Content"
            rows={4}
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="What would you like to share?"
            className="bg-white"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image (optional)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={(e) => setPostImageFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
            />
            {postImageFile && (
              <p className="mt-1 text-xs text-gray-500">
                {postImageFile.name} ({(postImageFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
          <Input
            label="Tags (comma-separated)"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="health, research"
            className="bg-white"
          />
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={pollEnabled}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setPollEnabled(checked);
                  if (!checked) {
                    setPollQuestion('');
                    setPollOptions(['', '']);
                  }
                }}
                className="h-4 w-4 rounded border border-slate-300 !bg-white accent-[#023047]"
                style={{ backgroundColor: '#ffffff' }}
              />
              Add poll
            </label>
            {pollEnabled && (
              <div className="space-y-3">
                <Input
                  label="Poll question"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="Ask the community something"
                  maxLength={200}
                  className="bg-white"
                  required
                />
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Poll options</label>
                  {pollOptions.map((option, index) => (
                    <div key={`poll-option-${index}`} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const next = [...pollOptions];
                          next[index] = e.target.value;
                          setPollOptions(next);
                        }}
                        placeholder={`Option ${index + 1}`}
                        className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      {pollOptions.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setPollOptions((prev) => prev.filter((_, i) => i !== index))}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-500">Add at least 2 options, up to 6.</p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="bg-white"
                      disabled={pollOptions.length >= 6}
                      onClick={() => setPollOptions((prev) => (prev.length >= 6 ? prev : [...prev, '']))}
                    >
                      + Add option
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="!bg-blue-600 hover:!bg-blue-700 focus:!ring-blue-600">
              {submitting ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </form>
      </Modal>

      {loading ? (
        <div className="space-y-5">
          {[1, 2, 3].map((i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {posts.length === 0 ? (
            <EmptyState
              icon="💬"
              title={activeTab === 'saved' ? 'No saved posts' : 'No posts yet'}
              description={
                activeTab === 'saved'
                  ? 'Save posts from the feed to find them here.'
                  : 'Be the first to start a discussion.'
              }
              action={
                activeTab === 'feed' && (
                  <Button onClick={() => setCreateOpen(true)}>Create post</Button>
                )
              }
            />
          ) : (
            posts.map((post) => (
              <Card key={post._id} className="relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,248,255,0.96))] shadow-[0_24px_60px_-40px_rgba(30,64,175,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_32px_70px_-42px_rgba(30,64,175,0.42)]">
                {post.category && (
                  <span className="absolute left-5 top-5 rounded-full border border-blue-200 bg-blue-50/95 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-800 shadow-sm">
                    {post.category}
                  </span>
                )}
                <div className={`flex flex-wrap items-start justify-between gap-2 ${post.category ? 'mb-4 pt-10' : 'mb-3'}`}>
                  <span className="text-sm text-slate-500">
                    {post.author?.name || 'Unknown'} · {(post.author?.role || '').toLowerCase()}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white/85 px-2.5 py-1 text-[11px] font-medium text-slate-500">{new Date(post.createdAt).toLocaleDateString()}</span>
                  {isAuthor(post) && (
                    <div className="flex gap-2 ml-auto">
                      <Link
                        to={`/community/${post._id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeletePost(post._id)}
                        className="text-sm font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2 tracking-tight leading-tight">
                  <Link to={`/community/${post._id}`} className="hover:text-primary transition-colors">
                    {highlightText(post.title, search)}
                  </Link>
                </h3>
                <p className="mb-4 text-sm leading-7 text-slate-600">
                  {highlightText(post.content.length > 220 ? post.content.slice(0, 220) + '...' : post.content, search)}
                </p>
                {post.poll?.question && Array.isArray(post.poll?.options) && post.poll.options.length > 0 && (
                  <div className="mb-4 rounded-[1.35rem] border border-blue-200 bg-[linear-gradient(180deg,rgba(239,246,255,0.95),rgba(255,255,255,0.96))] p-4 shadow-[0_18px_44px_-32px_rgba(59,130,246,0.5)]">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-lg">🗳️</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-blue-900">{post.poll.question}</p>
                        <p className="text-xs text-blue-600">{post.poll.totalVotes || 0} vote{post.poll.totalVotes === 1 ? '' : 's'}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {post.poll.options.map((opt, idx) => {
                        const isSelected = post.poll.selectedOptionIndex === idx;
                        const label = typeof opt === 'string' ? opt : opt?.text;
                        const voteCount = typeof opt === 'object' ? (opt.voteCount || 0) : 0;
                        const percentage = typeof opt === 'object' ? (opt.percentage || 0) : 0;
                        return (
                          <button
                            key={`poll-opt-${post._id}-${idx}`}
                            type="button"
                            onClick={() => handlePollVote(post._id, idx)}
                            className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all ${
                              isSelected
                                ? 'border-blue-400 bg-white shadow-sm ring-2 ring-blue-100'
                                : 'border-blue-100 bg-white/90 hover:border-blue-300'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-semibold text-blue-900">
                                {isSelected && '✓ '}{label}
                              </span>
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">{percentage}%</span>
                            </div>
                            <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {((post.aiTags && post.aiTags.length > 0) || (post.tags && post.tags.length > 0)) && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.aiTags?.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleTagClick(t)}
                        className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 transition-colors hover:bg-blue-100"
                      >
                        {t}
                      </button>
                    ))}
                    {post.tags?.map((t) => (
                      <button
                        key={'u-' + t}
                        type="button"
                        onClick={() => handleTagClick(t)}
                        className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
                {post.topComment?.content && (
                  <Link
                    to={`/community/${post._id}`}
                    className="mb-4 block rounded-2xl border border-slate-200 bg-white/75 px-4 py-3 transition-colors hover:border-blue-200"
                  >
                    <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
                      Top comment {post.topComment?.author?.name ? `by ${post.topComment.author.name}` : ''}
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {highlightText(String(post.topComment.content).slice(0, 130) + (String(post.topComment.content).length > 130 ? '...' : ''), search)}
                    </p>
                  </Link>
                )}
                <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-200/70 pt-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleLike(post._id, 'up')}
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 transition-colors ${
                        isLiked(post) ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                      title="Like this post"
                    >
                      <Heart size={16} fill={isLiked(post) ? 'currentColor' : 'none'} />
                      <span className="text-xs font-medium">{post.upvoteCount || post.likeCount || 0}</span>
                    </button>
                    <Link
                      to={`/community/${post._id}`}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-600 transition-colors hover:bg-slate-50"
                      title="View comments"
                    >
                      <MessageSquare size={16} />
                      <span className="text-xs font-medium">{post.commentCount || 0}</span>
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleShare(post._id)}
                      className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:bg-slate-50"
                      title="Share this post"
                    >
                      <Share2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSave(post._id, savedIds.has(post._id))}
                      className={`rounded-xl border p-2 transition-colors ${
                        savedIds.has(post._id) ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                      title={savedIds.has(post._id) ? 'Remove from bookmarks' : 'Bookmark this post'}
                    >
                      <Bookmark size={16} fill={savedIds.has(post._id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {total >= 10 && totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3 rounded-[1.5rem] border border-white/70 bg-white/70 px-4 py-6 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.25)] backdrop-blur">
          {totalPages > 3 && (
            <button
              onClick={() => setPageWindowStart(Math.max(1, pageWindowStart - 3))}
              disabled={pageWindowStart === 1 || loading}
              className="btn btn-sm btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous pages"
            >
              ←
            </button>
          )}
          
          <div className="flex gap-2">
            {Array.from({ length: Math.min(3, totalPages - pageWindowStart + 1) }, (_, i) => pageWindowStart + i).map((pageNum) => (
              <button
                key={`page-${pageNum}`}
                onClick={() => {
                  setPage(pageNum);
                  fetchFeed({ newPage: pageNum });
                }}
                disabled={loading}
                className={`btn btn-sm h-12 w-12 rounded-xl border transition-all ${
                  pageNum === page 
                    ? 'btn-active border-blue-600 bg-[linear-gradient(135deg,#2563eb,#1d4ed8)] text-white' 
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                {pageNum}
              </button>
            ))}
          </div>
          
          {totalPages > 3 && pageWindowStart + 2 < totalPages && (
            <button
              onClick={() => setPageWindowStart(Math.min(totalPages - 2, pageWindowStart + 3))}
              disabled={pageWindowStart + 2 >= totalPages || loading}
              className="btn btn-sm btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next pages"
            >
              →
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setChatOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563eb,#1d4ed8)] text-xl text-white shadow-[0_18px_40px_-18px_rgba(37,99,235,0.85)] transition-transform hover:scale-105 hover:bg-[linear-gradient(135deg,#1d4ed8,#1e40af)]"
        aria-label={chatOpen ? 'Close chat' : 'Open AI assistant'}
      >
        {chatOpen ? '✕' : '💬'}
      </button>
      {chatOpen && (
        <div className="fixed bottom-24 right-6 z-40 flex max-h-[70vh] w-full max-w-md flex-col overflow-hidden rounded-[1.6rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,255,0.95))] shadow-[0_32px_80px_-34px_rgba(15,23,42,0.38)] backdrop-blur">
          <div className="flex items-center justify-between bg-[linear-gradient(135deg,#2563eb,#1d4ed8)] px-4 py-3 text-white">
            <h3 className="font-semibold">Community AI Assistant</h3>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              className="p-1 rounded hover:bg-white/20"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="min-h-[200px] flex-1 space-y-3 overflow-y-auto p-4">
            {chatMessages.length === 0 && (
              <p className="text-sm text-slate-500">Ask about health, research, or community.</p>
            )}
            {chatMessages.map((m, i) => (
              <div
                key={i}
                className={`flex flex-col max-w-[90%] ${
                  m.role === 'user' ? 'ml-auto rounded-2xl rounded-br-md bg-blue-50 p-3 text-slate-800' : 'rounded-2xl rounded-bl-md border border-slate-200 bg-white p-3 text-slate-800'
                }`}
              >
                <span className="mb-0.5 text-xs font-semibold text-slate-500">{m.role === 'user' ? 'You' : 'AI'}</span>
                <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
            {chatLoading && (
              <div className="bg-gray-100 rounded-lg rounded-bl-none p-3 max-w-[90%]">
                <p className="text-sm text-gray-600">Thinking…</p>
              </div>
            )}
          </div>
          {chatError && <p className="px-4 text-sm text-red-600">{chatError}</p>}
          <form onSubmit={handleSendChat} className="flex gap-2 border-t border-slate-200 bg-white/80 p-3">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              disabled={chatLoading}
              maxLength={4000}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-transparent focus:ring-2 focus:ring-blue-400 disabled:bg-white"
            />
            <Button type="submit" disabled={chatLoading || !chatInput.trim()} size="md">
              Send
            </Button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Community;
