// src/store/authStore.ts
import { create } from 'zustand'
import { authAPI } from '@/lib/api'

interface User {
  id: number
  email: string
  username: string
  mobile: string
  usd_balance: string
  is_kyc_verified: boolean
  kyc_status: string
  date_joined: string
}

interface AuthStore {
  user: User | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean

  login:    (email: string, password: string) => Promise<void>
  register: (data: { email: string; username: string; mobile: string; password: string; password2: string }) => Promise<void>
  logout:   () => Promise<void>
  loadUser: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user:            null,
  loading:         false,
  error:           null,
  isAuthenticated: typeof window !== 'undefined' && !!localStorage.getItem('access_token'),

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      await authAPI.login(email, password)
      const user = await authAPI.getProfile()
      set({ user, isAuthenticated: true, loading: false })
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.email?.[0] || 'Login failed.'
      set({ error: msg, loading: false })
      throw err
    }
  },

  register: async (data) => {
    set({ loading: true, error: null })
    try {
      await authAPI.register(data)
      const user = await authAPI.getProfile()
      set({ user, isAuthenticated: true, loading: false })
    } catch (err: any) {
      const errors = err.response?.data
      const msg = errors?.email?.[0] || errors?.password?.[0] || errors?.detail || 'Registration failed.'
      set({ error: msg, loading: false })
      throw err
    }
  },

  logout: async () => {
    await authAPI.logout()
    set({ user: null, isAuthenticated: false })
  },

  loadUser: async () => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('access_token')
    if (!token) { set({ isAuthenticated: false }); return }
    try {
      const user = await authAPI.getProfile()
      set({ user, isAuthenticated: true })
    } catch {
      localStorage.clear()
      set({ user: null, isAuthenticated: false })
    }
  },

  clearError: () => set({ error: null }),
}))