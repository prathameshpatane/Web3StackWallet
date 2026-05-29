'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { walletAPI, coinsAPI } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

const METHODS = [
  { id: 'upi',  label: 'UPI Instant',         sub: 'Within 24 hours',    icon: '⚡' },
  { id: 'neft', label: 'Bank Transfer (NEFT)', sub: '1-3 business days', icon: '🏦' },
]

function fmt(n: number, dec = 2) {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: dec, maximumFractionDigits: dec,
  }).format(n)
}

export default function WithdrawPage() {
  const { user, loadUser } = useAuthStore()
  const [method, setMethod]   = useState('upi')
  const [usdAmt, setUsdAmt]   = useState('')   // string to avoid leading zero bug
  const [account, setAccount] = useState('')
  const [usdToInr, setRate]   = useState(83.5)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    coinsAPI.getUsdToInr().then(setRate)
    loadUser()
  }, [])

  const usdBalance  = parseFloat(user?.usd_balance || '0')
  const usdVal      = parseFloat(usdAmt) || 0
  const inrVal      = usdVal * usdToInr
  const fee         = inrVal * 0.002
  const netInr      = inrVal - fee
  const overBalance = usdVal > usdBalance

  // Quick fill buttons — % of balance
  function setPercent(pct: number) {
    const val = (usdBalance * pct)
    setUsdAmt(val.toFixed(2))
  }

  async function submit() {
    setMsg(null)
    if (!usdAmt || usdVal <= 0)  { setMsg({ type: 'err', text: 'Enter a valid amount.' }); return }
    if (overBalance)              { setMsg({ type: 'err', text: `Insufficient balance. You only have $${fmt(usdBalance)} USD.` }); return }
    if (!account.trim())          { setMsg({ type: 'err', text: 'Enter your UPI ID or bank account.' }); return }
    if (usdBalance === 0)         { setMsg({ type: 'err', text: 'Your USD balance is $0.00. You cannot withdraw.' }); return }

    setLoading(true)
    try {
      const res = await walletAPI.withdrawToInr(usdVal, method, account)
      setMsg({ type: 'ok', text: res.message + ` You'll receive ₹${fmt(parseFloat(res.inr_to_receive))}` })
      setUsdAmt('')
      setAccount('')
      await loadUser()
    } catch (err: any) {
      setMsg({ type: 'err', text: err.response?.data?.error || 'Withdrawal failed.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="dash-header">
        <h1 className="dash-header-title">Withdraw Funds</h1>
        <div className="dash-header-right">
          <div className="header-badge">
            💵 Available: ${fmt(usdBalance)} USD
          </div>
          <div className="header-badge">
            ≈ ₹{fmt(usdBalance * usdToInr)}
          </div>
        </div>
      </div>

      <div className="dash-content">

        {/* Zero balance warning */}
        {usdBalance === 0 && (
          <div style={{
            background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)',
            borderRadius: 12, padding: '14px 18px', marginBottom: '1.5rem',
            fontSize: 14, color: 'var(--accent-red)',
          }}>
            ⚠️ Your USD balance is <strong>$0.00</strong>. You need USD cash balance to withdraw.
            Your crypto portfolio value cannot be withdrawn directly — sell your coins first to get USD balance,
            or contact admin to add balance.
          </div>
        )}

        {msg && (
          <div style={{
            background: msg.type === 'ok' ? 'rgba(0,217,126,0.08)' : 'rgba(255,71,87,0.08)',
            border: `1px solid ${msg.type === 'ok' ? 'rgba(0,217,126,0.3)' : 'rgba(255,71,87,0.3)'}`,
            borderRadius: 12, padding: '14px 18px', marginBottom: '1.5rem',
            fontSize: 14, color: msg.type === 'ok' ? 'var(--accent-green)' : 'var(--accent-red)',
          }}>
            {msg.type === 'ok' ? '✅' : '⚠️'} {msg.text}
          </div>
        )}

        <div className="grid-2">
          <div>
            {/* Method */}
            <div className="card mb-2">
              <div className="section-title">Select Method</div>
              {METHODS.map(m => (
                <div key={m.id}
                  className={`withdraw-method${method === m.id ? ' selected' : ''}`}
                  onClick={() => setMethod(m.id)}
                  style={{ cursor: 'pointer' }}
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
                    <div style={{ marginLeft: 'auto', color: 'var(--accent)', fontSize: 20 }}>✓</div>
                  )}
                </div>
              ))}
            </div>

            {/* Amount */}
            <div className="card">
              <div className="form-group">
                <label className="form-label">
                  Amount in USD
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                    {' '}(Available: ${fmt(usdBalance)})
                  </span>
                </label>
                <div className="amount-wrap">
                  <input
                    className="amount-input"
                    type="number"
                    placeholder="0.00"
                    value={usdAmt}
                    onChange={e => setUsdAmt(e.target.value)}
                    max={usdBalance}
                    min={0}
                    style={{
                      fontSize: 18,
                      borderColor: overBalance ? 'var(--accent-red)' : undefined,
                    }}
                  />
                  <span className="amount-curr">$</span>
                </div>
                {overBalance && (
                  <div style={{ color: 'var(--accent-red)', fontSize: 12, marginTop: 4 }}>
                    ⚠️ Exceeds your balance of ${fmt(usdBalance)}
                  </div>
                )}
              </div>

              {/* Quick % buttons */}
              <div className="quick-btns" style={{ marginBottom: '1.25rem' }}>
                {[0.25, 0.5, 0.75, 1].map(pct => (
                  <button key={pct} className="quick-btn"
                    onClick={() => setPercent(pct)}
                    disabled={usdBalance === 0}>
                    {pct * 100}%
                  </button>
                ))}
              </div>

              <div className="form-group">
                <label className="form-label">
                  {method === 'upi' ? 'UPI ID' : 'Bank Account Number'}
                </label>
                <input
                  className="form-input"
                  type="text"
                  placeholder={method === 'upi' ? 'yourname@upi' : 'XXXX XXXX XXXX 4321'}
                  value={account}
                  onChange={e => setAccount(e.target.value)}
                />
              </div>

              {method === 'neft' && (
                <div className="form-group">
                  <label className="form-label">IFSC Code</label>
                  <input className="form-input" type="text" placeholder="SBIN0001234" />
                </div>
              )}

              {/* Summary */}
              {usdVal > 0 && !overBalance && (
                <div className="order-summary">
                  <div className="order-row">
                    <span>Withdraw Amount (USD)</span>
                    <span>${fmt(usdVal)}</span>
                  </div>
                  <div className="order-row">
                    <span>Exchange Rate</span>
                    <span>1 USD = ₹{fmt(usdToInr)}</span>
                  </div>
                  <div className="order-row">
                    <span>Gross INR</span>
                    <span>₹{fmt(inrVal)}</span>
                  </div>
                  <div className="order-row">
                    <span>Processing Fee (0.2%)</span>
                    <span>₹{fmt(fee)}</span>
                  </div>
                  <hr className="order-divider" />
                  <div className="order-row">
                    <span style={{ fontWeight: 600 }}>You&apos;ll Receive</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent-green)', fontSize: 18 }}>
                      ₹{fmt(netInr)}
                    </span>
                  </div>
                </div>
              )}

              <button
                className="btn-primary"
                onClick={submit}
                disabled={loading || usdBalance === 0 || overBalance || usdVal <= 0}
                style={{ opacity: (loading || usdBalance === 0 || overBalance) ? 0.6 : 1 }}
              >
                {loading ? 'Submitting...' : 'Submit Withdrawal'}
              </button>

              <div style={{ marginTop: '0.75rem', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                💡 Crypto portfolio value ≠ USD balance. To withdraw crypto value,
                sell coins first via <Link href="/buy-sell" style={{ color: 'var(--accent)' }}>Buy/Sell page</Link>.
              </div>
            </div>
          </div>

          {/* Info panel */}
          <div className="card">
            <div className="section-title">Balance Breakdown</div>

            <div style={{ marginBottom: '1.5rem' }}>
              {[
                {
                  label: '💵 Cash (USD)',
                  value: `$${fmt(usdBalance)}`,
                  sub:   `≈ ₹${fmt(usdBalance * usdToInr)}`,
                  color: usdBalance > 0 ? 'var(--accent-green)' : 'var(--text-muted)',
                  note:  'This is withdrawable',
                },
                {
                  label: '📊 Crypto Portfolio',
                  value: 'See Wallet page',
                  sub:   'Not directly withdrawable',
                  color: 'var(--text-muted)',
                  note:  'Sell coins first to get USD balance',
                },
              ].map(item => (
                <div key={item.label} style={{
                  background: 'var(--bg)', borderRadius: 10,
                  padding: '1rem', marginBottom: '0.75rem',
                }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.sub}</div>
                  <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4 }}>{item.note}</div>
                </div>
              ))}
            </div>

            <div style={{
              background: 'rgba(0,229,255,0.07)',
              border: '1px solid rgba(0,229,255,0.15)',
              borderRadius: 10, padding: '1rem',
              fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7,
            }}>
              <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>How to get USD balance</div>
              <div>1. Admin adds USD balance to your account</div>
              <div>2. Or: sell your crypto coins (coming soon)</div>
              <div>3. Then withdraw here as INR</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}