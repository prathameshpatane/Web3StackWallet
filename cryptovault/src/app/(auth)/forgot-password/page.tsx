'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [sent, setSent]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [emailErr, setEmailErr] = useState(false)

  function handleReset() {
    setEmailErr(false)
    if (!email || !/\S+@\S+\.\S+/.test(email)) { setEmailErr(true); return }
    setLoading(true)
    setTimeout(() => { setLoading(false); setSent(true) }, 1200)
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-logo">
          <div className="logo-icon">₿</div>
          <span className="logo-text">CryptoVault</span>
        </div>
        <div className="auth-brand">
          <h1 className="auth-headline">
            Forgot your<br /><span>password?</span>
          </h1>
          <p className="auth-sub">
            No worries — it happens. Enter your registered email and
            we&apos;ll send a secure reset link right away.
          </p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrap">
          {!sent ? (
            <>
              <button
                onClick={() => router.push('/login')}
                style={{
                  background: 'none', border: 'none', color: 'var(--text-muted)',
                  cursor: 'pointer', fontSize: '13px', display: 'flex',
                  alignItems: 'center', gap: '6px', marginBottom: '1.5rem', padding: 0,
                }}
              >
                ← Back to login
              </button>

              <h2 className="auth-title">Reset password</h2>
              <p className="auth-desc">We&apos;ll send a reset link to your email</p>

              <div className="form-group fade-up">
                <label className="form-label">Email address</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleReset()}
                />
                {emailErr && (
                  <p className="form-error" style={{ display: 'block' }}>
                    Please enter a valid email address
                  </p>
                )}
              </div>

              <button
                className={`btn btn-primary fade-up delay-1${loading ? ' btn-loading' : ''}`}
                onClick={handleReset}
                disabled={loading}
              >
                {loading ? '' : 'Send Reset Link'}
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center', paddingTop: '2rem' }}>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📧</div>
              <h2 className="auth-title">Check your inbox</h2>
              <p className="auth-desc" style={{ marginBottom: '2rem' }}>
                We&apos;ve sent a password reset link to{' '}
                <strong style={{ color: 'var(--accent)' }}>{email}</strong>
              </p>
              <button
                className="btn btn-secondary"
                onClick={() => router.push('/login')}
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}