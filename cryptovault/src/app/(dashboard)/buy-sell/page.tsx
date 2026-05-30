'use client'
import { useEffect, useState, useRef } from 'react'
import { coinsAPI, walletAPI } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'

// ── Types ────────────────────────────────────────────────────
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
}

type BuyStep = 'select' | 'payment' | 'upload' | 'done'

function fmt(n: number, dec = 2) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: dec, maximumFractionDigits: dec,
  }).format(n)
}

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function BuySellPage() {
  const { user, loadUser } = useAuthStore()

  // Shared state
  const [tab, setTab]       = useState<'buy' | 'sell'>('buy')
  const [coins, setCoins]   = useState<Coin[]>([])
  const [wallet, setWallet] = useState<WalletEntry[]>([])
  const [coinId, setCoinId] = useState<number>(0)
  const [loading, setLoading] = useState(false)

  // Buy state
  const [usdAmt, setUsdAmt]         = useState(100)
  const [buyStep, setBuyStep]       = useState<BuyStep>('select')
  const [txId, setTxId]             = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [preview, setPreview]       = useState<string | null>(null)
  const [requestId, setRequestId]   = useState<number | null>(null)
  const [buyError, setBuyError]     = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Sell state
  const [coinAmt, setCoinAmt]   = useState('')
  const [sellMsg, setSellMsg]   = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Payment settings from backend
  const [pmtSettings, setPmtSettings] = useState<PaymentSettings>({
    upi_id: 'cryptovault@upi',
    upi_name: 'CryptoVault',
    phone_number: '+91 98765 43210',
    qr_image_url: null,
    payment_note: 'Include your registered email in payment remarks.',
    is_active: true,
  })

  // ── Load data ────────────────────────────────────────────────
  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      const [c, w] = await Promise.all([coinsAPI.getMarket(), walletAPI.getWallet()])
      setCoins(c)
      setWallet(w)
      if (c.length && !coinId) setCoinId(c[0].id)
    } catch (e) { console.error(e) }

    // Fetch payment settings from backend
    try {
      const res = await api.get('/wallet/payment-settings/')
      setPmtSettings(res.data)
    } catch (e) {
      console.error('Could not load payment settings:', e)
    }
  }

  // ── Derived values ───────────────────────────────────────────
  const coin     = coins.find(c => c.id === coinId)
  const priceUsd = coin ? Number(coin.current_price_usd) : 0
  const rate     = coin ? Number(coin.usd_to_inr_rate) || 83.5 : 83.5
  const fee      = usdAmt * 0.001
  const totalUsd = usdAmt + fee
  const totalInr = totalUsd * rate
  const coinQty  = priceUsd > 0 ? usdAmt / priceUsd : 0

  // Sell derived
  const holding  = wallet.find(w => w.coin.id === coinId)
  const holdBal  = holding ? parseFloat(holding.balance) : 0
  const sellQty  = parseFloat(coinAmt) || 0
  const sellUsd  = sellQty * priceUsd
  const sellFee  = sellUsd * 0.001
  const sellNet  = sellUsd - sellFee

  const usdBalance = parseFloat(String(user?.usd_balance || '0'))

  // ── UPI deep link ────────────────────────────────────────────
  const upiLink = `upi://pay?pa=${pmtSettings.upi_id}&pn=${encodeURIComponent(pmtSettings.upi_name)}&am=${Math.round(totalInr)}&cu=INR&tn=${encodeURIComponent(`CryptoVault Buy ${coin?.symbol || ''} - ${user?.email || ''}`)}`

  // ── File handler ─────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setScreenshot(file)
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  // ── Submit buy request ───────────────────────────────────────
  async function submitBuyRequest() {
    if (!txId.trim()) { setBuyError('Please enter the Transaction ID / UTR'); return }
    if (!screenshot)  { setBuyError('Please upload payment screenshot'); return }
    if (!coinId)      { setBuyError('No coin selected'); return }

    setLoading(true)
    setBuyError('')
    try {
      const formData = new FormData()
      formData.append('coin_id',        String(coinId))
      formData.append('usd_amount',     String(usdAmt))
      formData.append('inr_amount',     String(Math.round(totalInr)))
      formData.append('transaction_id', txId.trim())
      formData.append('screenshot',     screenshot)

      const res = await api.post('/wallet/buy/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setRequestId(res.data.id)
      setBuyStep('done')
    } catch (err: any) {
      setBuyError(err.response?.data?.error || 'Submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Sell ─────────────────────────────────────────────────────
  async function executeSell() {
    if (sellQty <= 0)    { setSellMsg({ type: 'err', text: 'Enter coin amount to sell.' }); return }
    if (sellQty > holdBal) { setSellMsg({ type: 'err', text: `Insufficient ${coin?.symbol}. You have ${holdBal.toFixed(6)}.` }); return }

    setLoading(true)
    setSellMsg(null)
    try {
      const res = await walletAPI.sellCoin(coinId, sellQty)
      setSellMsg({ type: 'ok', text: res.message })
      setCoinAmt('')
      await Promise.all([fetchAll(), loadUser()])
    } catch (err: any) {
      setSellMsg({ type: 'err', text: err.response?.data?.error || 'Sell failed.' })
    } finally {
      setLoading(false)
    }
  }

  // ── Reset buy flow ───────────────────────────────────────────
  function resetBuy() {
    setBuyStep('select'); setTxId(''); setScreenshot(null)
    setPreview(null); setRequestId(null); setBuyError('')
  }

  // ─────────────────────────────────────────────────────────────
  return (
    <>
      <div className="dash-header">
        <h1 className="dash-header-title">
          {tab === 'buy' ? 'Buy Crypto' : 'Sell Crypto'}
        </h1>
        <div className="dash-header-right">
          <div className="header-badge">💵 Cash: ${fmt(usdBalance)}</div>
          {tab === 'buy' && buyStep !== 'select' && (
            <div className="header-badge">
              Step {buyStep === 'payment' ? 2 : buyStep === 'upload' ? 3 : 4} of 3
            </div>
          )}
        </div>
      </div>

      <div className="dash-content">

        {/* ── TAB SWITCHER ── */}
        <div className="buysell-tabs" style={{ marginBottom: '1.5rem', maxWidth: 320 }}>
          <button
            className={`bs-tab buy${tab === 'buy' ? ' active' : ''}`}
            onClick={() => { setTab('buy'); setSellMsg(null) }}
          >
            🛒 Buy
          </button>
          <button
            className={`bs-tab sell${tab === 'sell' ? ' active' : ''}`}
            onClick={() => { setTab('sell'); setSellMsg(null) }}
          >
            💰 Sell
          </button>
        </div>

        {/* ════════════════ BUY FLOW ════════════════ */}
        {tab === 'buy' && (
          <>
            {/* Step indicator */}
            {buyStep !== 'done' && (
              <div style={{ display: 'flex', alignItems: 'center', maxWidth: 480, marginBottom: '2rem' }}>
                {['Select Coin', 'Make Payment', 'Upload Proof'].map((s, i) => {
                  const keys: BuyStep[] = ['select', 'payment', 'upload']
                  const idx = keys.indexOf(buyStep)
                  const done = idx > i
                  const active = idx === i
                  return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: done ? 'var(--accent-green)' : active ? 'linear-gradient(135deg, var(--accent), var(--accent2))' : 'var(--border)',
                          color: (done || active) ? '#000' : 'var(--text-dim)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 13,
                          boxShadow: active ? '0 0 16px rgba(0,229,255,0.3)' : 'none',
                        }}>
                          {done ? '✓' : i + 1}
                        </div>
                        <div style={{ fontSize: 11, marginTop: 4, fontWeight: 500, whiteSpace: 'nowrap', color: active ? 'var(--text)' : 'var(--text-dim)' }}>
                          {s}
                        </div>
                      </div>
                      {i < 2 && (
                        <div style={{ height: 2, flex: 1, marginBottom: 20, background: done ? 'var(--accent-green)' : 'var(--border)' }} />
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── BUY STEP 1: SELECT ── */}
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
                      <span>You&apos;ll Receive</span>
                      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{coinQty.toFixed(6)} {coin?.symbol}</span>
                    </div>
                    <div className="order-row"><span>Platform Fee (0.1%)</span><span>${fee.toFixed(4)}</span></div>
                    <hr className="order-divider" />
                    <div className="order-row">
                      <span style={{ fontWeight: 600 }}>Pay (USD)</span>
                      <span style={{ fontWeight: 700, color: 'var(--accent)' }}>${fmt(totalUsd)}</span>
                    </div>
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
                      const p = Number(c.current_price_usd)
                      const ch = parseFloat(c.price_change_24h_pct)
                      return (
                        <div key={c.id} onClick={() => setCoinId(c.id)} style={{
                          display: 'flex', alignItems: 'center', padding: '10px 8px',
                          borderBottom: '1px solid rgba(30,45,69,0.4)', cursor: 'pointer',
                          background: coinId === c.id ? 'rgba(0,229,255,0.05)' : 'transparent',
                          borderRadius: 8,
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

            {/* ── BUY STEP 2: PAYMENT ── */}
            {buyStep === 'payment' && (
              <div className="grid-2">
                <div className="card">
                  <div className="section-title">Make UPI Payment</div>

                  {/* Amount banner */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(0,229,255,0.1), rgba(124,58,237,0.1))',
                    border: '1px solid rgba(0,229,255,0.2)',
                    borderRadius: 12, padding: '1.25rem',
                    textAlign: 'center', marginBottom: '1.5rem',
                  }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Pay exactly this amount</div>
                    <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--accent-green)' }}>
                      ₹{fmt(totalInr)}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                      ≈ ${fmt(totalUsd)} · {coinQty.toFixed(6)} {coin?.symbol}
                    </div>
                  </div>

                  {/* UPI details — from backend */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: '0.75rem' }}>UPI Payment Details</div>
                    {[
                      { label: 'UPI ID',    value: pmtSettings.upi_id,       copy: true },
                      { label: 'Name',      value: pmtSettings.upi_name,     copy: false },
                      { label: 'Phone',     value: pmtSettings.phone_number, copy: true },
                    ].map(item => (
                      <div key={item.label} style={{
                        background: 'var(--bg)', borderRadius: 8,
                        padding: '10px 14px', marginBottom: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
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
                  </div>

                  <a href={upiLink} style={{
                    display: 'block', textAlign: 'center',
                    background: 'var(--accent-green)', color: '#fff',
                    textDecoration: 'none', borderRadius: 10, padding: '12px',
                    fontWeight: 700, fontSize: 15, marginBottom: '1rem',
                  }}>
                    📱 Open UPI App to Pay
                  </a>

                  {pmtSettings.payment_note && (
                    <div style={{
                      background: 'rgba(255,184,0,0.07)', border: '1px solid rgba(255,184,0,0.2)',
                      borderRadius: 10, padding: '12px 14px',
                      fontSize: 12, color: 'var(--accent-amber)', lineHeight: 1.6,
                    }}>
                      ⚠️ {pmtSettings.payment_note}
                      <br />Include your email: <strong>{user?.email}</strong> in remarks.
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, marginTop: '1.5rem' }}>
                    <button className="quick-btn" style={{ flex: 1 }} onClick={() => setBuyStep('select')}>← Back</button>
                    <button className="btn-buy" style={{ flex: 2 }} onClick={() => setBuyStep('upload')}>
                      I&apos;ve Paid → Upload Proof
                    </button>
                  </div>
                </div>

                {/* QR Code — from backend */}
                <div className="card" style={{ textAlign: 'center' }}>
                  <div className="section-title" style={{ justifyContent: 'center' }}>Scan QR Code</div>

                  {pmtSettings.qr_image_url ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <img
                        src={pmtSettings.qr_image_url}
                        alt="UPI QR Code"
                        style={{ width: 220, height: 220, borderRadius: 12, border: '2px solid var(--border)', objectFit: 'contain', background: '#fff' }}
                      />
                      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        Scan with any UPI app<br />(GPay, PhonePe, Paytm, BHIM)
                      </p>
                    </div>
                  ) : (
                    <div style={{
                      width: 200, height: 200, margin: '0 auto 1rem',
                      background: 'var(--bg)', border: '2px dashed var(--border)',
                      borderRadius: 12, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', flexDirection: 'column', gap: 8,
                    }}>
                      <div style={{ fontSize: 40 }}>📷</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '0 16px' }}>
                        QR not set yet.<br />Admin: go to Admin Panel → Payment Settings → upload QR
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: '1.5rem', background: 'var(--bg)', borderRadius: 10, padding: '1rem', fontSize: 13 }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Order Summary</div>
                    <div style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Buying</span><span style={{ color: 'var(--text)' }}>{coinQty.toFixed(6)} {coin?.symbol}</span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Pay Amount</span><span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>₹{fmt(totalInr)}</span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>UPI ID</span><span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{pmtSettings.upi_id}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── BUY STEP 3: UPLOAD ── */}
            {buyStep === 'upload' && (
              <div style={{ maxWidth: 560, margin: '0 auto' }}>
                <div className="card">
                  <div className="section-title">Upload Payment Proof</div>

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
                      Find this in your UPI app under payment history
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Screenshot *</label>
                    <div className="kyc-upload" onClick={() => fileRef.current?.click()} style={{ cursor: 'pointer' }}>
                      {preview ? (
                        <img src={preview} alt="screenshot"
                          style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'contain' }} />
                      ) : (
                        <>
                          <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>📸</div>
                          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            Click to upload payment screenshot<br />
                            <span style={{ color: 'var(--accent)' }}>JPG, PNG supported</span>
                          </div>
                        </>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                    {screenshot && (
                      <div style={{ fontSize: 12, color: 'var(--accent-green)', marginTop: 6 }}>✓ {screenshot.name} selected</div>
                    )}
                  </div>

                  <div className="order-summary" style={{ marginBottom: '1.25rem' }}>
                    <div className="order-row"><span>Buying</span><span>{coinQty.toFixed(6)} {coin?.symbol}</span></div>
                    <div className="order-row"><span>Amount Paid</span><span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>₹{fmt(totalInr)}</span></div>
                    <div className="order-row"><span>USD Equivalent</span><span>${fmt(totalUsd)}</span></div>
                  </div>

                  <div style={{
                    background: 'rgba(0,217,126,0.07)', border: '1px solid rgba(0,217,126,0.2)',
                    borderRadius: 10, padding: '12px 14px',
                    fontSize: 12, color: 'var(--accent-green)',
                    marginBottom: '1.25rem', lineHeight: 1.6,
                  }}>
                    ✅ After submission, admin will verify your payment within 1-4 hours.
                    Once approved, {coinQty.toFixed(6)} {coin?.symbol} will appear in your wallet.
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

            {/* ── BUY STEP 4: DONE ── */}
            {buyStep === 'done' && (
              <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
                <div className="card">
                  <div style={{ fontSize: 64, marginBottom: '1rem' }}>🎉</div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Payment Submitted!</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: '1.5rem', lineHeight: 1.7 }}>
                    Your payment proof has been submitted. Admin will verify and add{' '}
                    <strong style={{ color: 'var(--accent)' }}>{coinQty.toFixed(6)} {coin?.symbol}</strong>{' '}
                    to your wallet within <strong>1-4 hours</strong>.
                  </p>

                  {requestId && (
                    <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '1rem', marginBottom: '1.5rem', fontSize: 13 }}>
                      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Request ID</div>
                      <div style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--accent)', fontSize: 18 }}>
                        #CVR{String(requestId).padStart(6, '0')}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Save this for reference</div>
                    </div>
                  )}

                  <div style={{
                    background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.15)',
                    borderRadius: 10, padding: '1rem', fontSize: 13, color: 'var(--text-muted)',
                    marginBottom: '1.5rem', lineHeight: 1.8, textAlign: 'left',
                  }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>What happens next?</div>
                    <div>1. Admin reviews your payment screenshot &amp; Transaction ID</div>
                    <div>2. Payment is verified against UPI records</div>
                    <div>3. {coin?.symbol} is added to your wallet automatically</div>
                    <div>4. Check Wallet → Coin Holdings to confirm</div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <a href="/wallet" style={{
                      flex: 1, display: 'block', textAlign: 'center',
                      background: 'var(--card)', border: '1px solid var(--border)',
                      color: 'var(--text)', textDecoration: 'none',
                      borderRadius: 10, padding: '12px', fontWeight: 600, fontSize: 14,
                    }}>
                      View Wallet
                    </a>
                    <button className="btn-buy" style={{ flex: 1 }} onClick={resetBuy}>
                      Buy More
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ════════════════ SELL FLOW ════════════════ */}
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

              {/* Coin picker */}
              <div className="form-group">
                <label className="form-label">Select Coin to Sell</label>
                <select className="coin-select" value={coinId}
                  onChange={e => { setCoinId(Number(e.target.value)); setCoinAmt(''); setSellMsg(null) }}>
                  {coins.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.symbol}) — ${Number(c.current_price_usd) < 1
                        ? Number(c.current_price_usd).toFixed(4)
                        : fmt(Number(c.current_price_usd))}
                    </option>
                  ))}
                </select>
              </div>

              {/* Holdings */}
              <div style={{
                background: 'var(--bg)', borderRadius: 10, padding: '12px',
                marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 12,
              }}>
                {coin?.image_url && <img src={coin.image_url} alt={coin.name} style={{ width: 38, height: 38, borderRadius: '50%' }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Your Holdings</div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--mono)' }}>
                    {holdBal.toFixed(6)} {coin?.symbol || '—'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    ≈ ${fmt(holdBal * priceUsd)} · ₹{fmt(holdBal * priceUsd * rate)}
                  </div>
                </div>
                {holdBal === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--accent-red)', textAlign: 'right' }}>
                    No {coin?.symbol}<br />in wallet
                  </div>
                )}
              </div>

              {/* Amount input */}
              <div className="form-group">
                <label className="form-label">
                  Amount to Sell ({coin?.symbol})
                </label>
                <div className="amount-wrap">
                  <input className="amount-input" type="number"
                    placeholder="0.000000"
                    value={coinAmt}
                    onChange={e => { setCoinAmt(e.target.value); setSellMsg(null) }}
                    max={holdBal} min={0} step="any" />
                  <span className="amount-curr">{coin?.symbol}</span>
                </div>
              </div>

              {/* Quick % buttons */}
              <div className="quick-btns">
                {[
                  { label: '25%', pct: 0.25 },
                  { label: '50%', pct: 0.50 },
                  { label: '75%', pct: 0.75 },
                  { label: 'MAX', pct: 1.00 },
                ].map(({ label, pct }) => (
                  <button key={label} className="quick-btn"
                    onClick={() => { setCoinAmt((holdBal * pct).toFixed(8)); setSellMsg(null) }}
                    disabled={holdBal === 0}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Sell summary */}
              <div className="order-summary">
                <div className="order-row">
                  <span>Selling</span>
                  <span>{sellQty.toFixed(6)} {coin?.symbol}</span>
                </div>
                <div className="order-row">
                  <span>At Price</span>
                  <span>${priceUsd < 1 ? priceUsd.toFixed(6) : fmt(priceUsd)}</span>
                </div>
                <div className="order-row">
                  <span>Gross Value</span>
                  <span>${fmt(sellUsd)}</span>
                </div>
                <div className="order-row">
                  <span>Platform Fee (0.1%)</span>
                  <span>-${sellFee.toFixed(4)}</span>
                </div>
                <hr className="order-divider" />
                <div className="order-row">
                  <span style={{ fontWeight: 600 }}>You&apos;ll Receive (USD)</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-green)', fontSize: 16 }}>
                    ${fmt(sellNet)}
                  </span>
                </div>
                <div className="order-row">
                  <span style={{ fontWeight: 600 }}>≈ INR Value</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>₹{fmt(sellNet * rate)}</span>
                </div>
              </div>

              <div style={{
                background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.12)',
                borderRadius: 10, padding: '10px 14px',
                fontSize: 12, color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.6,
              }}>
                💡 Sold USD goes to your <strong>Cash (USD) balance</strong>. You can then withdraw it as INR from the Withdraw page.
              </div>

              <button
                className="btn-sell"
                onClick={executeSell}
                disabled={loading || holdBal === 0 || sellQty <= 0 || sellQty > holdBal}
              >
                {loading ? 'Processing...' : `Sell ${coin?.symbol || 'Coin'} →`}
              </button>
            </div>

            {/* Right: holdings summary */}
            <div className="card">
              <div className="section-title">Your Coin Holdings</div>

              {wallet.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>💼</div>
                  <div style={{ fontSize: 14 }}>No coins in wallet yet.</div>
                  <button className="btn-buy" style={{ marginTop: '1.5rem' }}
                    onClick={() => setTab('buy')}>
                    Buy Your First Coin
                  </button>
                </div>
              ) : (
                <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                  {wallet.map(w => {
                    const wPrice = Number(w.coin.current_price_usd)
                    const wBal   = parseFloat(w.balance)
                    const wUsd   = w.value_in_usd
                    const selected = w.coin.id === coinId
                    return (
                      <div key={w.id} onClick={() => { setCoinId(w.coin.id); setCoinAmt(''); setSellMsg(null) }}
                        style={{
                          display: 'flex', alignItems: 'center', padding: '12px 10px',
                          borderBottom: '1px solid rgba(30,45,69,0.4)', cursor: 'pointer',
                          background: selected ? 'rgba(0,229,255,0.05)' : 'transparent',
                          borderRadius: 8, gap: 12, transition: 'background 0.15s',
                        }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{w.coin.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                            {wBal.toFixed(6)} {w.coin.symbol}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-green)' }}>
                            ${fmt(wUsd)}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            @${wPrice < 1 ? wPrice.toFixed(4) : fmt(wPrice)}
                          </div>
                        </div>
                        {selected && (
                          <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>← selected</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <div style={{
                marginTop: '1.5rem', background: 'var(--bg)',
                borderRadius: 10, padding: '1rem', fontSize: 13,
              }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>How selling works</div>
                <div style={{ color: 'var(--text-muted)', lineHeight: 1.8 }}>
                  1. Select coin &amp; enter amount<br />
                  2. Click Sell — instant execution<br />
                  3. USD credited to Cash balance<br />
                  4. Withdraw INR from Withdraw page
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  )
}