'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { walletAPI, coinsAPI } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

interface WalletEntry {
  id: number
  coin: {
    id: number; symbol: string; name: string; image_url: string
    current_price_usd: number; current_price_inr: number
    price_change_24h_pct: string; usd_to_inr_rate: number
  }
  balance: string
  value_in_usd: number
  value_in_inr: number
}

function fmt(n: number, dec = 2) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n)
}

export default function WalletPage() {
  const { user, loadUser }      = useAuthStore()
  const [wallet, setWallet]     = useState<WalletEntry[]>([])
  const [usdToInr, setRate]     = useState(83.5)
  const [showInr, setShowInr]   = useState(false)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [copied, setCopied]     = useState('')

  // INR convert modal
  const [convertUsd, setConvertUsd] = useState('')
  const [convertResult, setConvertResult] = useState<number | null>(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      setError('')
      const [w, rate] = await Promise.all([walletAPI.getWallet(), coinsAPI.getUsdToInr()])
      const list = Array.isArray(w) ? w : (w.results || [])
      setWallet(list)
      setRate(rate)
      await loadUser()
    } catch (e: any) {
      console.error(e)
      setError('Failed to load wallet. ' + (e?.response?.data?.detail || ''))
    } finally {
      setLoading(false)
    }
  }

  async function handleConvert() {
    const usd = parseFloat(convertUsd)
    if (!usd || usd <= 0) return
    try {
      const res = await walletAPI.convertToInr(usd)
      setConvertResult(res.inr_amount)
    } catch {
      setConvertResult(usd * usdToInr)
    }
  }

  function copyAddr(addr: string) {
    navigator.clipboard.writeText(addr).catch(() => {})
    setCopied(addr)
    setTimeout(() => setCopied(''), 2000)
  }

  const usdBal      = parseFloat(user?.usd_balance || '0')
  const portfolioUsd = wallet.reduce((s, w) => s + (w.value_in_usd || 0), 0)
  const totalUsd    = usdBal + portfolioUsd

  return (
    <>
      <div className="dash-header">
        <h1 className="dash-header-title">Wallet</h1>
        <div className="dash-header-right">
          <button
            className="header-badge"
            style={{ cursor: 'pointer', border: showInr ? '1px solid var(--accent)' : undefined }}
            onClick={() => setShowInr(p => !p)}
          >
            {showInr ? '💵 Show USD' : '₹ Show INR'}
          </button>
          <div className="header-badge">1 USD = ₹{fmt(usdToInr)}</div>
          <button className="header-badge" style={{ cursor: 'pointer' }} onClick={fetchAll}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="dash-content">
        {error && (
          <div style={{
            background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)',
            borderRadius: 12, padding: '12px 16px', marginBottom: '1.5rem',
            fontSize: 13, color: 'var(--accent-red)',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Summary */}
        <div className="grid-3 mb-3">
          <div className="stat-card">
            <div className="stat-label">💵 Cash (USD)</div>
            <div className="stat-value" style={{ fontSize: 22 }}>
              {showInr ? `₹${fmt(usdBal * usdToInr)}` : `$${fmt(usdBal)}`}
            </div>
            <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
              {showInr ? `$${fmt(usdBal)} USD` : `≈ ₹${fmt(usdBal * usdToInr)}`}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">📊 Crypto Portfolio</div>
            <div className="stat-value" style={{ fontSize: 22 }}>
              {showInr ? `₹${fmt(portfolioUsd * usdToInr)}` : `$${fmt(portfolioUsd)}`}
            </div>
            <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
              {wallet.length} coin{wallet.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">💰 Total Value</div>
            <div className="stat-value" style={{ fontSize: 22 }}>
              {showInr ? `₹${fmt(totalUsd * usdToInr)}` : `$${fmt(totalUsd)}`}
            </div>
            <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
              Cash + Portfolio
            </div>
          </div>
        </div>

        {/* INR Converter box */}
        <div className="card mb-3">
          <div className="section-title">USD → INR Converter</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="form-label">Amount in USD</label>
              <div className="amount-wrap">
                <input className="amount-input" type="number" placeholder="100"
                  value={convertUsd} onChange={e => { setConvertUsd(e.target.value); setConvertResult(null) }}
                  style={{ fontSize: 16 }} />
                <span className="amount-curr">$</span>
              </div>
            </div>
            <button className="btn-buy" style={{ width: 'auto', padding: '12px 24px', marginBottom: 0 }}
              onClick={handleConvert}>
              Convert
            </button>
            {convertResult !== null && (
              <div style={{
                background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.2)',
                borderRadius: 10, padding: '12px 20px', fontSize: 16, fontWeight: 700,
              }}>
                ₹{fmt(convertResult)}
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
                  Rate: 1 USD = ₹{fmt(usdToInr)}
                </div>
              </div>
            )}
          </div>
          <div style={{ marginTop: '1rem', fontSize: 12, color: 'var(--text-muted)' }}>
            To withdraw to your bank account → go to{' '}
            <Link href="/withdraw" style={{ color: 'var(--accent)' }}>Withdraw page</Link>
          </div>
        </div>

        {/* Holdings table */}
        <div className="card mb-3">
          <div className="section-title">
            Coin Holdings
            <Link href="/buy-sell" className="section-link">+ Buy More</Link>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading your wallet...
            </div>
          ) : wallet.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👛</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>No coins in wallet</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                Buy crypto or wait for admin to add coins to your account
              </div>
              <Link href="/buy-sell" style={{
                background: 'var(--accent-green)', borderRadius: 8, padding: '10px 24px',
                color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none',
              }}>
                Buy Now
              </Link>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Coin</th>
                  <th>Holdings</th>
                  <th>Price (USD)</th>
                  <th>Value (USD)</th>
                  <th>Value (INR)</th>
                  <th>24h</th>
                </tr>
              </thead>
              <tbody>
                {wallet.map(w => {
                  const change   = parseFloat(w.coin.price_change_24h_pct || '0')
                  const priceUsd = Number(w.coin.current_price_usd) || 0
                  const valUsd   = w.value_in_usd || (parseFloat(w.balance) * priceUsd)
                  const valInr   = w.value_in_inr || (valUsd * usdToInr)

                  return (
                    <tr key={w.id}>
                      <td>
                        <div className="coin-cell">
                          {w.coin.image_url
                            ? <img src={w.coin.image_url} alt={w.coin.name} style={{ width: 34, height: 34, borderRadius: '50%' }} />
                            : <div className="coin-icon" style={{ background: '#ffffff15', fontSize: 13 }}>{w.coin.symbol[0]}</div>
                          }
                          <div>
                            <div className="coin-name">{w.coin.name}</div>
                            <div className="coin-sym">{w.coin.symbol}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--mono)' }}>
                        {parseFloat(w.balance).toFixed(6)} {w.coin.symbol}
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>
                        ${priceUsd < 1 ? priceUsd.toFixed(6) : fmt(priceUsd)}
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>
                        ${fmt(valUsd)}
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                        ₹{fmt(valInr)}
                      </td>
                      <td>
                        <span className={`badge ${change >= 0 ? 'badge-green' : 'badge-red'}`}>
                          {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Deposit addresses */}
        <div className="card">
          <div className="section-title">Deposit Crypto</div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: '1rem' }}>
            ⚠️ Only send the matching coin to each address. Sending wrong coins causes permanent loss.
          </p>
          {[
            { coin: 'Bitcoin (BTC)', addr: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' },
            { coin: 'Ethereum (ETH)', addr: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' },
          ].map(a => (
            <div key={a.coin} style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>
                {a.coin}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)', wordBreak: 'break-all', flex: 1 }}>
                  {a.addr}
                </span>
                <button onClick={() => copyAddr(a.addr)} style={{
                  background: 'var(--card2)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '4px 12px', color: 'var(--text-muted)',
                  fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
                }}>
                  {copied === a.addr ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}