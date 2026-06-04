'use client'
import { useEffect, useState } from 'react'
import { coinsAPI, walletAPI } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'

interface Coin {
  id: number; symbol: string; name: string; image_url: string
  current_price_usd: number; price_change_24h_pct: string; usd_to_inr_rate: number
}
interface WalletEntry {
  id: number; balance: string; value_in_usd: number
  coin: { id: number; symbol: string; name: string; current_price_usd: number }
}
interface PaymentSettings {
  upi_id: string; upi_name: string; phone_number: string
  qr_image_url: string | null; payment_note: string; is_active: boolean
  bank_name: string; bank_branch: string; account_holder_name: string
  account_number: string; ifsc_code: string
}
interface BuyRequest {
  id: number; coin_symbol: string; coin_name: string
  usd_amount: string; inr_amount: string; coin_quantity: string
  transaction_id: string; status: 'pending' | 'approved' | 'rejected'
  admin_note: string; created_at: string
}

type BuyStep = 'select' | 'payment' | 'upload' | 'done'
type PayTab  = 'upi' | 'bank'

function fmt(n: number, dec = 2) {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n)
}

function timeAgo(d: string) {
  const diff  = Date.now() - new Date(d).getTime()
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export default function BuySellPage() {
  const { user, loadUser } = useAuthStore()

  const [tab, setTab]       = useState<'buy' | 'sell' | 'history'>('buy')
  const [payTab, setPayTab] = useState<PayTab>('upi')
  const [coins, setCoins]   = useState<Coin[]>([])
  const [wallet, setWallet] = useState<WalletEntry[]>([])
  const [coinId, setCoinId] = useState<number>(0)
  const [loading, setLoading] = useState(false)

  // Buy
  const [usdAmt, setUsdAmt]       = useState(100)
  const [buyStep, setBuyStep]     = useState<BuyStep>('select')
  const [txId, setTxId]           = useState('')
  const [requestId, setRequestId] = useState<number | null>(null)
  const [buyError, setBuyError]   = useState('')

  // Sell
  const [coinAmt, setCoinAmt] = useState('')
  const [sellMsg, setSellMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // History
  const [buyRequests, setBuyRequests] = useState<BuyRequest[]>([])

  // Payment settings from backend
  const [pmt, setPmt] = useState<PaymentSettings>({
    upi_id: '', upi_name: 'CryptoVault', phone_number: '',
    qr_image_url: null, payment_note: '', is_active: true,
    bank_name: '', bank_branch: '', account_holder_name: '',
    account_number: '', ifsc_code: '',
  })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      const [c, w] = await Promise.all([coinsAPI.getMarket(), walletAPI.getWallet()])
      setCoins(c)
      setWallet(w)
      if (c.length && !coinId) setCoinId(c[0].id)
    } catch (e) { console.error(e) }

    try {
      const res = await api.get('/wallet/payment-settings/')
      setPmt(res.data)
    } catch (e) { console.error('Payment settings error:', e) }

    try {
      const res = await api.get('/wallet/buy-requests/')
      const data = Array.isArray(res.data) ? res.data : (res.data.results || [])
      setBuyRequests(data)
    } catch (e) { console.error('Buy requests error:', e) }
  }

  // Derived
  const coin     = coins.find(c => c.id === coinId)
  const priceUsd = coin ? Number(coin.current_price_usd) : 0
  const rate     = coin ? Number(coin.usd_to_inr_rate) || 83.5 : 83.5
  const fee      = usdAmt * 0.001
  const totalUsd = usdAmt + fee
  const totalInr = totalUsd * rate
  const coinQty  = priceUsd > 0 ? usdAmt / priceUsd : 0

  const holding = wallet.find(w => w.coin.id === coinId)
  const holdBal = holding ? parseFloat(holding.balance) : 0
  const sellQty = parseFloat(coinAmt) || 0
  const sellUsd = sellQty * priceUsd
  const sellNet = sellUsd - (sellUsd * 0.001)

  const usdBalance = parseFloat(String(user?.usd_balance || '0'))
  const upiLink    = `upi://pay?pa=${pmt.upi_id}&pn=${encodeURIComponent(pmt.upi_name)}&am=${Math.round(totalInr)}&cu=INR`

  const pendingCount = buyRequests.filter(r => r.status === 'pending').length

  async function submitBuyRequest() {
    if (!txId.trim()) { setBuyError('Please enter the Transaction ID / UTR'); return }
    if (!coinId)      { setBuyError('No coin selected'); return }

    setLoading(true); setBuyError('')
    try {
      const res = await api.post('/wallet/buy/', {
        coin_id:        coinId,
        usd_amount:     usdAmt,
        inr_amount:     Math.round(totalInr),
        transaction_id: txId.trim(),
      })
      setRequestId(res.data.id)
      setBuyStep('done')
      fetchAll()
    } catch (err: any) {
      setBuyError(err.response?.data?.error || 'Submission failed. Please try again.')
    } finally { setLoading(false) }
  }

  async function executeSell() {
    if (sellQty <= 0)      { setSellMsg({ type: 'err', text: 'Enter coin amount.' }); return }
    if (sellQty > holdBal) { setSellMsg({ type: 'err', text: `Insufficient ${coin?.symbol}. You have ${holdBal.toFixed(6)}.` }); return }

    setLoading(true); setSellMsg(null)
    try {
      const res = await walletAPI.sellCoin(coinId, sellQty)
      setSellMsg({ type: 'ok', text: res.message + ` $${res.usd_received} added to your balance.` })
      setCoinAmt('')
      await Promise.all([fetchAll(), loadUser()])
    } catch (err: any) {
      setSellMsg({ type: 'err', text: err.response?.data?.error || 'Sell failed.' })
    } finally { setLoading(false) }
  }

  function resetBuy() {
    setBuyStep('select'); setTxId(''); setRequestId(null); setBuyError('')
  }

  const hasBankDetails = pmt.account_number && pmt.account_holder_name

  return (
    <>
      <div className="dash-header">
        <h1 className="dash-header-title">
          {tab === 'buy' ? 'Buy Crypto' : tab === 'sell' ? 'Sell Crypto' : 'Order History'}
        </h1>
        <div className="dash-header-right">
          <div className="header-badge">💵 ${fmt(usdBalance)}</div>
          {pendingCount > 0 && (
            <div className="header-badge" style={{ background: 'rgba(255,184,0,0.15)', color: 'var(--accent-amber)', cursor: 'pointer' }}
              onClick={() => setTab('history')}>
              ⏳ {pendingCount} pending
            </div>
          )}
        </div>
      </div>

      <div className="dash-content">

        {/* ── TABS ── */}
        <div className="buysell-tabs" style={{ marginBottom: '1.5rem', maxWidth: 400 }}>
          {[
            { key: 'buy',     label: '🛒 Buy'   },
            { key: 'sell',    label: '💰 Sell'  },
            { key: 'history', label: `📋 Orders${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
          ].map(t => (
            <button key={t.key}
              className={`bs-tab${tab === t.key ? ' active' : ''}`}
              onClick={() => { setTab(t.key as any); setSellMsg(null) }}
              style={{ flex: 1 }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════ ORDER HISTORY TAB ══════ */}
        {tab === 'history' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div className="section-title">Buy Request History</div>
              <button className="quick-btn" onClick={fetchAll}>🔄 Refresh</button>
            </div>

            {buyRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                No buy requests yet.
              </div>
            ) : (
              <div>
                {buyRequests.map(r => (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--border)',
                    background: r.status === 'pending' ? 'rgba(255,184,0,0.03)' : 'transparent',
                  }}>
                    {/* Icon */}
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: r.status === 'approved' ? 'rgba(0,217,126,0.1)' :
                                  r.status === 'rejected' ? 'rgba(255,71,87,0.1)' : 'rgba(255,184,0,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
                    }}>
                      {r.status === 'approved' ? '✅' : r.status === 'rejected' ? '❌' : '⏳'}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
                        {parseFloat(r.coin_quantity).toFixed(6)} {r.coin_symbol}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Paid ₹{fmt(parseFloat(r.inr_amount))} · TxID: {r.transaction_id}
                      </div>
                      {r.admin_note && r.status === 'rejected' && (
                        <div style={{ fontSize: 12, color: 'var(--accent-red)', marginTop: 2 }}>
                          Reason: {r.admin_note}
                        </div>
                      )}
                    </div>

                    {/* Status + time */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px',
                        borderRadius: 20, marginBottom: 4, display: 'inline-block',
                        background: r.status === 'approved' ? 'rgba(0,217,126,0.15)' :
                                    r.status === 'rejected' ? 'rgba(255,71,87,0.15)' : 'rgba(255,184,0,0.15)',
                        color: r.status === 'approved' ? 'var(--accent-green)' :
                               r.status === 'rejected' ? 'var(--accent-red)' : 'var(--accent-amber)',
                      }}>
                        {r.status.toUpperCase()}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                        {timeAgo(r.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pending info */}
            {pendingCount > 0 && (
              <div style={{
                marginTop: '1rem',
                background: 'rgba(255,184,0,0.07)', border: '1px solid rgba(255,184,0,0.2)',
                borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'var(--accent-amber)',
              }}>
                ⏳ You have {pendingCount} pending request(s). Admin will verify within 1-4 hours.
                Once approved, coins will appear in your Wallet automatically.
              </div>
            )}
          </div>
        )}

        {/* ══════ BUY TAB ══════ */}
        {tab === 'buy' && (
          <>
            {/* Step indicator */}
            {buyStep !== 'done' && (
              <div style={{ display: 'flex', alignItems: 'center', maxWidth: 480, marginBottom: '2rem' }}>
                {['Select Coin', 'Make Payment', 'Submit Proof'].map((s, i) => {
                  const keys: BuyStep[] = ['select', 'payment', 'upload']
                  const idx = keys.indexOf(buyStep)
                  const done = idx > i; const active = idx === i
                  return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: done ? 'var(--accent-green)' : active ? 'linear-gradient(135deg,var(--accent),var(--accent2))' : 'var(--border)',
                          color: (done || active) ? '#000' : 'var(--text-dim)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 13,
                        }}>
                          {done ? '✓' : i + 1}
                        </div>
                        <div style={{ fontSize: 11, marginTop: 4, whiteSpace: 'nowrap', color: active ? 'var(--text)' : 'var(--text-dim)' }}>
                          {s}
                        </div>
                      </div>
                      {i < 2 && <div style={{ height: 2, flex: 1, marginBottom: 20, background: done ? 'var(--accent-green)' : 'var(--border)' }} />}
                    </div>
                  )
                })}
              </div>
            )}

            {/* STEP 1 — SELECT */}
            {buyStep === 'select' && (
              <div className="grid-2">
                <div className="card">
                  <div className="section-title">Choose Coin &amp; Amount</div>

                  <div className="form-group">
                    <label className="form-label">Select Cryptocurrency</label>
                    <select className="coin-select" value={coinId}
                      onChange={e => setCoinId(Number(e.target.value))}>
                      {coins.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.symbol}) — ${Number(c.current_price_usd) < 1
                            ? Number(c.current_price_usd).toFixed(4)
                            : fmt(Number(c.current_price_usd))}
                        </option>
                      ))}
                    </select>
                  </div>

                  {coin && (
                    <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 12, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                      {coin.image_url && <img src={coin.image_url} alt={coin.name} style={{ width: 38, height: 38, borderRadius: '50%' }} />}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{coin.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          ${priceUsd < 1 ? priceUsd.toFixed(6) : fmt(priceUsd)} · ≈ ₹{fmt(priceUsd * rate)}
                        </div>
                      </div>
                      <span className={`badge ${parseFloat(coin.price_change_24h_pct) >= 0 ? 'badge-green' : 'badge-red'}`}>
                        {parseFloat(coin.price_change_24h_pct) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(coin.price_change_24h_pct)).toFixed(2)}%
                      </span>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Amount in USD</label>
                    <div className="amount-wrap">
                      <input className="amount-input" type="number"
                        value={usdAmt} onChange={e => setUsdAmt(Number(e.target.value))} min={10} />
                      <span className="amount-curr">$ USD</span>
                    </div>
                  </div>
                  <div className="quick-btns">
                    {[50, 100, 500, 1000].map(v => (
                      <button key={v} className="quick-btn" onClick={() => setUsdAmt(v)}>${v}</button>
                    ))}
                  </div>

                  <div className="order-summary">
                    <div className="order-row"><span>Coin Price</span><span>${priceUsd < 1 ? priceUsd.toFixed(6) : fmt(priceUsd)}</span></div>
                    <div className="order-row">
                      <span>You'll Receive</span>
                      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{coinQty.toFixed(6)} {coin?.symbol}</span>
                    </div>
                    <div className="order-row"><span>Fee (0.1%)</span><span>${fee.toFixed(4)}</span></div>
                    <hr className="order-divider" />
                    <div className="order-row">
                      <span style={{ fontWeight: 600 }}>Pay (INR)</span>
                      <span style={{ fontWeight: 700, color: 'var(--accent-green)', fontSize: 18 }}>₹{fmt(totalInr)}</span>
                    </div>
                  </div>

                  <button className="btn-buy" onClick={() => setBuyStep('payment')} disabled={!coinId || usdAmt < 10}>
                    Proceed to Payment →
                  </button>
                </div>

                {/* Coin list */}
                <div className="card">
                  <div className="section-title">Available Coins</div>
                  <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                    {coins.map(c => {
                      const p = Number(c.current_price_usd); const ch = parseFloat(c.price_change_24h_pct)
                      return (
                        <div key={c.id} onClick={() => setCoinId(c.id)} style={{
                          display: 'flex', alignItems: 'center', padding: '10px 8px',
                          borderBottom: '1px solid rgba(30,45,69,0.4)', cursor: 'pointer',
                          background: coinId === c.id ? 'rgba(0,229,255,0.05)' : 'transparent', borderRadius: 8,
                        }}>
                          {c.image_url && <img src={c.image_url} alt={c.name} style={{ width: 30, height: 30, borderRadius: '50%', marginRight: 10 }} />}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.symbol}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 13, fontFamily: 'var(--mono)', fontWeight: 600 }}>
                              ${p < 1 ? p.toFixed(4) : fmt(p)}
                            </div>
                            <span className={`badge ${ch >= 0 ? 'badge-green' : 'badge-red'}`}>
                              {ch >= 0 ? '▲' : '▼'} {Math.abs(ch).toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 — PAYMENT */}
            {buyStep === 'payment' && (
              <div className="grid-2">
                <div className="card">
                  <div className="section-title">Make Payment</div>

                  {/* Amount */}
                  <div style={{
                    background: 'linear-gradient(135deg,rgba(0,229,255,0.1),rgba(124,58,237,0.1))',
                    border: '1px solid rgba(0,229,255,0.2)',
                    borderRadius: 12, padding: '1.25rem', textAlign: 'center', marginBottom: '1.5rem',
                  }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Pay exactly this amount</div>
                    <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--accent-green)' }}>₹{fmt(totalInr)}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                      {coinQty.toFixed(6)} {coin?.symbol} · ${fmt(totalUsd)}
                    </div>
                  </div>

                  {/* Payment method tabs */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem' }}>
                    {[
                      { key: 'upi',  label: '📱 UPI' },
                      ...(hasBankDetails ? [{ key: 'bank', label: '🏦 Bank Transfer' }] : []),
                    ].map(t => (
                      <button key={t.key}
                        onClick={() => setPayTab(t.key as PayTab)}
                        style={{
                          flex: 1, padding: '10px', borderRadius: 8, fontWeight: 600, fontSize: 13,
                          border: `1px solid ${payTab === t.key ? 'var(--accent)' : 'var(--border)'}`,
                          background: payTab === t.key ? 'rgba(0,229,255,0.08)' : 'var(--card)',
                          color: payTab === t.key ? 'var(--accent)' : 'var(--text-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* UPI Details */}
                  {payTab === 'upi' && (
                    <div style={{ marginBottom: '1.25rem' }}>
                      {pmt.upi_id ? (
                        <>
                          {[
                            { label: 'UPI ID',    value: pmt.upi_id,       copy: true  },
                            { label: 'Name',      value: pmt.upi_name,     copy: false },
                            { label: 'Phone',     value: pmt.phone_number, copy: true  },
                          ].filter(x => x.value).map(item => (
                            <div key={item.label} style={{
                              background: 'var(--bg)', borderRadius: 8, padding: '10px 14px',
                              marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}>
                              <div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.label}</div>
                                <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--mono)' }}>{item.value}</div>
                              </div>
                              {item.copy && (
                                <button onClick={() => navigator.clipboard.writeText(item.value)}
                                  style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
                                  Copy
                                </button>
                              )}
                            </div>
                          ))}
                          <a href={upiLink} style={{
                            display: 'block', textAlign: 'center',
                            background: 'var(--accent-green)', color: '#fff',
                            textDecoration: 'none', borderRadius: 10, padding: '12px',
                            fontWeight: 700, fontSize: 15, marginTop: 12,
                          }}>
                            📱 Open UPI App to Pay
                          </a>
                        </>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: 13 }}>
                          ⚠️ UPI details not set yet. Admin: go to Admin Panel → Payment Settings.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bank Transfer Details */}
                  {payTab === 'bank' && hasBankDetails && (
                    <div style={{ marginBottom: '1.25rem' }}>
                      {[
                        { label: 'Account Holder', value: pmt.account_holder_name, copy: false },
                        { label: 'Account Number', value: pmt.account_number,       copy: true  },
                        { label: 'IFSC Code',      value: pmt.ifsc_code,            copy: true  },
                        { label: 'Bank Name',      value: pmt.bank_name,            copy: false },
                        { label: 'Branch',         value: pmt.bank_branch,          copy: false },
                      ].filter(x => x.value).map(item => (
                        <div key={item.label} style={{
                          background: 'var(--bg)', borderRadius: 8, padding: '10px 14px',
                          marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.label}</div>
                            <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--mono)' }}>{item.value}</div>
                          </div>
                          {item.copy && (
                            <button onClick={() => navigator.clipboard.writeText(item.value)}
                              style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
                              Copy
                            </button>
                          )}
                        </div>
                      ))}
                      <div style={{
                        background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.15)',
                        borderRadius: 10, padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)', marginTop: 8,
                      }}>
                        💡 Transfer type: NEFT / IMPS / RTGS · Amount: ₹{fmt(totalInr)}
                      </div>
                    </div>
                  )}

                  {pmt.payment_note && (
                    <div style={{
                      background: 'rgba(255,184,0,0.07)', border: '1px solid rgba(255,184,0,0.2)',
                      borderRadius: 10, padding: '10px 12px', fontSize: 12, color: 'var(--accent-amber)',
                      lineHeight: 1.6, marginBottom: '1rem',
                    }}>
                      ⚠️ {pmt.payment_note} Include your email: <strong>{user?.email}</strong>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="quick-btn" style={{ flex: 1 }} onClick={() => setBuyStep('select')}>← Back</button>
                    <button className="btn-buy" style={{ flex: 2 }} onClick={() => setBuyStep('upload')}>
                      I've Paid → Submit Proof
                    </button>
                  </div>
                </div>

                {/* QR */}
                <div className="card" style={{ textAlign: 'center' }}>
                  <div className="section-title" style={{ justifyContent: 'center' }}>Scan QR Code</div>
                  {pmt.qr_image_url ? (
                    <>
                      <img src={pmt.qr_image_url} alt="QR"
                        style={{ width: 220, height: 220, borderRadius: 12, border: '2px solid var(--border)', objectFit: 'contain', background: '#fff', margin: '0 auto 1rem' }} />
                      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        Scan with GPay, PhonePe, Paytm, or BHIM
                      </p>
                    </>
                  ) : (
                    <div style={{
                      width: 200, height: 200, margin: '0 auto 1rem',
                      background: 'var(--bg)', border: '2px dashed var(--border)',
                      borderRadius: 12, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', flexDirection: 'column', gap: 8,
                    }}>
                      <div style={{ fontSize: 36 }}>📷</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '0 16px' }}>
                        No QR yet.<br />Admin → Payment Settings → Upload QR
                      </div>
                    </div>
                  )}

                  <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '1rem', fontSize: 13 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>Order Summary</div>
                    <div style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Buying</span><span>{coinQty.toFixed(6)} {coin?.symbol}</span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Pay</span><span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>₹{fmt(totalInr)}</span>
                    </div>
                    {payTab === 'upi' && pmt.upi_id && (
                      <div style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>UPI ID</span><span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{pmt.upi_id}</span>
                      </div>
                    )}
                    {payTab === 'bank' && pmt.account_number && (
                      <div style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Account</span><span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>...{pmt.account_number.slice(-4)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 — UPLOAD PROOF */}
            {buyStep === 'upload' && (
              <div style={{ maxWidth: 560, margin: '0 auto' }}>
                <div className="card">
                  <div className="section-title">Submit Payment Proof</div>

                  {buyError && (
                    <div style={{
                      background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.25)',
                      borderRadius: 10, padding: '12px 16px', marginBottom: '1.25rem',
                      fontSize: 13, color: 'var(--accent-red)',
                    }}>
                      ⚠️ {buyError}
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Transaction ID / UTR Number *</label>
                    <input className="form-input" type="text"
                      placeholder="e.g. 123456789012 or UTR123456"
                      value={txId} onChange={e => setTxId(e.target.value)} />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      Find this in your UPI app or bank statement under payment history
                    </div>
                  </div>

                  <div className="order-summary" style={{ marginBottom: '1.25rem' }}>
                    <div className="order-row"><span>Buying</span><span>{coinQty.toFixed(6)} {coin?.symbol}</span></div>
                    <div className="order-row">
                      <span>Amount Paid</span>
                      <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>₹{fmt(totalInr)}</span>
                    </div>
                    <div className="order-row"><span>USD Value</span><span>${fmt(totalUsd)}</span></div>
                  </div>

                  <div style={{
                    background: 'rgba(0,217,126,0.07)', border: '1px solid rgba(0,217,126,0.2)',
                    borderRadius: 10, padding: '12px 14px',
                    fontSize: 12, color: 'var(--accent-green)', marginBottom: '1.25rem', lineHeight: 1.6,
                  }}>
                    ✅ Admin will verify your Transaction ID and add {coinQty.toFixed(6)} {coin?.symbol} to your wallet within 1-4 hours.
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="quick-btn" style={{ flex: 1 }} onClick={() => setBuyStep('payment')}>← Back</button>
                    <button className="btn-buy" style={{ flex: 2, opacity: loading ? 0.7 : 1 }}
                      onClick={submitBuyRequest} disabled={loading}>
                      {loading ? 'Submitting...' : 'Submit for Verification →'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4 — DONE */}
            {buyStep === 'done' && (
              <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
                <div className="card">
                  <div style={{ fontSize: 64, marginBottom: '1rem' }}>🎉</div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Request Submitted!</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: '1.5rem', lineHeight: 1.7 }}>
                    Admin will verify your payment and add{' '}
                    <strong style={{ color: 'var(--accent)' }}>{coinQty.toFixed(6)} {coin?.symbol}</strong>{' '}
                    to your wallet within <strong>1-4 hours</strong>.
                  </p>

                  {requestId && (
                    <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '1rem', marginBottom: '1.5rem', fontSize: 13 }}>
                      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Request ID</div>
                      <div style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--accent)', fontSize: 18 }}>
                        #CVR{String(requestId).padStart(6, '0')}
                      </div>
                    </div>
                  )}

                  <div style={{
                    background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.15)',
                    borderRadius: 10, padding: '1rem', fontSize: 13, color: 'var(--text-muted)',
                    marginBottom: '1.5rem', lineHeight: 1.8, textAlign: 'left',
                  }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>What happens next?</div>
                    <div>1. Admin reviews your Transaction ID</div>
                    <div>2. Payment verified against records</div>
                    <div>3. {coin?.symbol} added to your wallet automatically</div>
                    <div>4. Check Orders tab or Wallet to confirm</div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="quick-btn" style={{ flex: 1 }} onClick={() => setTab('history')}>
                      📋 View Orders
                    </button>
                    <button className="btn-buy" style={{ flex: 1 }} onClick={resetBuy}>
                      Buy More
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════ SELL TAB ══════ */}
        {tab === 'sell' && (
          <div className="grid-2">
            <div className="card">
              <div className="section-title">Sell Cryptocurrency</div>

              {sellMsg && (
                <div style={{
                  background: sellMsg.type === 'ok' ? 'rgba(0,217,126,0.08)' : 'rgba(255,71,87,0.08)',
                  border: `1px solid ${sellMsg.type === 'ok' ? 'rgba(0,217,126,0.3)' : 'rgba(255,71,87,0.3)'}`,
                  borderRadius: 12, padding: '14px 18px', marginBottom: '1.5rem',
                  fontSize: 14, color: sellMsg.type === 'ok' ? 'var(--accent-green)' : 'var(--accent-red)',
                }}>
                  {sellMsg.text}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Select Coin to Sell</label>
                <select className="coin-select" value={coinId}
                  onChange={e => { setCoinId(Number(e.target.value)); setCoinAmt(''); setSellMsg(null) }}>
                  {coins.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.symbol}) — ${Number(c.current_price_usd) < 1
                        ? Number(c.current_price_usd).toFixed(4) : fmt(Number(c.current_price_usd))}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 12, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                {coin?.image_url && <img src={coin.image_url} alt={coin.name} style={{ width: 38, height: 38, borderRadius: '50%' }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Your Holdings</div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--mono)' }}>
                    {holdBal.toFixed(6)} {coin?.symbol || '—'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>≈ ${fmt(holdBal * priceUsd)}</div>
                </div>
                {holdBal === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--accent-red)' }}>No {coin?.symbol} in wallet</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Amount to Sell ({coin?.symbol})</label>
                <div className="amount-wrap">
                  <input className="amount-input" type="number"
                    placeholder="0.000000" value={coinAmt}
                    onChange={e => { setCoinAmt(e.target.value); setSellMsg(null) }}
                    max={holdBal} min={0} step="any" />
                  <span className="amount-curr">{coin?.symbol}</span>
                </div>
              </div>

              <div className="quick-btns">
                {[{ label: '25%', pct: 0.25 }, { label: '50%', pct: 0.50 }, { label: '75%', pct: 0.75 }, { label: 'MAX', pct: 1 }].map(({ label, pct }) => (
                  <button key={label} className="quick-btn"
                    onClick={() => { setCoinAmt((holdBal * pct).toFixed(8)); setSellMsg(null) }}
                    disabled={holdBal === 0}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="order-summary">
                <div className="order-row"><span>Selling</span><span>{sellQty.toFixed(6)} {coin?.symbol}</span></div>
                <div className="order-row"><span>At Price</span><span>${priceUsd < 1 ? priceUsd.toFixed(6) : fmt(priceUsd)}</span></div>
                <div className="order-row"><span>Gross Value</span><span>${fmt(sellUsd)}</span></div>
                <div className="order-row"><span>Fee (0.1%)</span><span>-${(sellUsd * 0.001).toFixed(4)}</span></div>
                <hr className="order-divider" />
                <div className="order-row">
                  <span style={{ fontWeight: 600 }}>You'll Receive (USD)</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-green)', fontSize: 16 }}>${fmt(sellNet)}</span>
                </div>
              </div>

              <div style={{
                background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.12)',
                borderRadius: 10, padding: '10px 14px',
                fontSize: 12, color: 'var(--text-muted)', marginBottom: '1.25rem',
              }}>
                💡 USD goes to your Cash balance. Withdraw as INR from the Withdraw page.
              </div>

              <button className="btn-sell"
                onClick={executeSell}
                disabled={loading || holdBal === 0 || sellQty <= 0 || sellQty > holdBal}>
                {loading ? 'Processing...' : `Sell ${coin?.symbol || 'Coin'} →`}
              </button>
            </div>

            {/* Holdings */}
            <div className="card">
              <div className="section-title">Your Holdings</div>
              {wallet.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>💼</div>
                  <div style={{ fontSize: 14 }}>No coins in wallet yet.</div>
                  <button className="btn-buy" style={{ marginTop: '1.5rem' }} onClick={() => setTab('buy')}>Buy First Coin</button>
                </div>
              ) : (
                <div style={{ maxHeight: 460, overflowY: 'auto' }}>
                  {wallet.map(w => {
                    const wBal = parseFloat(w.balance); const selected = w.coin.id === coinId
                    return (
                      <div key={w.id} onClick={() => { setCoinId(w.coin.id); setCoinAmt(''); setSellMsg(null) }}
                        style={{
                          display: 'flex', alignItems: 'center', padding: '12px 10px',
                          borderBottom: '1px solid rgba(30,45,69,0.4)', cursor: 'pointer',
                          background: selected ? 'rgba(0,229,255,0.05)' : 'transparent', borderRadius: 8, gap: 12,
                        }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{w.coin.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                            {wBal.toFixed(6)} {w.coin.symbol}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-green)' }}>
                            ${fmt(w.value_in_usd)}
                          </div>
                        </div>
                        {selected && <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>← selected</div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </>
  )
}