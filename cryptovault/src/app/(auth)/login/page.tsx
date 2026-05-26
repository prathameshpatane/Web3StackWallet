'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const router = useRouter()
  const { login, loading, error, clearError } = useAuthStore()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [emailErr, setEmailErr] = useState('')
  const [passErr, setPassErr]   = useState('')

  async function handleLogin() {
    setEmailErr('')
    setPassErr('')
    clearError()

    let valid = true
    if (!email || !/\S+@\S+\.\S+/.test(email)) { setEmailErr('Enter a valid email'); valid = false }
    if (password.length < 6) { setPassErr('Password must be at least 6 characters'); valid = false }
    if (!valid) return

    try {
      await login(email, password)
      router.push('/dashboard')
    } catch {
      // error shown from store
    }
  }

  return (
    <div className="auth-page">
      {/* LEFT */}
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
        <div className="coin-ticker">
          {[
            { sym: 'BTC/USD', price: 'Loading...', icon: '₿', color: '#f7931a' },
            { sym: 'ETH/USD', price: 'Loading...', icon: 'Ξ', color: '#627eea' },
            { sym: 'SOL/USD', price: 'Loading...', icon: '◎', color: '#9945ff' },
          ].map(c => (
            <div className="ticker-item" key={c.sym}>
              <div className="ticker-coin" style={{ background: c.color + '22', color: c.color }}>{c.icon}</div>
              <div className="ticker-info">
                <div className="ticker-name">{c.sym}</div>
                <div className="ticker-price">{c.price}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT */}
      <div className="auth-right">
        <div className="auth-form-wrap">
          <h2 className="auth-title">Welcome back</h2>
          <p className="auth-desc">Sign in to your CryptoVault account</p>

          {/* Backend error */}
          {error && (
            <div style={{
              background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)',
              borderRadius: 10, padding: '12px 16px', marginBottom: '1.25rem',
              fontSize: 13, color: 'var(--accent-red)',
            }}>
              ⚠️ {error}
            </div>
          )}

          <div className="form-group fade-up">
            <label className="form-label">Email address</label>
            <input className="form-input" type="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            {emailErr && <p className="form-error" style={{ display: 'block' }}>{emailErr}</p>}
          </div>

          <div className="form-group fade-up delay-1">
            <label className="form-label">Password</label>
            <div className="input-wrap">
              <input className="form-input" type={showPass ? 'text' : 'password'}
                placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()} />
              <button className="input-icon-right" type="button" onClick={() => setShowPass(p => !p)}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
            {passErr && <p className="form-error" style={{ display: 'block' }}>{passErr}</p>}
          </div>

          <div className="check-row fade-up delay-2">
            <label className="checkbox-label"><input type="checkbox" /> Remember me</label>
            <span className="form-link" onClick={() => router.push('/forgot-password')}>Forgot password?</span>
          </div>

          <button
            className={`btn btn-primary fade-up delay-3${loading ? ' btn-loading' : ''}`}
            onClick={handleLogin} disabled={loading}
          >
            {loading ? '' : 'Sign In'}
          </button>

          <p className="auth-switch fade-up delay-4">
            Don&apos;t have an account? <span onClick={() => router.push('/register')}>Create one free</span>
          </p>
        </div>
      </div>
    </div>
  )
}