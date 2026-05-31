// src/lib/api.ts — REPLACE your entire file
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry && typeof window !== 'undefined') {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const res = await axios.post(`${API_BASE}/auth/refresh/`, { refresh })
          localStorage.setItem('access_token', res.data.access)
          original.headers.Authorization = `Bearer ${res.data.access}`
          return axios(original)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      } else {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

// ── AUTH ──────────────────────────────────────────────────────
export const authAPI = {
  async register(data: {
    email: string; username: string; mobile: string
    password: string; password2: string
  }) {
    const res = await api.post('/auth/register/', data)
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token',  res.data.access)
      localStorage.setItem('refresh_token', res.data.refresh)
    }
    return res.data
  },

  async login(email: string, password: string) {
    const res = await api.post('/auth/login/', { email, password })
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token',  res.data.access)
      localStorage.setItem('refresh_token', res.data.refresh)
    }
    return res.data
  },

  async logout() {
    if (typeof window !== 'undefined') {
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) await api.post('/auth/logout/', { refresh }).catch(() => {})
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }
  },

  async getProfile() {
    const res = await api.get('/auth/profile/')
    return res.data
  },
}

// ── COINS ─────────────────────────────────────────────────────
export const coinsAPI = {
  async getMarket() {
    const res = await api.get('/coins/market/')
    return Array.isArray(res.data) ? res.data : (res.data.results || [])
  },

  async getUsdToInr(): Promise<number> {
    try {
      const res = await api.get('/coins/usd-to-inr/')
      return Number(res.data.usd_to_inr) || 83.5
    } catch {
      return 83.5
    }
  },

  // Called by Refresh button on UI
  async refreshPrices() {
    const res = await api.post('/coins/refresh-prices/')
    return res.data
  },
}

// ── WALLET ────────────────────────────────────────────────────
export const walletAPI = {
  async getWallet() {
    const res = await api.get('/wallet/')
    return Array.isArray(res.data) ? res.data : (res.data.results || [])
  },

  async buyCoin(coinId: number, usdAmount: number) {
    const res = await api.post('/wallet/buy/', { coin_id: coinId, usd_amount: usdAmount })
    return res.data
  },

  async sellCoin(coinId: number, coinAmount: number) {
    const res = await api.post('/wallet/sell/', { coin_id: coinId, coin_amount: coinAmount })
    return res.data
  },

  async convertToInr(usdAmount: number) {
    try {
      const res = await api.post('/wallet/convert-to-inr/', { usd_amount: usdAmount })
      return res.data
    } catch {
      const rate = await coinsAPI.getUsdToInr()
      return { usd_amount: usdAmount, inr_amount: usdAmount * rate, rate }
    }
  },

  async withdrawToInr(usdAmount: number, method: string, bankAccount: string) {
    const res = await api.post('/wallet/withdraw-inr/', {
      usd_amount: usdAmount, method, bank_account: bankAccount,
    })
    return res.data
  },
}

// ── KYC ───────────────────────────────────────────────────────
export const kycAPI = {
  async getStatus() {
    try {
      const res = await api.get('/kyc/status/')
      return res.data
    } catch {
      return { status: 'not_submitted' }
    }
  },

  async submitKYC(formData: FormData) {
    const res = await api.post('/kyc/submit/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },
}

// ── TRANSACTIONS ──────────────────────────────────────────────
export const txAPI = {
  async getHistory() {
    try {
      const res = await api.get('/transactions/')
      return Array.isArray(res.data) ? res.data : (res.data.results || [])
    } catch {
      return []
    }
  },
}

// Add Notification API methods as needed, following the same pattern.

// ADD this to your existing src/lib/api.ts at the bottom

export const notificationsAPI = {
  async getAll() {
    const res = await api.get('/notifications/')
    return Array.isArray(res.data) ? res.data : (res.data.results || [])
  },

  async getUnreadCount(): Promise<number> {
    try {
      const res = await api.get('/notifications/unread-count/')
      return res.data.unread || 0
    } catch {
      return 0
    }
  },

  async markRead(id: number) {
    await api.post(`/notifications/${id}/read/`)
  },

  async markAllRead() {
    await api.post('/notifications/mark-all-read/')
  },
}