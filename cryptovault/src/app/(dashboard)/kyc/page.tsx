'use client'
import { useState } from 'react'

export default function KYCPage() {
  const [aadhaarNum, setAadhaarNum] = useState('')
  const [panNum, setPanNum]         = useState('')
  const [submitted, setSubmitted]   = useState(false)

  return (
    <>
      <div className="dash-header">
        <h1 className="dash-header-title">KYC Verification</h1>
        <div className="dash-header-right">
          <span className="badge badge-amber">⏳ Pending</span>
        </div>
      </div>

      <div className="dash-content">
        {/* Warning banner */}
        <div style={{
          background: 'rgba(255,184,0,0.07)', border: '1px solid rgba(255,184,0,0.2)',
          borderRadius: '12px', padding: '14px 18px', marginBottom: '1.5rem',
          fontSize: '13px', color: 'var(--accent-amber)',
        }}>
          ⚠️ Complete all 4 verification steps to unlock withdrawals and increase trading limits.
        </div>

        {submitted ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: 56, marginBottom: '1rem' }}>🚀</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>KYC Submitted!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              Your documents are under review. This usually takes 24–48 hours.
            </p>
          </div>
        ) : (
          <div className="grid-2">
            <div>

              {/* Step 1 — Personal Info (done) */}
              <div className="card-sm" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="kyc-step-num done">✓</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Personal Information</div>
                    <div style={{ fontSize: 12, color: 'var(--accent-green)' }}>Completed</div>
                  </div>
                </div>
              </div>

              {/* Step 2 — Aadhaar */}
              <div className="card-sm" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
                  <div className="kyc-step-num active">2</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Aadhaar Card Verification</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Upload front &amp; back of your Aadhaar</div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Aadhaar Number</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="XXXX XXXX XXXX"
                    maxLength={14}
                    value={aadhaarNum}
                    onChange={e => setAadhaarNum(e.target.value)}
                  />
                </div>

                <div className="grid-2" style={{ gap: 8 }}>
                  <div className="kyc-upload">
                    <div style={{ fontSize: 28, marginBottom: 6, opacity: 0.4 }}>🪪</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Front Side<br />
                      <span style={{ color: 'var(--accent)' }}>Click to upload</span>
                    </div>
                  </div>
                  <div className="kyc-upload">
                    <div style={{ fontSize: 28, marginBottom: 6, opacity: 0.4 }}>🪪</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Back Side<br />
                      <span style={{ color: 'var(--accent)' }}>Click to upload</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 — PAN */}
              <div className="card-sm" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
                  <div className="kyc-step-num" style={{ color: 'var(--text-dim)' }}>3</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>PAN Card Verification</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Upload your PAN card</div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">PAN Number</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    value={panNum}
                    onChange={e => setPanNum(e.target.value.toUpperCase())}
                  />
                </div>

                <div className="kyc-upload">
                  <div style={{ fontSize: 28, marginBottom: 6, opacity: 0.4 }}>📄</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    PAN Card<br />
                    <span style={{ color: 'var(--accent)' }}>Click to upload</span>
                  </div>
                </div>
              </div>

              {/* Step 4 — Selfie */}
              <div className="card-sm" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
                  <div className="kyc-step-num" style={{ color: 'var(--text-dim)' }}>4</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Selfie Verification</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Take a live selfie to verify identity</div>
                  </div>
                </div>
                <div className="kyc-upload">
                  <div style={{ fontSize: 28, marginBottom: 6, opacity: 0.4 }}>🤳</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Take a selfie<br />
                    <span style={{ color: 'var(--accent)' }}>Open camera</span>
                  </div>
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => setSubmitted(true)}
              >
                Submit for Verification
              </button>
            </div>

            {/* Status panel */}
            <div className="card">
              <div className="section-title">Verification Status</div>

              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div style={{ fontSize: 56, marginBottom: '1rem' }}>🔒</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Pending Verification</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Complete all 4 steps to get verified
                </div>

                {/* Progress bar */}
                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                    <span>Progress</span>
                    <span style={{ color: 'var(--accent)' }}>25%</span>
                  </div>
                  <div style={{ background: 'var(--border)', borderRadius: 4, height: 6 }}>
                    <div style={{ width: '25%', background: 'var(--accent)', height: '100%', borderRadius: 4 }} />
                  </div>
                </div>

                {/* Steps */}
                {[
                  { label: 'Personal Info', done: true  },
                  { label: 'Aadhaar Card', done: false  },
                  { label: 'PAN Card',     done: false  },
                  { label: 'Selfie',       done: false  },
                ].map(s => (
                  <div key={s.label} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 0', fontSize: 13,
                    opacity: s.done ? 1 : 0.5,
                    borderBottom: '1px solid rgba(30,45,69,0.3)',
                  }}>
                    <span>{s.done ? '✅' : '⏳'}</span>
                    <span>{s.label}</span>
                    {s.done && <span className="badge badge-green" style={{ marginLeft: 'auto' }}>Done</span>}
                  </div>
                ))}
              </div>

              {/* Limits */}
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: '0.75rem' }}>
                  Current Limits
                </div>
                {[
                  { label: 'Daily Buy Limit',      val: '₹10,000',  locked: false },
                  { label: 'Daily Sell Limit',     val: '₹5,000',   locked: false },
                  { label: 'Withdrawal',           val: 'Locked 🔒', locked: true  },
                  { label: 'After KYC — Buy',      val: '₹10 Lakh', locked: false },
                  { label: 'After KYC — Withdraw', val: 'Unlimited', locked: false },
                ].map(l => (
                  <div key={l.label} style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: 12, padding: '5px 0', color: 'var(--text-muted)',
                  }}>
                    <span>{l.label}</span>
                    <span style={{ color: l.locked ? 'var(--accent-red)' : 'var(--text)' }}>{l.val}</span>
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