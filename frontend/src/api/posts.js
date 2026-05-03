import api from './api';

const uploadsBaseUrl = api.defaults.baseURL?.replace(/\/api\/?$/, '') || '';

export const getPosts = (params = {}) => api.get('/posts', { params });
export const getPostSuggestions = (q) => api.get('/posts/suggestions', { params: { q } });
export const getPostById = (id) => api.get(`/posts/${id}`);

/** Create post. If data.imageFile is a File, sends multipart/form-data; otherwise JSON. */
export const createPost = (data) => {
  const imageFile = data && data.imageFile;
  if (imageFile instanceof File) {
    console.log(`�️ [createPost] Image file detected: ${imageFile.name} (${(imageFile.size / 1024).toFixed(1)}KB, type: ${imageFile.type})`);
    const form = new FormData();
    form.append('title', data.title ?? '');
    form.append('content', data.content ?? '');
    if (data.tags != null) {
      form.append('tags', Array.isArray(data.tags) ? data.tags.join(',') : String(data.tags));
    }
    if (data.poll != null) {
      form.append('poll', JSON.stringify(data.poll));
    }
    form.append('image', imageFile);
    console.log(`📤 [createPost] Sending multipart POST to /posts with image file`);
    return api.post('/posts', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => {
      console.log(`✅ [createPost] Post created. Image in response:`, res.data.post?.image || 'null/undefined');
      return res;
    }).catch(err => {
      console.error(`❌ [createPost] Post creation failed:`, err.response?.status, err.response?.data || err.message);
      throw err;
    });
  }
  const { imageFile: _, ...json } = data || {};
  console.log(`📝 [createPost] Sending POST to /posts with JSON (no image)`);
  return api.post('/posts', json);
};

export function getPostImageUrl(imagePath) {
  if (!imagePath) return null;
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  const base = uploadsBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/uploads/${imagePath.startsWith('/') ? imagePath.slice(1) : imagePath}`;
}
export const updatePost = (id, data) => api.put(`/posts/${id}`, data);
export const deletePost = (id) => api.delete(`/posts/${id}`);
export const getSavedPosts = () => api.get('/posts/saved');

export const addComment = (postId, content) => api.post(`/posts/${postId}/comments`, { content });
export const updateComment = (postId, commentId, content) => api.put(`/posts/${postId}/comments/${commentId}`, { content });
export const deleteComment = (postId, commentId) => api.delete(`/posts/${postId}/comments/${commentId}`);

export const likeToggle = (postId, payload = {}) => api.put(`/posts/${postId}/like`, payload);
export const votePoll = (postId, optionIndex) => api.put(`/posts/${postId}/poll/vote`, { optionIndex });
export const sharePost = (postId) => api.post(`/posts/${postId}/share`);
export const savePost = (postId) => api.post(`/posts/${postId}/save`);
export const unsavePost = (postId) => api.delete(`/posts/${postId}/save`);
export const reportPost = (postId, data) => api.post(`/posts/${postId}/report`, data);

// Admin report endpoints
export const getAllReports = (filters = {}) => api.get('/admin/reports', { params: filters });
export const getPostReportDetails = (postId) => api.get(`/admin/reports/${postId}`);
export const banUserForReport = (postId) => api.post(`/admin/reports/${postId}/ban-user`);
export const deleteReportedPost = (postId) => api.delete(`/admin/reports/${postId}`);

/** Community AI chatbot: { message, history?: { role, content }[] } => { reply } */
export const sendChatMessage = (payload) => api.post('/posts/chat', payload);
