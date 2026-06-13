import { req } from './client'

type UserSession = {
  id:           string
  email:        string
  display_name: string
  person_id:    string
  family_id:    string
}

export const auth = {
  checkEmail: (email: string) =>
    req<{ exists: boolean }>('/api/auth/check-email', {
      method: 'POST', body: JSON.stringify({ email }),
    }),

  signup: (b: { email: string; password: string; display_name: string; tree_type?: 'public' | 'private' }) =>
    req<{ token: string; user: UserSession }>('/api/auth/signup', {
      method: 'POST', body: JSON.stringify(b),
    }),

  login: (b: { email: string; password: string }) =>
    req<{ token: string; user: UserSession }>('/api/auth/login', {
      method: 'POST', body: JSON.stringify(b),
    }),

  /** Re-issues a JWT with the correct familyId after a merge transfers the
   *  user to a different family. Call this whenever the graph loads empty. */
  refreshToken: () =>
    req<{ token: string }>('/api/auth/refresh-token', { method: 'POST' }),

  me: () =>
    req<{ id: string; email: string; display_name: string; person_id: string }>('/api/auth/me'),

  changeEmail: (b: { new_email: string; current_password: string }) =>
    req<{ id: string; email: string }>('/api/auth/email', {
      method: 'PATCH', body: JSON.stringify(b),
    }),

  changePassword: (b: { current_password: string; new_password: string }) =>
    req<{ success: boolean }>('/api/auth/password', {
      method: 'PATCH', body: JSON.stringify(b),
    }),

  forgotPassword: (email: string) =>
    req<{ success: boolean }>('/api/auth/forgot-password', {
      method: 'POST', body: JSON.stringify({ email }),
    }),

  resetPassword: (b: { token: string; new_password: string }) =>
    req<{ success: boolean }>('/api/auth/reset-password', {
      method: 'POST', body: JSON.stringify(b),
    }),
}
