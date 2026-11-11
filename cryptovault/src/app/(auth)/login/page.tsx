'use client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { coinsAPI } from '@/lib/api'

interface TickerCoin {
  sym: string
  pair: string
  price: string
  change: number
  icon: string
  color: string
}

const DEFAULT_TICKERS: TickerCoin[] = [
  { sym: 'BTC', pair: 'BTC/USD', price: '$74,182.00', change: 1.71, icon: '₿', color: '#f7931a' },
  { sym: 'ETH', pair: 'ETH/USD', price: '$2,074.83', change: 2.78, icon: 'Ξ', color: '#627eea' },
  { sym: 'SOL', pair: 'SOL/USD', price: '$84.68', change: 3.39, icon: '◎', color: '#9945ff' },
]

function formatUsd(val: number): string {
  if (val < 1) return `$${val.toFixed(4)}`
  return `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)}`
}

export default function LoginPage() {
  const router = useRouter()
  const { login, loading, error, clearError } = useAuthStore()

  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [rememberMe, setRememberMe]   = useState(false)
  const [showPass, setShowPass]       = useState(false)
  const [emailErr, setEmailErr]       = useState('')
  const [passErr, setPassErr]         = useState('')
  const [tickers, setTickers]         = useState<TickerCoin[]>(DEFAULT_TICKERS)

  // Load remembered email and live coin prices on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cryptovault_remember_email')
      if (saved) {
        setEmail(saved)
        setRememberMe(true)
      }
    } catch {
      // localStorage may be unavailable in private browsing
    }

    let isMounted = true
    coinsAPI.getMarket()
      .then((coins) => {
        if (!isMounted || !Array.isArray(coins) || coins.length === 0) return

        setTickers((prev) =>
          prev.map((item) => {
            const found = coins.find(
              (c: any) => (c.symbol || '').toUpperCase() === item.sym
            )
            if (!found) return item

            const p = parseFloat(found.current_price_usd)
            const ch = parseFloat(found.price_change_24h_pct)
            return {
              ...item,
              price: !isNaN(p) ? formatUsd(p) : item.price,
              change: !isNaN(ch) ? ch : item.change,
            }
          })
        )
      })
      .catch(() => {
        // Retain DEFAULT_TICKERS graceful fallback
      })

    return () => {
      isMounted = false
    }
  }, [])

  async function handleLogin(e?: FormEvent) {
    if (e) e.preventDefault()
    setEmailErr('')
    setPassErr('')
    clearError()

    let valid = true
    const cleanEmail = email.trim()
    if (!cleanEmail || !/\S+@\S+\.\S+/.test(cleanEmail)) {
      setEmailErr('Enter a valid email address')
      valid = false
    }
    if (password.length < 6) {
      setPassErr('Password must be at least 6 characters')
      valid = false
    }
    if (!valid) return

    try {
      if (rememberMe) {
        try { localStorage.setItem('cryptovault_remember_email', cleanEmail) } catch {}
      } else {
        try { localStorage.removeItem('cryptovault_remember_email') } catch {}
      }

      await login(cleanEmail, password)
      router.push('/dashboard')
    } catch {
      // error is automatically set in useAuthStore
    }
  }

  return (
    <div className="auth-page">
      {/* LEFT BRAND PANEL */}
      <div className="auth-left">
        <div className="auth-logo">
          <div className="logo-icon">₿</div>
          <span className="logo-text">CryptoVault</span>
        </div>

        <div className="auth-brand">
          <h1 className="auth-headline">Trade crypto<br />with <span>confidence</span></h1>
          <p className="auth-sub">Buy, sell and manage crypto with live USD prices and instant INR conversion.</p>
          <div className="stats-row">
            <div className="stat-item"><span className="stat-value">20+</span><span className="stat-label">Live Coins</span></div>
            <div className="stat-item"><span className="stat-value">USD</span><span className="stat-label">Live Prices</span></div>
            <div className="stat-item"><span className="stat-value">INR</span><span className="stat-label">Withdraw</span></div>
          </div>
        </div>

        {/* LIVE COIN TICKER */}
        <div className="coin-ticker">
          {tickers.map((c) => (
            <div className="ticker-item" key={c.sym}>
              <div
                className="ticker-coin"
                style={{ background: c.color + '22', color: c.color }}
              >
                {c.icon}
              </div>
              <div className="ticker-info">
                <div className="ticker-name">{c.pair}</div>
                <div className="ticker-price">{c.price}</div>
              </div>
              <div className={`ticker-change ${c.change >= 0 ? 'up' : 'down'}`}>
                {c.change >= 0 ? '▲ +' : '▼ '}
                {Math.abs(c.change).toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT SIGN-IN FORM */}
      <div className="auth-right">
        <div className="auth-form-wrap">
          <h2 className="auth-title">Welcome back</h2>
          <p className="auth-desc">Sign in to your CryptoVault account</p>

          {/* Backend error banner */}
          {error && (
            <div style={{
              background: 'rgba(255,71,87,0.1)',
              border: '1px solid rgba(255,71,87,0.3)',
              borderRadius: 10,
              padding: '12px 16px',
              marginBottom: '1.25rem',
              fontSize: 13,
              color: 'var(--accent-red)',
              lineHeight: 1.5,
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin} noValidate>
            <div className="form-group fade-up">
              <label className="form-label" htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                name="email"
                autoComplete="email"
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {emailErr && <p className="form-error" style={{ display: 'block' }}>{emailErr}</p>}
            </div>

            <div className="form-group fade-up delay-1">
              <label className="form-label" htmlFor="login-password">Password</label>
              <div className="input-wrap">
                <input
                  id="login-password"
                  name="password"
                  autoComplete="current-password"
                  className="form-input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  className="input-icon-right"
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  {showPass ? (
                    <EyeOff size={16} style={{ color: 'var(--text-muted)' }} />
                  ) : (
                    <Eye size={16} style={{ color: 'var(--text-muted)' }} />
                  )}
                </button>
              </div>
              {passErr && <p className="form-error" style={{ display: 'block' }}>{passErr}</p>}
            </div>

            <div className="check-row fade-up delay-2">
              <label className="checkbox-label" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                /> Remember me
              </label>
              <Link href="/forgot-password" className="form-link">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className={`btn btn-primary fade-up delay-3${loading ? ' btn-loading' : ''}`}
              disabled={loading}
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="auth-switch fade-up delay-4">
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
