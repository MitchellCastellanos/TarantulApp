import publicApi from './publicApi'

const userPublicService = {
  /** @param {string} handle */
  byHandle: (handle) =>
    publicApi.get(`public/users/by-handle/${encodeURIComponent(handle.trim())}`).then((r) => r.data),
}

export default userPublicService
