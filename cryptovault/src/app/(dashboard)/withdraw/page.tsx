'use client'
import { useState } from 'react'

const METHODS = [
  { id: 'upi',   label: 'UPI Instant',           sub: 'Within minutes',       icon: '⚡' },
  { id: 'neft',  label: 'Bank Transfer (NEFT)',   sub: '1-3 business days',    icon: '🏦' },
  { id: 'crypto',label: 'Crypto Withdrawal',      sub: 'On-chain transfer',    icon: '🌐' },
]

const HISTORY = [
  { date: '15 May 2025', amount: '₹10,000', method: 'UPI',  status: 'pending' },
  { date: '10 May 2025', amount: '₹25,000', method: 'NEFT', status: 'success' },
  { date: '02 May 2025', amount: '₹15,000', method: 'NEFT', status: 'success' },
]

export default function WithdrawPage() {
  const [method, setMethod]   = useState('upi')
  const [amount, setAmount]   = useState(10000)
  const [submitted, setSubmitted] = useState(false)

  const fee    = 15
  const payout = amount - fee

  function submit() {
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 4000)
  }

  return (
    <>
      <div className="dash-header">
        <h1 className="dash-header-title">Withdraw Funds</h1>
        <div className="dash-header-right">
          <div className="header-badge">Available: ₹82,500</div>
        </div>
      </div>

      <div className="dash-content">
        {submitted && (
          <div style={{
            background: 'rgba(0,217,126,0.08)', border: '1px solid rgba(0,217,126,0.25)',
            borderRadius: '12px', padding: '14px 18px', marginBottom: '1.5rem',
            fontSize: '14px', color: 'var(--accent-green)', fontWeight: 500,
          }}>
            ✅ Withdrawal request of ₹{amount.toLocaleString('en-IN')} submitted successfully!
          </div>
        )}

        <div className="grid-2">
          <div>
            {/* Method picker */}
            <div className="card mb-2">
              <div className="section-title">Select Method</div>
              {METHODS.map(m => (
                <div
                  key={m.id}
                  className={`withdraw-method${method === m.id ? ' selected' : ''}`}
                  onClick={() => setMethod(m.id)}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, background: 'var(--card2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  }}>
                    {m.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{m.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.sub}</div>
                  </div>
                  {method === m.id && (
                    <div style={{ marginLeft: 'auto', color: 'var(--accent)', fontSize: 18 }}>✓</div>
                  )}
                </div>
              ))}
            </div>

            {/* Amount + details */}
            <div className="card">
              <div className="form-group">
                <label className="form-label">Amount (INR)</label>
                <div className="amount-wrap">
                  <input
                    className="amount-input"
                    type="number"
                    value={amount}
                    onChange={e => setAmount(Number(e.target.value))}
                    style={{ fontSize: 18 }}
                  />
                  <span className="amount-curr">₹</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                  Min: ₹100 · Max: ₹2,00,000/day
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {method === 'upi' ? 'UPI ID' : method === 'neft' ? 'Bank Account Number' : 'Wallet Address'}
                </label>
                <input
                  className="form-input"
                  type="text"
                  placeholder={
                    method === 'upi' ? 'yourname@upi' :
                    method === 'neft' ? 'XXXX XXXX XXXX 4321' :
                    '0x... or bc1...'
                  }
                />
              </div>

              {method === 'neft' && (
                <div className="form-group">
                  <label className="form-label">IFSC Code</label>
                  <input className="form-input" type="text" placeholder="SBIN0001234" />
                </div>
              )}

              <div className="order-summary">
                <div className="order-row">
                  <span>Withdrawal Amount</span>
                  <span>₹{amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="order-row">
                  <span>Processing Fee</span>
                  <span>₹{fee}</span>
                </div>
                <hr className="order-divider" />
                <div className="order-row">
                  <span style={{ fontWeight: 600 }}>You&apos;ll Receive</span>
                  <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>
                    ₹{payout.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <button className="btn btn-primary" onClick={submit}>
                Submit Withdrawal
              </button>
            </div>
          </div>

          {/* History */}
          <div className="card">
            <div className="section-title">Withdrawal History</div>
            {HISTORY.map((h, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', padding: '13px 0',
                borderBottom: i < HISTORY.length - 1 ? '1px solid rgba(30,45,69,0.4)' : 'none',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--mono)' }}>
                    {h.amount}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {h.date} · {h.method}
                  </div>
                </div>
                <span className={`badge ${h.status === 'success' ? 'badge-green' : 'badge-amber'}`}>
                  {h.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}