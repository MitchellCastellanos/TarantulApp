import api from './api'
import publicApi from './publicApi'

/** Feed publico (Bearer opcional: likedByMe si hay sesion). */
const communityService = {
  publicFeed: (page = 0, size = 20) =>
    publicApi.get('/public/community/feed', { params: { page, size } }).then((r) => r.data),
  publicFeedByTopic: (topicKey, page = 0, size = 20) =>
    publicApi.get(`/public/community/topics/${encodeURIComponent(topicKey)}/posts`, { params: { page, size } }).then((r) => r.data),
  publicPostById: (postId) =>
    publicApi.get(`/public/community/posts/${postId}`).then((r) => r.data),
  publicComments: (postId) =>
    publicApi.get(`/public/community/posts/${postId}/comments`).then((r) => r.data),

  createPost: (payload) => api.post('/community/posts', payload).then((r) => r.data),

  myPosts: (page = 0, size = 20) =>
    api.get('/community/posts/mine', { params: { page, size } }).then((r) => r.data),

  deletePost: (postId) => api.delete(`/community/posts/${postId}`).then((r) => r.data),

  toggleLike: (postId) => api.post(`/community/posts/${postId}/like`).then((r) => r.data),

  getComments: (postId) => api.get(`/community/posts/${postId}/comments`).then((r) => r.data),

  addComment: (postId, body) =>
    api.post(`/community/posts/${postId}/comments`, { body }).then((r) => r.data),

  listLikes: (postId, limit = 40) =>
    publicApi.get(`/public/community/posts/${postId}/likes`, { params: { limit } }).then((r) => r.data),

  deleteComment: (commentId) =>
    api.delete(`/community/comments/${commentId}`).then((r) => r.data),

  uploadPostPhoto: (file) => {
    const form = new FormData()
    form.append('file', file, file.name || 'community-post.jpg')
    return api.post('/community/posts/photo', form).then((r) => r.data)
  },

  uploadPostMedia: (file) => {
    const form = new FormData()
    form.append('file', file, file.name || 'community-post-media')
    return api.post('/community/posts/media', form).then((r) => r.data)
  },
}

export default communityService
