'use client'
import { useEffect, useState } from 'react'
import { coinsAPI, walletAPI } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

interface Coin {
  id: number; symbol: string; name: string; image_url: string
  current_price_usd: number; current_price_inr: number
  price_change_24h_pct: string; usd_to_inr_rate: number
}

interface WalletEntry {
  id: number; balance: string; value_in_usd: number
  coin: { id: number; symbol: string; name: string; current_price_usd: number }
}

function fmt(n: number, dec = 2) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(n)
}

export default function BuySellPage() {
  const { user, loadUser }    = useAuthStore()
  const [coins, setCoins]     = useState<Coin[]>([])
  const [wallet, setWallet]   = useState<WalletEntry[]>([])
  const [mode, setMode]       = useState<'buy' | 'sell'>('buy')
  const [coinId, setCoinId]   = useState<number>(0)
  const [usdAmt, setUsdAmt]   = useState(100)
  const [coinAmt, setCoinAmt] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      const [c, w] = await Promise.all([coinsAPI.getMarket(), walletAPI.getWallet()])
      setCoins(c)
      setWallet(w)
      if (c.length && !coinId) setCoinId(c[0].id)
    } catch (e) {
      console.error(e)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    setMsg(null)
    try {
      await coinsAPI.refreshPrices()
      await fetchAll()
      setMsg({ type: 'ok', text: 'Prices refreshed!' })
    } catch {
      setMsg({ type: 'err', text: 'Refresh failed — check backend.' })
    } finally {
      setRefreshing(false)
      setTimeout(() => setMsg(null), 3000)
    }
  }

  const coin     = coins.find(c => c.id === coinId)
  const priceUsd = coin ? Number(coin.current_price_usd) : 0
  const rate     = coin ? Number(coin.usd_to_inr_rate) || 83.5 : 83.5
  const fee      = usdAmt * 0.001
  const total    = usdAmt + fee
  const qtyBuy   = priceUsd > 0 ? usdAmt / priceUsd : 0

  // For sell — find how much user holds of selected coin
  const holding  = wallet.find(w => w.coin.id === coinId)
  const holdBal  = holding ? parseFloat(holding.balance) : 0
  const sellQty  = parseFloat(coinAmt) || 0
  const sellUsd  = sellQty * priceUsd

  async function execute() {
    if (!coinId) return
    setLoading(true)
    setMsg(null)
    try {
      let res
      if (mode === 'buy') {
        res = await walletAPI.buyCoin(coinId, usdAmt)
      } else {
        if (sellQty <= 0) { setMsg({ type: 'err', text: 'Enter coin amount to sell.' }); setLoading(false); return }
        res = await walletAPI.sellCoin(coinId, sellQty)
      }
      setMsg({ type: 'ok', text: res.message })
      await Promise.all([fetchAll(), loadUser()])
    } catch (err: any) {
      setMsg({ type: 'err', text: err.response?.data?.error || 'Trade failed.' })
    } finally {
      setLoading(false)
    }
  }

  const usdBalance = parseFloat(user?.usd_balance || '0')

  return (
    <>
      <div className="dash-header">
        <h1 className="dash-header-title">Buy / Sell</h1>
        <div className="dash-header-right">
          <div className="header-badge">💵 Cash: ${fmt(usdBalance)}</div>
          <button className="header-badge" style={{ cursor: 'pointer' }} onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? '⏳ Refreshing...' : '🔄 Refresh Prices'}
          </button>
        </div>
      </div>

      <div className="dash-content">

        {/* Message banner */}
        {msg && (
          <div style={{
            background: msg.type === 'ok' ? 'rgba(0,217,126,0.08)' : 'rgba(255,71,87,0.08)',
            border: `1px solid ${msg.type === 'ok' ? 'rgba(0,217,126,0.3)' : 'rgba(255,71,87,0.3)'}`,
            borderRadius: 12, padding: '14px 18px', marginBottom: '1.5rem',
            fontSize: 14, color: msg.type === 'ok' ? 'var(--accent-green)' : 'var(--accent-red)',
          }}>
            {msg.text}
          </div>
        )}

        {/* Low balance warning */}
        {usdBalance === 0 && (
          <div style={{
            background: 'rgba(255,184,0,0.07)', border: '1px solid rgba(255,184,0,0.2)',
            borderRadius: 10, padding: '12px 16px', marginBottom: '1.5rem',
            fontSize: 13, color: 'var(--accent-amber)',
          }}>
            ⚠️ Your USD balance is $0.00. Ask admin to add funds to your account from the admin panel →
            Admin → Users → select your account → set usd_balance
          </div>
        )}

        <div className="grid-2">
          {/* Order form */}
          <div className="card">

            {/* Buy / Sell tabs */}
            <div className="buysell-tabs">
              <button
                className={`bs-tab buy${mode === 'buy' ? ' active' : ''}`}
                onClick={() => { setMode('buy'); setMsg(null) }}
              >
                Buy
              </button>
              <button
                className={`bs-tab sell${mode === 'sell' ? ' active' : ''}`}
                onClick={() => { setMode('sell'); setMsg(null) }}
              >
                Sell
              </button>
            </div>

            {/* Coin picker */}
            <div className="form-group">
              <label className="form-label">Select Coin</label>
              <select className="coin-select" value={coinId}
                onChange={e => { setCoinId(Number(e.target.value)); setMsg(null) }}>
                {coins.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.symbol}) — $
                    {Number(c.current_price_usd) < 1
                      ? Number(c.current_price_usd).toFixed(6)
                      : fmt(Number(c.current_price_usd))}
                  </option>
                ))}
              </select>
            </div>

            {/* Coin info bar */}
            {coin && (
              <div style={{
                background: 'var(--bg)', borderRadius: 10, padding: '12px',
                marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 12,
              }}>
                {coin.image_url
                  ? <img src={coin.image_url} alt={coin.name} style={{ width: 38, height: 38, borderRadius: '50%' }} />
                  : <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{coin.symbol[0]}</div>
                }
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{coin.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    ${priceUsd < 1 ? priceUsd.toFixed(6) : fmt(priceUsd)}
                    {' '}· ≈ ₹{fmt(priceUsd * rate)}
                  </div>
                </div>
                <span className={`badge ${parseFloat(coin.price_change_24h_pct) >= 0 ? 'badge-green' : 'badge-red'}`}>
                  {parseFloat(coin.price_change_24h_pct) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(coin.price_change_24h_pct)).toFixed(2)}%
                </span>
              </div>
            )}

            {/* BUY form */}
            {mode === 'buy' && (
              <>
                <div className="form-group">
                  <label className="form-label">Amount (USD)</label>
                  <div className="amount-wrap">
                    <input className="amount-input" type="number" value={usdAmt}
                      onChange={e => setUsdAmt(Number(e.target.value))} min={1} />
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
                    <span style={{ color: 'var(--accent)' }}>{qtyBuy.toFixed(6)} {coin?.symbol}</span>
                  </div>
                  <div className="order-row"><span>≈ INR Value</span><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>₹{fmt(usdAmt * rate)}</span></div>
                  <div className="order-row"><span>Fee (0.1%)</span><span>${fee.toFixed(4)}</span></div>
                  <hr className="order-divider" />
                  <div className="order-row">
                    <span style={{ fontWeight: 600 }}>Total Deducted</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent)' }}>${fmt(total)}</span>
                  </div>
                </div>
                <button className="btn-buy" onClick={execute} disabled={loading}>
                  {loading ? 'Processing...' : `Buy ${coin?.name || 'Coin'}`}
                </button>
              </>
            )}

            {/* SELL form */}
            {mode === 'sell' && (
              <>
                <div style={{
                  background: 'var(--bg)', borderRadius: 10, padding: '12px',
                  marginBottom: '1.25rem', fontSize: 13,
                }}>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Your holdings</div>
                  <div style={{ fontWeight: 700, fontFamily: 'var(--mono)' }}>
                    {holdBal.toFixed(6)} {coin?.symbol || '—'}
                  </div>
                  {holdBal === 0 && (
                    <div style={{ color: 'var(--accent-red)', fontSize: 12, marginTop: 4 }}>
                      You don&apos;t hold any {coin?.symbol}. Buy first or admin adds to your wallet.
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Coin Amount to Sell</label>
                  <div className="amount-wrap">
                    <input className="amount-input" type="number" placeholder="0.001"
                      value={coinAmt} onChange={e => setCoinAmt(e.target.value)}
                      max={holdBal} min={0} />
                    <span className="amount-curr">{coin?.symbol}</span>
                  </div>
                </div>
                <div className="quick-btns">
                  {[0.25, 0.5, 0.75, 1].map(pct => (
                    <button key={pct} className="quick-btn"
                      onClick={() => setCoinAmt((holdBal * pct).toFixed(8))}>
                      {pct * 100}%
                    </button>
                  ))}
                </div>
                <div className="order-summary">
                  <div className="order-row"><span>Selling</span><span>{sellQty.toFixed(6)} {coin?.symbol}</span></div>
                  <div className="order-row"><span>At Price</span><span>${priceUsd < 1 ? priceUsd.toFixed(6) : fmt(priceUsd)}</span></div>
                  <div className="order-row">
                    <span>You&apos;ll Receive</span>
                    <span style={{ color: 'var(--accent-green)' }}>${fmt(sellUsd * 0.999)}</span>
                  </div>
                  <div className="order-row"><span>≈ INR Value</span><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>₹{fmt(sellUsd * rate)}</span></div>
                  <div className="order-row"><span>Fee (0.1%)</span><span>${(sellUsd * 0.001).toFixed(4)}</span></div>
                </div>
                <button className="btn-sell" onClick={execute} disabled={loading || holdBal === 0}>
                  {loading ? 'Processing...' : `Sell ${coin?.name || 'Coin'}`}
                </button>
              </>
            )}
          </div>

          {/* Right — coin list */}
          <div className="card">
            <div className="section-title">All Coins</div>
            <div style={{ maxHeight: 520, overflowY: 'auto' }}>
              {coins.map(c => {
                const p  = Number(c.current_price_usd)
                const ch = parseFloat(c.price_change_24h_pct)
                return (
                  <div key={c.id} onClick={() => { setCoinId(c.id); setMsg(null) }}
                    style={{
                      display: 'flex', alignItems: 'center', padding: '10px 8px',
                      borderBottom: '1px solid rgba(30,45,69,0.4)', cursor: 'pointer',
                      background: coinId === c.id ? 'rgba(0,229,255,0.05)' : 'transparent',
                      borderRadius: 8, transition: 'background 0.15s',
                    }}>
                    {c.image_url
                      ? <img src={c.image_url} alt={c.name} style={{ width: 30, height: 30, borderRadius: '50%', marginRight: 10 }} />
                      : <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, marginRight: 10 }}>{c.symbol[0]}</div>
                    }
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.symbol}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontFamily: 'var(--mono)', fontWeight: 600 }}>
                        ${p < 1 ? p.toFixed(6) : fmt(p)}
                      </div>
                      <span className={`badge ${ch >= 0 ? 'badge-green' : 'badge-red'}`} style={{ float: 'right', marginTop: 2 }}>
                        {ch >= 0 ? '▲' : '▼'} {Math.abs(ch).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}