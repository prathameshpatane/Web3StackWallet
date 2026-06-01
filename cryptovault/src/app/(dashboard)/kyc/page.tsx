'use client'
import { useEffect, useState } from 'react'
import { kycAPI } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

interface KYCStatus {
  id: number | null
  status: 'not_submitted' | 'pending' | 'approved' | 'rejected'
  full_name?: string
  aadhaar_number?: string
  pan_number?: string
  rejection_reason?: string
  submitted_at?: string
}

export default function KYCPage() {
  const { user, loadUser } = useAuthStore()

  // Form fields — no images
  const [fullName,     setFullName]     = useState('')
  const [dob,          setDob]          = useState('')
  const [aadhaarNum,   setAadhaarNum]   = useState('')
  const [panNum,       setPanNum]       = useState('')

  const [kycData,      setKycData]      = useState<KYCStatus | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState('')

  // ── Load current KYC status on mount ──────────────────────
  useEffect(() => {
    fetchStatus()
  }, [])

  async function fetchStatus() {
    setLoading(true)
    try {
      const data = await kycAPI.getStatus()
      setKycData(data)
      // Pre-fill form if already submitted
      if (data?.full_name)      setFullName(data.full_name)
      if (data?.aadhaar_number) setAadhaarNum(data.aadhaar_number)
      if (data?.pan_number)     setPanNum(data.pan_number)
    } catch {
      setKycData({ id: null, status: 'not_submitted' })
    } finally {
      setLoading(false)
    }
  }

  // ── Submit KYC ─────────────────────────────────────────────
  async function handleSubmit() {
    setError('')

    if (!fullName.trim())   { setError('Full name is required'); return }
    if (!aadhaarNum.trim()) { setError('Aadhaar number is required'); return }
    if (aadhaarNum.replace(/\s/g, '').length !== 12) {
      setError('Aadhaar number must be 12 digits'); return
    }
    if (!panNum.trim())     { setError('PAN number is required'); return }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNum)) {
      setError('Invalid PAN format (e.g. ABCDE1234F)'); return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('full_name',      fullName.trim())
      formData.append('date_of_birth',  dob || '')
      formData.append('aadhaar_number', aadhaarNum.replace(/\s/g, ''))
      formData.append('pan_number',     panNum.trim())

      await kycAPI.submitKYC(formData)
      await fetchStatus()   // refresh status from backend
      await loadUser()      // refresh user in auth store
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Derived ────────────────────────────────────────────────
  const status   = kycData?.status || 'not_submitted'
  const isVerified  = status === 'approved'
  const isPending   = status === 'pending'
  const isRejected  = status === 'rejected'
  const notSubmitted = status === 'not_submitted'
  const canSubmit   = notSubmitted || isRejected

  // ── Status badge ───────────────────────────────────────────
  const STATUS_UI = {
    not_submitted: { icon: '🔒', label: 'Not Submitted', color: 'var(--text-muted)', bg: 'var(--card)' },
    pending:       { icon: '⏳', label: 'Under Review',  color: 'var(--accent-amber)', bg: 'rgba(255,184,0,0.08)' },
    approved:      { icon: '✅', label: 'Verified',       color: 'var(--accent-green)', bg: 'rgba(0,217,126,0.08)' },
    rejected:      { icon: '❌', label: 'Rejected',       color: 'var(--accent-red)',   bg: 'rgba(255,71,87,0.08)' },
  }
  const ui = STATUS_UI[status]

  if (loading) {
    return (
      <div className="dash-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading KYC status...</div>
      </div>
    )
  }

  return (
    <>
      <div className="dash-header">
        <h1 className="dash-header-title">KYC Verification</h1>
        <div className="dash-header-right">
          <span style={{
            background: ui.bg, color: ui.color,
            border: `1px solid ${ui.color}40`,
            borderRadius: 8, padding: '6px 14px',
            fontSize: 13, fontWeight: 600,
          }}>
            {ui.icon} {ui.label}
          </span>
        </div>
      </div>

      <div className="dash-content">

        {/* ── APPROVED STATE ── */}
        {isVerified && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: 64, marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-green)', marginBottom: 8 }}>
              KYC Verified!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: '1.5rem' }}>
              Your identity has been verified. You have full access to all features.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { label: 'Full Name',      value: kycData?.full_name || user?.username || '—' },
                { label: 'Aadhaar',        value: `XXXX XXXX ${(kycData?.aadhaar_number || '').slice(-4) || '****'}` },
                { label: 'PAN',            value: kycData?.pan_number || '—' },
              ].map(item => (
                <div key={item.label} style={{
                  background: 'var(--bg)', borderRadius: 10, padding: '12px 20px', minWidth: 140,
                }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PENDING STATE ── */}
        {isPending && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: 64, marginBottom: '1rem' }}>⏳</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Under Review</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7 }}>
              Your KYC documents are being reviewed by our team.<br />
              This usually takes <strong>24–48 hours</strong>.
            </p>
            <div style={{
              display: 'inline-flex', gap: 24, marginTop: '1.5rem',
              background: 'var(--bg)', borderRadius: 10, padding: '1rem 2rem',
            }}>
              {[
                { label: 'Full Name', value: kycData?.full_name },
                { label: 'Aadhaar',   value: `****${(kycData?.aadhaar_number || '').slice(-4)}` },
                { label: 'PAN',       value: kycData?.pan_number },
              ].map(item => (
                <div key={item.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{item.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{item.value || '—'}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FORM — not submitted or rejected ── */}
        {canSubmit && (
          <div className="grid-2">
            <div>

              {/* Rejection notice */}
              {isRejected && kycData?.rejection_reason && (
                <div style={{
                  background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.25)',
                  borderRadius: 12, padding: '14px 18px', marginBottom: '1.25rem',
                  fontSize: 13, color: 'var(--accent-red)',
                }}>
                  ❌ <strong>Rejection reason:</strong> {kycData.rejection_reason}
                  <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>
                    Please correct the details and resubmit.
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={{
                  background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.25)',
                  borderRadius: 10, padding: '12px 16px', marginBottom: '1.25rem',
                  fontSize: 13, color: 'var(--accent-red)',
                }}>
                  ⚠️ {error}
                </div>
              )}

              {/* ── STEP 1: Personal Info ── */}
              <div className="card-sm" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
                  <div className="kyc-step-num active">1</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Personal Information</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Enter your legal name and date of birth</div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Full Name (as on Aadhaar) *</label>
                  <input className="form-input" type="text"
                    placeholder="e.g. Rahul Kumar Sharma"
                    value={fullName} onChange={e => setFullName(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input className="form-input" type="date"
                    value={dob} onChange={e => setDob(e.target.value)} />
                </div>
              </div>

              {/* ── STEP 2: Aadhaar ── */}
              <div className="card-sm" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
                  <div className="kyc-step-num active">2</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Aadhaar Card</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Enter your 12-digit Aadhaar number</div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Aadhaar Number *</label>
                  <input className="form-input" type="text"
                    placeholder="XXXX XXXX XXXX"
                    maxLength={14}
                    value={aadhaarNum}
                    onChange={e => {
                      // Auto-format with spaces: 1234 5678 9012
                      const raw = e.target.value.replace(/\D/g, '').slice(0, 12)
                      const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
                      setAadhaarNum(formatted)
                    }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Your Aadhaar number is encrypted and stored securely.
                  </div>
                </div>
              </div>

              {/* ── STEP 3: PAN ── */}
              <div className="card-sm" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
                  <div className="kyc-step-num active">3</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>PAN Card</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Enter your 10-character PAN number</div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">PAN Number *</label>
                  <input className="form-input" type="text"
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    value={panNum}
                    onChange={e => setPanNum(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Format: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F)
                  </div>
                </div>
              </div>

              <button
                className="btn-buy"
                onClick={handleSubmit}
                disabled={submitting}
                style={{ opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? 'Submitting...' : isRejected ? 'Resubmit for Verification' : 'Submit for Verification →'}
              </button>
            </div>

            {/* ── Right: info panel ── */}
            <div className="card">
              <div className="section-title">Why KYC?</div>

              <div style={{ textAlign: 'center', padding: '1rem 0 1.5rem' }}>
                <div style={{ fontSize: 52, marginBottom: '0.75rem' }}>🛡️</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Secure &amp; Compliant</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  KYC verification keeps your account safe and compliant with Indian regulations (PMLA).
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                {[
                  { icon: '🔐', title: 'Data Security',    desc: 'Your details are encrypted with AES-256' },
                  { icon: '📋', title: 'RBI Compliant',    desc: 'Required for crypto trading in India' },
                  { icon: '⚡', title: 'Fast Review',      desc: 'Verified within 24-48 hours' },
                  { icon: '🚀', title: 'Unlock Features',  desc: 'Withdrawals enabled after verification' },
                ].map(item => (
                  <div key={item.title} style={{
                    display: 'flex', gap: 12, padding: '10px 0',
                    borderBottom: '1px solid rgba(30,45,69,0.3)',
                  }}>
                    <span style={{ fontSize: 20 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '1rem' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>After Verification</div>
                {[
                  { label: 'Withdrawals',    val: 'Unlocked ✅' },
                  { label: 'Daily Buy',      val: 'Up to ₹10L' },
                  { label: 'Daily Sell',     val: 'Up to ₹10L' },
                  { label: 'Priority Support', val: 'Enabled ✅' },
                ].map(l => (
                  <div key={l.label} style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: 12, padding: '5px 0', color: 'var(--text-muted)',
                    borderBottom: '1px solid rgba(30,45,69,0.2)',
                  }}>
                    <span>{l.label}</span>
                    <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{l.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}