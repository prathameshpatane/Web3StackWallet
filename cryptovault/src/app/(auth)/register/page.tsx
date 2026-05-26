'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'

export default function RegisterPage() {
  const router = useRouter()
  const { register, loading, error, clearError } = useAuthStore()

  const [form, setForm] = useState({ firstName: '', lastName: '', mobile: '', email: '', password: '', password2: '' })
  const [showPass, setShowPass]   = useState(false)
  const [confirmErr, setConfirmErr] = useState('')
  const [agreed, setAgreed]       = useState(false)

  function getStrength(p: string) {
    return [p.length >= 8, /[A-Z]/.test(p), /[0-9]/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length
  }
  const strengthColors = ['', '#ff4d6a', '#ffd166', '#00c8ff', '#00e5a0']
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const strength = getStrength(form.password)

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleRegister() {
    setConfirmErr('')
    clearError()
    if (form.password !== form.password2) { setConfirmErr('Passwords do not match'); return }
    if (!agreed) { setConfirmErr('You must agree to the terms'); return }

    try {
      await register({
        email:     form.email,
        username:  form.firstName.toLowerCase() + form.lastName.toLowerCase(),
        mobile:    form.mobile,
        password:  form.password,
        password2: form.password2,
      })
      router.push('/dashboard')
    } catch { /* error shown from store */ }
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-logo">
          <div className="logo-icon">₿</div>
          <span className="logo-text">CryptoVault</span>
        </div>
        <div className="auth-brand">
          <h1 className="auth-headline">Start your<br />crypto <span>journey</span></h1>
          <p className="auth-sub">Join CryptoVault. Trade with live USD prices, withdraw to INR instantly.</p>
          <div className="stats-row">
            <div className="stat-item"><span className="stat-value">0%</span><span className="stat-label">Signup Fee</span></div>
            <div className="stat-item"><span className="stat-value">0.1%</span><span className="stat-label">Trade Fee</span></div>
            <div className="stat-item"><span className="stat-value">24/7</span><span className="stat-label">Support</span></div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrap">
          <h2 className="auth-title">Create account</h2>
          <p className="auth-desc">Get started in under 2 minutes</p>

          {error && (
            <div style={{
              background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)',
              borderRadius: 10, padding: '12px 16px', marginBottom: '1.25rem',
              fontSize: 13, color: 'var(--accent-red)',
            }}>
              ⚠️ {error}
            </div>
          )}

          <div className="form-row fade-up" style={{ marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">First name</label>
              <input className="form-input" type="text" placeholder="Sneha"
                value={form.firstName} onChange={e => update('firstName', e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Last name</label>
              <input className="form-input" type="text" placeholder="Sharma"
                value={form.lastName} onChange={e => update('lastName', e.target.value)} />
            </div>
          </div>

          <div className="form-group fade-up delay-1">
            <label className="form-label">Mobile number</label>
            <input className="form-input" type="tel" placeholder="+91 98765 43210"
              value={form.mobile} onChange={e => update('mobile', e.target.value)} />
          </div>

          <div className="form-group fade-up delay-1">
            <label className="form-label">Email address</label>
            <input className="form-input" type="email" placeholder="you@example.com"
              value={form.email} onChange={e => update('email', e.target.value)} />
          </div>

          <div className="form-group fade-up delay-2">
            <label className="form-label">Password</label>
            <div className="input-wrap">
              <input className="form-input" type={showPass ? 'text' : 'password'}
                placeholder="Min. 8 characters" value={form.password}
                onChange={e => update('password', e.target.value)} />
              <button className="input-icon-right" type="button" onClick={() => setShowPass(p => !p)}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>

          {/* Strength bar */}
          <div className="fade-up delay-2" style={{ marginTop: '-12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{
                  height: 3, flex: 1, borderRadius: 3,
                  background: i <= strength ? strengthColors[strength] : 'var(--border)',
                  transition: 'background 0.3s',
                }} />
              ))}
            </div>
            <span style={{ fontSize: 11, color: strength > 0 ? strengthColors[strength] : 'var(--text-muted)' }}>
              {form.password ? strengthLabels[strength] : 'Password strength'}
            </span>
          </div>

          <div className="form-group fade-up delay-3">
            <label className="form-label">Confirm password</label>
            <input className="form-input" type="password" placeholder="Repeat password"
              value={form.password2} onChange={e => update('password2', e.target.value)} />
            {confirmErr && <p className="form-error" style={{ display: 'block' }}>{confirmErr}</p>}
          </div>

          <label className="checkbox-label fade-up delay-3" style={{ marginBottom: 20 }}>
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
            I agree to the <a href="#" style={{ color: 'var(--accent-green)', marginLeft: 3 }}>Terms</a>
            {' '}&amp;{' '}
            <a href="#" style={{ color: 'var(--accent-green)' }}>Privacy Policy</a>
          </label>

          <button
            className={`btn btn-primary fade-up delay-4${loading ? ' btn-loading' : ''}`}
            onClick={handleRegister} disabled={loading}
          >
            {loading ? '' : 'Create Account'}
          </button>

          <p className="auth-switch fade-up delay-5">
            Already have an account? <span onClick={() => router.push('/login')}>Sign in</span>
          </p>
        </div>
      </div>
    </div>
  )
}