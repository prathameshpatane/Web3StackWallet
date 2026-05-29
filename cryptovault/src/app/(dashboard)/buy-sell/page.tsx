// 'use client'
// import { useEffect, useState } from 'react'
// import { coinsAPI, walletAPI } from '@/lib/api'
// import { useAuthStore } from '@/store/authStore'

// interface Coin {
//   id: number; symbol: string; name: string; image_url: string
//   current_price_usd: number; current_price_inr: number
//   price_change_24h_pct: string; usd_to_inr_rate: number
// }

// interface WalletEntry {
//   id: number; balance: string; value_in_usd: number
//   coin: { id: number; symbol: string; name: string; current_price_usd: number }
// }

// function fmt(n: number, dec = 2) {
//   return new Intl.NumberFormat('en-US', {
//     minimumFractionDigits: dec,
//     maximumFractionDigits: dec,
//   }).format(n)
// }

// export default function BuySellPage() {
//   const { user, loadUser }    = useAuthStore()
//   const [coins, setCoins]     = useState<Coin[]>([])
//   const [wallet, setWallet]   = useState<WalletEntry[]>([])
//   const [mode, setMode]       = useState<'buy' | 'sell'>('buy')
//   const [coinId, setCoinId]   = useState<number>(0)
//   const [usdAmt, setUsdAmt]   = useState(100)
//   const [coinAmt, setCoinAmt] = useState('')
//   const [loading, setLoading] = useState(false)
//   const [msg, setMsg]         = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
//   const [refreshing, setRefreshing] = useState(false)

//   useEffect(() => { fetchAll() }, [])

//   async function fetchAll() {
//     try {
//       const [c, w] = await Promise.all([coinsAPI.getMarket(), walletAPI.getWallet()])
//       setCoins(c)
//       setWallet(w)
//       if (c.length && !coinId) setCoinId(c[0].id)
//     } catch (e) {
//       console.error(e)
//     }
//   }

//   async function handleRefresh() {
//     setRefreshing(true)
//     setMsg(null)
//     try {
//       await coinsAPI.refreshPrices()
//       await fetchAll()
//       setMsg({ type: 'ok', text: 'Prices refreshed!' })
//     } catch {
//       setMsg({ type: 'err', text: 'Refresh failed — check backend.' })
//     } finally {
//       setRefreshing(false)
//       setTimeout(() => setMsg(null), 3000)
//     }
//   }

//   const coin     = coins.find(c => c.id === coinId)
//   const priceUsd = coin ? Number(coin.current_price_usd) : 0
//   const rate     = coin ? Number(coin.usd_to_inr_rate) || 83.5 : 83.5
//   const fee      = usdAmt * 0.001
//   const total    = usdAmt + fee
//   const qtyBuy   = priceUsd > 0 ? usdAmt / priceUsd : 0

//   // For sell — find how much user holds of selected coin
//   const holding  = wallet.find(w => w.coin.id === coinId)
//   const holdBal  = holding ? parseFloat(holding.balance) : 0
//   const sellQty  = parseFloat(coinAmt) || 0
//   const sellUsd  = sellQty * priceUsd

//   async function execute() {
//     if (!coinId) return
//     setLoading(true)
//     setMsg(null)
//     try {
//       let res
//       if (mode === 'buy') {
//         res = await walletAPI.buyCoin(coinId, usdAmt)
//       } else {
//         if (sellQty <= 0) { setMsg({ type: 'err', text: 'Enter coin amount to sell.' }); setLoading(false); return }
//         res = await walletAPI.sellCoin(coinId, sellQty)
//       }
//       setMsg({ type: 'ok', text: res.message })
//       await Promise.all([fetchAll(), loadUser()])
//     } catch (err: any) {
//       setMsg({ type: 'err', text: err.response?.data?.error || 'Trade failed.' })
//     } finally {
//       setLoading(false)
//     }
//   }

//   const usdBalance = parseFloat(user?.usd_balance || '0')

//   return (
//     <>
//       <div className="dash-header">
//         <h1 className="dash-header-title">Buy / Sell</h1>
//         <div className="dash-header-right">
//           <div className="header-badge">💵 Cash: ${fmt(usdBalance)}</div>
//           <button className="header-badge" style={{ cursor: 'pointer' }} onClick={handleRefresh} disabled={refreshing}>
//             {refreshing ? '⏳ Refreshing...' : '🔄 Refresh Prices'}
//           </button>
//         </div>
//       </div>

//       <div className="dash-content">

//         {/* Message banner */}
//         {msg && (
//           <div style={{
//             background: msg.type === 'ok' ? 'rgba(0,217,126,0.08)' : 'rgba(255,71,87,0.08)',
//             border: `1px solid ${msg.type === 'ok' ? 'rgba(0,217,126,0.3)' : 'rgba(255,71,87,0.3)'}`,
//             borderRadius: 12, padding: '14px 18px', marginBottom: '1.5rem',
//             fontSize: 14, color: msg.type === 'ok' ? 'var(--accent-green)' : 'var(--accent-red)',
//           }}>
//             {msg.text}
//           </div>
//         )}

//         {/* Low balance warning */}
//         {usdBalance === 0 && (
//           <div style={{
//             background: 'rgba(255,184,0,0.07)', border: '1px solid rgba(255,184,0,0.2)',
//             borderRadius: 10, padding: '12px 16px', marginBottom: '1.5rem',
//             fontSize: 13, color: 'var(--accent-amber)',
//           }}>
//             ⚠️ Your USD balance is $0.00. Ask admin to add funds to your account from the admin panel →
//             Admin → Users → select your account → set usd_balance
//           </div>
//         )}

//         <div className="grid-2">
//           {/* Order form */}
//           <div className="card">

//             {/* Buy / Sell tabs */}
//             <div className="buysell-tabs">
//               <button
//                 className={`bs-tab buy${mode === 'buy' ? ' active' : ''}`}
//                 onClick={() => { setMode('buy'); setMsg(null) }}
//               >
//                 Buy
//               </button>
//               <button
//                 className={`bs-tab sell${mode === 'sell' ? ' active' : ''}`}
//                 onClick={() => { setMode('sell'); setMsg(null) }}
//               >
//                 Sell
//               </button>
//             </div>

//             {/* Coin picker */}
//             <div className="form-group">
//               <label className="form-label">Select Coin</label>
//               <select className="coin-select" value={coinId}
//                 onChange={e => { setCoinId(Number(e.target.value)); setMsg(null) }}>
//                 {coins.map(c => (
//                   <option key={c.id} value={c.id}>
//                     {c.name} ({c.symbol}) — $
//                     {Number(c.current_price_usd) < 1
//                       ? Number(c.current_price_usd).toFixed(6)
//                       : fmt(Number(c.current_price_usd))}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             {/* Coin info bar */}
//             {coin && (
//               <div style={{
//                 background: 'var(--bg)', borderRadius: 10, padding: '12px',
//                 marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 12,
//               }}>
//                 {coin.image_url
//                   ? <img src={coin.image_url} alt={coin.name} style={{ width: 38, height: 38, borderRadius: '50%' }} />
//                   : <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{coin.symbol[0]}</div>
//                 }
//                 <div style={{ flex: 1 }}>
//                   <div style={{ fontSize: 14, fontWeight: 600 }}>{coin.name}</div>
//                   <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
//                     ${priceUsd < 1 ? priceUsd.toFixed(6) : fmt(priceUsd)}
//                     {' '}· ≈ ₹{fmt(priceUsd * rate)}
//                   </div>
//                 </div>
//                 <span className={`badge ${parseFloat(coin.price_change_24h_pct) >= 0 ? 'badge-green' : 'badge-red'}`}>
//                   {parseFloat(coin.price_change_24h_pct) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(coin.price_change_24h_pct)).toFixed(2)}%
//                 </span>
//               </div>
//             )}

//             {/* BUY form */}
//             {mode === 'buy' && (
//               <>
//                 <div className="form-group">
//                   <label className="form-label">Amount (USD)</label>
//                   <div className="amount-wrap">
//                     <input className="amount-input" type="number" value={usdAmt}
//                       onChange={e => setUsdAmt(Number(e.target.value))} min={1} />
//                     <span className="amount-curr">$ USD</span>
//                   </div>
//                 </div>
//                 <div className="quick-btns">
//                   {[50, 100, 500, 1000].map(v => (
//                     <button key={v} className="quick-btn" onClick={() => setUsdAmt(v)}>${v}</button>
//                   ))}
//                 </div>
//                 <div className="order-summary">
//                   <div className="order-row"><span>Coin Price</span><span>${priceUsd < 1 ? priceUsd.toFixed(6) : fmt(priceUsd)}</span></div>
//                   <div className="order-row">
//                     <span>You&apos;ll Receive</span>
//                     <span style={{ color: 'var(--accent)' }}>{qtyBuy.toFixed(6)} {coin?.symbol}</span>
//                   </div>
//                   <div className="order-row"><span>≈ INR Value</span><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>₹{fmt(usdAmt * rate)}</span></div>
//                   <div className="order-row"><span>Fee (0.1%)</span><span>${fee.toFixed(4)}</span></div>
//                   <hr className="order-divider" />
//                   <div className="order-row">
//                     <span style={{ fontWeight: 600 }}>Total Deducted</span>
//                     <span style={{ fontWeight: 700, color: 'var(--accent)' }}>${fmt(total)}</span>
//                   </div>
//                 </div>
//                 <button className="btn-buy" onClick={execute} disabled={loading}>
//                   {loading ? 'Processing...' : `Buy ${coin?.name || 'Coin'}`}
//                 </button>
//               </>
//             )}

//             {/* SELL form */}
//             {mode === 'sell' && (
//               <>
//                 <div style={{
//                   background: 'var(--bg)', borderRadius: 10, padding: '12px',
//                   marginBottom: '1.25rem', fontSize: 13,
//                 }}>
//                   <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Your holdings</div>
//                   <div style={{ fontWeight: 700, fontFamily: 'var(--mono)' }}>
//                     {holdBal.toFixed(6)} {coin?.symbol || '—'}
//                   </div>
//                   {holdBal === 0 && (
//                     <div style={{ color: 'var(--accent-red)', fontSize: 12, marginTop: 4 }}>
//                       You don&apos;t hold any {coin?.symbol}. Buy first or admin adds to your wallet.
//                     </div>
//                   )}
//                 </div>
//                 <div className="form-group">
//                   <label className="form-label">Coin Amount to Sell</label>
//                   <div className="amount-wrap">
//                     <input className="amount-input" type="number" placeholder="0.001"
//                       value={coinAmt} onChange={e => setCoinAmt(e.target.value)}
//                       max={holdBal} min={0} />
//                     <span className="amount-curr">{coin?.symbol}</span>
//                   </div>
//                 </div>
//                 <div className="quick-btns">
//                   {[0.25, 0.5, 0.75, 1].map(pct => (
//                     <button key={pct} className="quick-btn"
//                       onClick={() => setCoinAmt((holdBal * pct).toFixed(8))}>
//                       {pct * 100}%
//                     </button>
//                   ))}
//                 </div>
//                 <div className="order-summary">
//                   <div className="order-row"><span>Selling</span><span>{sellQty.toFixed(6)} {coin?.symbol}</span></div>
//                   <div className="order-row"><span>At Price</span><span>${priceUsd < 1 ? priceUsd.toFixed(6) : fmt(priceUsd)}</span></div>
//                   <div className="order-row">
//                     <span>You&apos;ll Receive</span>
//                     <span style={{ color: 'var(--accent-green)' }}>${fmt(sellUsd * 0.999)}</span>
//                   </div>
//                   <div className="order-row"><span>≈ INR Value</span><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>₹{fmt(sellUsd * rate)}</span></div>
//                   <div className="order-row"><span>Fee (0.1%)</span><span>${(sellUsd * 0.001).toFixed(4)}</span></div>
//                 </div>
//                 <button className="btn-sell" onClick={execute} disabled={loading || holdBal === 0}>
//                   {loading ? 'Processing...' : `Sell ${coin?.name || 'Coin'}`}
//                 </button>
//               </>
//             )}
//           </div>

//           {/* Right — coin list */}
//           <div className="card">
//             <div className="section-title">All Coins</div>
//             <div style={{ maxHeight: 520, overflowY: 'auto' }}>
//               {coins.map(c => {
//                 const p  = Number(c.current_price_usd)
//                 const ch = parseFloat(c.price_change_24h_pct)
//                 return (
//                   <div key={c.id} onClick={() => { setCoinId(c.id); setMsg(null) }}
//                     style={{
//                       display: 'flex', alignItems: 'center', padding: '10px 8px',
//                       borderBottom: '1px solid rgba(30,45,69,0.4)', cursor: 'pointer',
//                       background: coinId === c.id ? 'rgba(0,229,255,0.05)' : 'transparent',
//                       borderRadius: 8, transition: 'background 0.15s',
//                     }}>
//                     {c.image_url
//                       ? <img src={c.image_url} alt={c.name} style={{ width: 30, height: 30, borderRadius: '50%', marginRight: 10 }} />
//                       : <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, marginRight: 10 }}>{c.symbol[0]}</div>
//                     }
//                     <div style={{ flex: 1 }}>
//                       <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
//                       <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.symbol}</div>
//                     </div>
//                     <div style={{ textAlign: 'right' }}>
//                       <div style={{ fontSize: 13, fontFamily: 'var(--mono)', fontWeight: 600 }}>
//                         ${p < 1 ? p.toFixed(6) : fmt(p)}
//                       </div>
//                       <span className={`badge ${ch >= 0 ? 'badge-green' : 'badge-red'}`} style={{ float: 'right', marginTop: 2 }}>
//                         {ch >= 0 ? '▲' : '▼'} {Math.abs(ch).toFixed(2)}%
//                       </span>
//                     </div>
//                   </div>
//                 )
//               })}
//             </div>
//           </div>
//         </div>
//       </div>
//     </>
//   )
// }

'use client'
import { useEffect, useState, useRef } from 'react'
import { coinsAPI } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'

interface Coin {
  id: number; symbol: string; name: string; image_url: string
  current_price_usd: number; price_change_24h_pct: string; usd_to_inr_rate: number
}

// ── Your UPI payment details — change these ──
const UPI_ID      = 'cryptovault@upi'     // ← change to your UPI ID
const UPI_NAME    = 'CryptoVault'
const UPI_PHONE   = '+91 98765 43210'     // ← change to your number
const QR_NOTE     = 'Pay exact amount shown. Include your registered email in remarks.'

type Step = 'select' | 'payment' | 'upload' | 'done'

function fmt(n: number, dec = 2) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n)
}

export default function BuyPage() {
  const { user } = useAuthStore()

  const [coins, setCoins]         = useState<Coin[]>([])
  const [coinId, setCoinId]       = useState<number>(0)
  const [usdAmt, setUsdAmt]       = useState(100)
  const [step, setStep]           = useState<Step>('select')
  const [txId, setTxId]           = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [preview, setPreview]     = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')
  const [requestId, setRequestId] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    coinsAPI.getMarket().then(data => {
      setCoins(data)
      if (data.length) setCoinId(data[0].id)
    })
  }, [])

  const coin      = coins.find(c => c.id === coinId)
  const priceUsd  = coin ? Number(coin.current_price_usd) : 0
  const rate      = coin ? Number(coin.usd_to_inr_rate) || 83.5 : 83.5
  const inrAmount = usdAmt * rate
  const coinQty   = priceUsd > 0 ? usdAmt / priceUsd : 0
  const fee       = usdAmt * 0.001
  const totalUsd  = usdAmt + fee
  const totalInr  = totalUsd * rate

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setScreenshot(file)
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function submitPayment() {
    if (!txId.trim()) { setError('Please enter the Transaction ID'); return }
    if (!screenshot)  { setError('Please upload payment screenshot'); return }
    if (!coinId)      { setError('No coin selected'); return }

    setSubmitting(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('coin_id',    String(coinId))
      formData.append('usd_amount', String(usdAmt))
      formData.append('inr_amount', String(Math.round(totalInr)))
      formData.append('transaction_id', txId.trim())
      formData.append('screenshot', screenshot)

      const res = await api.post('/wallet/buy-request/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setRequestId(res.data.id)
      setStep('done')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── UPI deep link for mobile ──
  const upiLink = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${Math.round(totalInr)}&cu=INR&tn=${encodeURIComponent(`CryptoVault Buy ${coin?.symbol || ''} - ${user?.email || ''}`)}`

  return (
    <>
      <div className="dash-header">
        <h1 className="dash-header-title">Buy Crypto</h1>
        <div className="dash-header-right">
          <div className="header-badge">
            Step {step === 'select' ? 1 : step === 'payment' ? 2 : step === 'upload' ? 3 : 4} of 3
          </div>
        </div>
      </div>

      <div className="dash-content">

        {/* ── STEP INDICATOR ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 0,
          marginBottom: '2rem', maxWidth: 500,
        }}>
          {['Select Coin', 'Make Payment', 'Upload Proof'].map((s, i) => {
            const stepKeys: Step[] = ['select', 'payment', 'upload']
            const active = stepKeys.indexOf(step) >= i
            const current = stepKeys.indexOf(step) === i
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: active ? 'linear-gradient(135deg, var(--accent), var(--accent2))' : 'var(--border)',
                    color: active ? '#000' : 'var(--text-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 13,
                    border: current ? '2px solid var(--accent)' : 'none',
                  }}>
                    {i + 1}
                  </div>
                  <div style={{
                    fontSize: 11, marginTop: 4, fontWeight: 500,
                    color: active ? 'var(--text)' : 'var(--text-dim)',
                    whiteSpace: 'nowrap',
                  }}>
                    {s}
                  </div>
                </div>
                {i < 2 && (
                  <div style={{
                    height: 2, flex: 1,
                    background: stepKeys.indexOf(step) > i ? 'var(--accent)' : 'var(--border)',
                    marginBottom: 20,
                  }} />
                )}
              </div>
            )
          })}
        </div>

        {/* ── STEP 1 — SELECT COIN & AMOUNT ── */}
        {step === 'select' && (
          <div className="grid-2">
            <div className="card">
              <div className="section-title">Choose Coin & Amount</div>

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
                <div style={{
                  background: 'var(--bg)', borderRadius: 10, padding: 12,
                  marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  {coin.image_url && (
                    <img src={coin.image_url} alt={coin.name}
                      style={{ width: 38, height: 38, borderRadius: '50%' }} />
                  )}
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
                    value={usdAmt} onChange={e => setUsdAmt(Number(e.target.value))}
                    min={10} />
                  <span className="amount-curr">$ USD</span>
                </div>
              </div>

              <div className="quick-btns">
                {[50, 100, 500, 1000].map(v => (
                  <button key={v} className="quick-btn" onClick={() => setUsdAmt(v)}>${v}</button>
                ))}
              </div>

              {/* Order summary */}
              <div className="order-summary">
                <div className="order-row">
                  <span>Coin Price</span>
                  <span>${priceUsd < 1 ? priceUsd.toFixed(6) : fmt(priceUsd)}</span>
                </div>
                <div className="order-row">
                  <span>You&apos;ll Receive</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                    {coinQty.toFixed(6)} {coin?.symbol}
                  </span>
                </div>
                <div className="order-row">
                  <span>Platform Fee (0.1%)</span>
                  <span>${fee.toFixed(4)}</span>
                </div>
                <hr className="order-divider" />
                <div className="order-row">
                  <span style={{ fontWeight: 600 }}>Pay Amount (USD)</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent)' }}>${fmt(totalUsd)}</span>
                </div>
                <div className="order-row">
                  <span style={{ fontWeight: 600 }}>Pay Amount (INR)</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-green)', fontSize: 18 }}>
                    ₹{fmt(totalInr)}
                  </span>
                </div>
              </div>

              <button className="btn-buy" onClick={() => setStep('payment')}
                disabled={!coinId || usdAmt < 10}>
                Proceed to Payment →
              </button>
            </div>

            {/* Coin list */}
            <div className="card">
              <div className="section-title">Available Coins</div>
              <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                {coins.map(c => {
                  const p  = Number(c.current_price_usd)
                  const ch = parseFloat(c.price_change_24h_pct)
                  return (
                    <div key={c.id} onClick={() => setCoinId(c.id)} style={{
                      display: 'flex', alignItems: 'center', padding: '10px 8px',
                      borderBottom: '1px solid rgba(30,45,69,0.4)', cursor: 'pointer',
                      background: coinId === c.id ? 'rgba(0,229,255,0.05)' : 'transparent',
                      borderRadius: 8,
                    }}>
                      {c.image_url && (
                        <img src={c.image_url} alt={c.name}
                          style={{ width: 30, height: 30, borderRadius: '50%', marginRight: 10 }} />
                      )}
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

        {/* ── STEP 2 — PAYMENT ── */}
        {step === 'payment' && (
          <div className="grid-2">
            <div className="card">
              <div className="section-title">Make UPI Payment</div>

              {/* Amount to pay */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(0,229,255,0.1), rgba(124,58,237,0.1))',
                border: '1px solid rgba(0,229,255,0.2)',
                borderRadius: 12, padding: '1.25rem',
                textAlign: 'center', marginBottom: '1.5rem',
              }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                  Pay exactly this amount
                </div>
                <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--accent-green)' }}>
                  ₹{fmt(totalInr)}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                  ≈ ${fmt(totalUsd)} USD · {coinQty.toFixed(6)} {coin?.symbol}
                </div>
              </div>

              {/* UPI Details */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: '0.75rem' }}>
                  UPI Payment Details
                </div>

                {[
                  { label: 'UPI ID',    value: UPI_ID,    copy: true },
                  { label: 'Name',      value: UPI_NAME,  copy: false },
                  { label: 'Phone',     value: UPI_PHONE, copy: true },
                ].map(item => (
                  <div key={item.label} style={{
                    background: 'var(--bg)', borderRadius: 8,
                    padding: '10px 14px', marginBottom: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--mono)' }}>
                        {item.value}
                      </div>
                    </div>
                    {item.copy && (
                      <button
                        onClick={() => navigator.clipboard.writeText(item.value)}
                        style={{
                          background: 'var(--card2)', border: '1px solid var(--border)',
                          borderRadius: 6, padding: '4px 10px', fontSize: 12,
                          color: 'var(--text-muted)', cursor: 'pointer',
                        }}>
                        Copy
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Open UPI app button */}
              <a href={upiLink} style={{
                display: 'block', textAlign: 'center',
                background: 'var(--accent-green)', color: '#fff',
                textDecoration: 'none', borderRadius: 10, padding: '12px',
                fontWeight: 700, fontSize: 15, marginBottom: '1rem',
              }}>
                📱 Open UPI App to Pay
              </a>

              <div style={{
                background: 'rgba(255,184,0,0.07)',
                border: '1px solid rgba(255,184,0,0.2)',
                borderRadius: 10, padding: '12px 14px',
                fontSize: 12, color: 'var(--accent-amber)', lineHeight: 1.6,
              }}>
                ⚠️ {QR_NOTE}
                <br />Include your email: <strong>{user?.email}</strong> in payment remarks.
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: '1.5rem' }}>
                <button className="quick-btn" style={{ flex: 1 }}
                  onClick={() => setStep('select')}>
                  ← Back
                </button>
                <button className="btn-buy" style={{ flex: 2 }}
                  onClick={() => setStep('upload')}>
                  I&apos;ve Paid → Upload Proof
                </button>
              </div>
            </div>

            {/* QR code placeholder */}
            <div className="card" style={{ textAlign: 'center' }}>
              <div className="section-title" style={{ justifyContent: 'center' }}>Scan QR Code</div>

              {/* QR placeholder — replace with actual QR image */}
              <div style={{
                width: 200, height: 200, margin: '0 auto 1rem',
                background: 'var(--bg)', border: '2px solid var(--border)',
                borderRadius: 12, display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexDirection: 'column', gap: 8,
              }}>
                <div style={{ fontSize: 48 }}>📷</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Add your QR code image here
                </div>
              </div>

              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Scan with any UPI app<br />
                (GPay, PhonePe, Paytm, BHIM)
              </p>

              <div style={{
                marginTop: '1.5rem',
                background: 'var(--bg)', borderRadius: 10, padding: '1rem',
                fontSize: 13,
              }}>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Order Summary</div>
                <div style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Buying</span>
                  <span style={{ color: 'var(--text)' }}>{coinQty.toFixed(6)} {coin?.symbol}</span>
                </div>
                <div style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Pay Amount</span>
                  <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>₹{fmt(totalInr)}</span>
                </div>
                <div style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>UPI ID</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{UPI_ID}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3 — UPLOAD PROOF ── */}
        {step === 'upload' && (
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <div className="card">
              <div className="section-title">Upload Payment Proof</div>

              {error && (
                <div style={{
                  background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.25)',
                  borderRadius: 10, padding: '12px 16px', marginBottom: '1.25rem',
                  fontSize: 13, color: 'var(--accent-red)',
                }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Transaction ID */}
              <div className="form-group">
                <label className="form-label">Transaction ID / UTR Number *</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. 123456789012 or UTR123456"
                  value={txId}
                  onChange={e => setTxId(e.target.value)}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Find this in your UPI app under payment history
                </div>
              </div>

              {/* Screenshot upload */}
              <div className="form-group">
                <label className="form-label">Payment Screenshot *</label>
                <div
                  className="kyc-upload"
                  onClick={() => fileRef.current?.click()}
                  style={{ cursor: 'pointer' }}
                >
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
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                {screenshot && (
                  <div style={{ fontSize: 12, color: 'var(--accent-green)', marginTop: 6 }}>
                    ✓ {screenshot.name} selected
                  </div>
                )}
              </div>

              {/* Order recap */}
              <div className="order-summary" style={{ marginBottom: '1.25rem' }}>
                <div className="order-row">
                  <span>Buying</span>
                  <span>{coinQty.toFixed(6)} {coin?.symbol}</span>
                </div>
                <div className="order-row">
                  <span>Amount Paid</span>
                  <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>₹{fmt(totalInr)}</span>
                </div>
                <div className="order-row">
                  <span>USD Equivalent</span>
                  <span>${fmt(totalUsd)}</span>
                </div>
              </div>

              <div style={{
                background: 'rgba(0,217,126,0.07)',
                border: '1px solid rgba(0,217,126,0.2)',
                borderRadius: 10, padding: '12px 14px',
                fontSize: 12, color: 'var(--accent-green)',
                marginBottom: '1.25rem', lineHeight: 1.6,
              }}>
                ✅ After submission, our admin will verify your payment within 1-4 hours.
                Once approved, {coinQty.toFixed(6)} {coin?.symbol} will appear in your wallet.
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="quick-btn" style={{ flex: 1 }}
                  onClick={() => setStep('payment')}>
                  ← Back
                </button>
                <button
                  className="btn-buy"
                  style={{ flex: 2, opacity: submitting ? 0.7 : 1 }}
                  onClick={submitPayment}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit for Verification →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4 — DONE ── */}
        {step === 'done' && (
          <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
            <div className="card">
              <div style={{ fontSize: 64, marginBottom: '1rem' }}>🎉</div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
                Payment Submitted!
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: '1.5rem', lineHeight: 1.7 }}>
                Your payment proof has been submitted successfully.
                Our admin will verify your payment and add{' '}
                <strong style={{ color: 'var(--accent)' }}>{coinQty.toFixed(6)} {coin?.symbol}</strong>{' '}
                to your wallet within <strong>1-4 hours</strong>.
              </p>

              {requestId && (
                <div style={{
                  background: 'var(--bg)', borderRadius: 10, padding: '1rem',
                  marginBottom: '1.5rem', fontSize: 13,
                }}>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Request ID</div>
                  <div style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--accent)' }}>
                    #CVR{String(requestId).padStart(6, '0')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Save this for reference
                  </div>
                </div>
              )}

              <div style={{
                background: 'rgba(0,229,255,0.07)',
                border: '1px solid rgba(0,229,255,0.15)',
                borderRadius: 10, padding: '1rem',
                fontSize: 13, color: 'var(--text-muted)',
                marginBottom: '1.5rem', lineHeight: 1.6, textAlign: 'left',
              }}>
                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>What happens next?</div>
                <div>1. Admin reviews your payment screenshot</div>
                <div>2. Transaction ID is verified</div>
                <div>3. {coin?.symbol} is added to your wallet</div>
                <div>4. You&apos;ll see it under Wallet → Coin Holdings</div>
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
                <button className="btn-buy" style={{ flex: 1 }}
                  onClick={() => { setStep('select'); setTxId(''); setScreenshot(null); setPreview(null) }}>
                  Buy More
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}