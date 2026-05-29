import api from './api'

const authService = {
  changePassword: (payload) => api.post('/auth/change-password', payload).then(r => r.data),
  deleteAccount: (payload) => api.post('/auth/delete-account', payload).then((r) => r.data),
  acceptBetaAgreement: (accepted = true) =>
    api.post('/auth/beta-agreement', { accepted }).then((r) => r.data),
  oauthGoogle: (idToken, referralCode) =>
    api.post('/auth/oauth/google', { idToken, referralCode: referralCode || undefined }).then((r) => r.data),
  // Sign in with Apple. `identityToken` is the JWT from AppleID/StoreKit; `fullName` is only
  // returned by Apple on the very first authorization, so the backend must persist it then.
  oauthApple: ({ identityToken, fullName, referralCode }) =>
    api
      .post('/auth/oauth/apple', {
        identityToken,
        fullName: fullName || undefined,
        referralCode: referralCode || undefined,
      })
      .then((r) => r.data),
}

export default authService
