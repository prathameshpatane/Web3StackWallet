'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { walletAPI, coinsAPI } from '@/lib/api'

interface Holding {
  id: number
  coin: {
    id: number; symbol: string; name: string; image_url: string
    current_price_usd: number | string; current_price_inr: number | string
    price_change_24h_pct: number | string; usd_to_inr_rate: number | string
  }
  balance: number | string
  value_in_usd: number | string
  value_in_inr: number | string
}

function fmt(n: number | string | undefined | null, dec = 2) {
  const num = typeof n === 'string' ? parseFloat(n) : Number(n)
  if (isNaN(num)) return '0.00'
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(num)
}

const COIN_COLORS: Record<string, string> = {
  BTC: '#F7931A',
  ETH: '#627EEA',
  SOL: '#14F195',
  BNB: '#F3BA2F',
  XRP: '#00AAE4',
  DOGE: '#C2A633',
  ADA: '#0033AD',
  TRX: '#EF0027',
  LINK: '#375BD2',
  AVAX: '#E84142',
  DOT: '#E6007A',
  MATIC: '#8247E5',
  POL: '#8247E5',
  LTC: '#345D9D',
  UNI: '#FF007A',
  ATOM: '#2E3148',
  XMR: '#FF6600',
  XLM: '#14B6EB',
  ETC: '#328332',
  FIL: '#0090FF',
  ICP: '#29ABE2',
}

function getCoinColor(symbol: string, index: number): string {
  if (COIN_COLORS[symbol.toUpperCase()]) return COIN_COLORS[symbol.toUpperCase()]
  const hues = [190, 260, 140, 320, 45, 210, 280, 15, 170]
  return `hsl(${hues[index % hues.length]}, 75%, 55%)`
}

export default function PortfolioPage() {
  const [holdings, setHoldings]       = useState<Holding[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [usdToInr, setUsdToInr]       = useState(83.5)
  const [showAllCoins, setShowAllCoins] = useState(false)

  useEffect(() => {
    fetchPortfolioData()
    const interval = setInterval(fetchPortfolioData, 30000)

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchPortfolioData()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  async function fetchPortfolioData() {
    try {
      const [data, rate] = await Promise.all([walletAPI.getWallet(), coinsAPI.getUsdToInr()])
      setHoldings(Array.isArray(data) ? data : (data.results || []))
      setUsdToInr(rate)
      setError('')
    } catch (err) {
      setError('Failed to load portfolio. Is the backend running?')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Filter owned holdings (balance > 0)
  const ownedHoldings = holdings.filter(h => parseFloat(String(h.balance || '0')) > 0)

  // Calculate totals based on owned coins
  const totalInr = ownedHoldings.reduce((sum, h) => sum + (parseFloat(String(h.value_in_inr)) || 0), 0)
  const totalUsd = ownedHoldings.reduce((sum, h) => sum + (parseFloat(String(h.value_in_usd)) || 0), 0)

  // Calculate allocation percentages
  const holdingsWithAllocation = ownedHoldings.map((h, i) => {
    const valInr = parseFloat(String(h.value_in_inr)) || 0
    const pct = totalInr > 0 ? Math.round((valInr / totalInr) * 100) : 0
    return {
      ...h,
      pct,
      color: getCoinColor(h.coin.symbol, i),
    }
  })

  // Find best performer among owned coins
  const bestPerformer = ownedHoldings.length > 0
    ? ownedHoldings.reduce((best, curr) =>
        parseFloat(String(curr.coin.price_change_24h_pct || '0')) > parseFloat(String(best.coin.price_change_24h_pct || '0'))
          ? curr
          : best
      )
    : null

  const displayHoldings = showAllCoins ? holdings : ownedHoldings

  return (
    <>
      <div className="dash-header">
        <h1 className="dash-header-title">Portfolio</h1>
        <div className="dash-header-right">
          <div className="header-badge">
            <span className="notif-dot" />
            Total: ₹{fmt(totalInr)}
          </div>
          <button className="quick-btn" style={{ flex: 'none', padding: '6px 14px', fontSize: 13 }} onClick={fetchPortfolioData}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="dash-content">
        {error && (
          <div style={{
            background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)',
            borderRadius: 12, padding: '14px 18px', marginBottom: '1.5rem',
            fontSize: 14, color: 'var(--accent-red)',
          }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div style={{
            background: 'var(--card)', borderRadius: 12, padding: '3rem',
            textAlign: 'center', color: 'var(--text-muted)'
          }}>
            Loading your portfolio...
          </div>
        ) : ownedHoldings.length === 0 && !showAllCoins ? (
          <div className="card" style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>👛</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Your Portfolio is Empty</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 440, margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
              You don&apos;t hold any cryptocurrency yet. Buy coins to start growing your crypto portfolio.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link href="/buy-sell" style={{
                background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                borderRadius: 8, padding: '11px 24px', color: '#fff',
                fontWeight: 700, fontSize: 14, textDecoration: 'none',
              }}>
                Buy Crypto Now →
              </Link>
              <button
                onClick={() => setShowAllCoins(true)}
                className="quick-btn"
                style={{ padding: '11px 20px', fontSize: 14 }}
              >
                View All Available Coins
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid-3 mb-3">
              {[
                {
                  label: 'Portfolio Value',
                  value: `₹${fmt(totalInr)}`,
                  sub: `$${fmt(totalUsd)} USD`,
                  color: 'var(--accent-green)',
                },
                {
                  label: 'Assets Owned',
                  value: ownedHoldings.length.toString(),
                  sub: `${holdings.length} coins supported`,
                  color: 'var(--text-muted)',
                },
                {
                  label: 'Best Performer',
                  value: bestPerformer
                    ? `${bestPerformer.coin.symbol} ${(parseFloat(String(bestPerformer.coin.price_change_24h_pct || '0')) >= 0 ? '▲' : '▼')} ${Math.abs(parseFloat(String(bestPerformer.coin.price_change_24h_pct || '0'))).toFixed(2)}%`
                    : '—',
                  sub: bestPerformer ? `${fmt(bestPerformer.balance, 4)} ${bestPerformer.coin.symbol} held` : 'No holdings yet',
                  color: bestPerformer && parseFloat(String(bestPerformer.coin.price_change_24h_pct || '0')) >= 0
                    ? 'var(--accent-green)'
                    : 'var(--accent-red)',
                },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value" style={{ fontSize: 22 }}>{s.value}</div>
                  <div className="stat-change" style={{ color: s.color }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Allocation Bar & Legend */}
            {holdingsWithAllocation.length > 0 && (
              <div className="card mb-3">
                <div className="section-title">Asset Allocation</div>
                <div style={{ display: 'flex', gap: 2, height: 14, borderRadius: 8, overflow: 'hidden', marginBottom: '1.25rem', background: 'var(--card2)' }}>
                  {holdingsWithAllocation.map(c => (
                    <div
                      key={c.id}
                      style={{
                        width: `${Math.max(c.pct, 2)}%`,
                        background: c.color,
                        transition: 'width 0.5s ease',
                      }}
                      title={`${c.coin.symbol}: ${c.pct}%`}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  {holdingsWithAllocation.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color }} />
                      <span style={{ color: 'var(--text)', fontWeight: 600 }}>{c.coin.symbol}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{c.pct}%</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)' }}>
                        (₹{fmt(c.value_in_inr)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Holdings Table */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 10 }}>
                <div className="section-title" style={{ marginBottom: 0 }}>
                  {showAllCoins ? 'All Coins in Wallet' : 'Your Holdings'}
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button
                    className="quick-btn"
                    style={{ fontSize: 12, padding: '6px 14px' }}
                    onClick={() => setShowAllCoins(p => !p)}
                  >
                    {showAllCoins ? 'Show Owned Only' : `Show All Coins (${holdings.length})`}
                  </button>
                  <Link href="/buy-sell" className="section-link" style={{ fontSize: 13 }}>
                    + Buy Crypto
                  </Link>
                </div>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Coin</th>
                    <th>Price (USD)</th>
                    <th>Price (INR)</th>
                    <th>Holdings</th>
                    <th>Value (USD)</th>
                    <th>Value (INR)</th>
                    <th>24h Change</th>
                  </tr>
                </thead>
                <tbody>
                  {displayHoldings.map((h, i) => {
                    const change = parseFloat(String(h.coin.price_change_24h_pct || '0'))
                    const priceUsd = parseFloat(String(h.coin.current_price_usd || '0'))
                    const priceInr = priceUsd * usdToInr
                    const bal = parseFloat(String(h.balance || '0'))
                    const valUsd = parseFloat(String(h.value_in_usd || '0'))
                    const valInr = parseFloat(String(h.value_in_inr || '0'))

                    return (
                      <tr key={h.id} style={{ opacity: bal > 0 ? 1 : 0.65 }}>
                        <td>
                          <div className="coin-cell">
                            {h.coin.image_url ? (
                              <img src={h.coin.image_url} alt={h.coin.name}
                                style={{ width: 32, height: 32, borderRadius: '50%' }} />
                            ) : (
                              <div className="coin-icon" style={{ background: '#ffffff15', fontSize: 13 }}>
                                {h.coin.symbol[0]}
                              </div>
                            )}
                            <div>
                              <div className="coin-name">{h.coin.name}</div>
                              <div className="coin-sym">{h.coin.symbol}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>
                          ${priceUsd < 1 ? priceUsd.toFixed(6) : fmt(priceUsd)}
                        </td>
                        <td style={{ fontFamily: 'var(--mono)', color: 'var(--text-muted)', fontSize: 12 }}>
                          ₹{fmt(priceInr)}
                        </td>
                        <td style={{ fontFamily: 'var(--mono)', fontWeight: bal > 0 ? 700 : 400 }}>
                          {bal.toFixed(6)} {h.coin.symbol}
                        </td>
                        <td style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: bal > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
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
            </div>
          </>
        )}
      </div>
    </>
  )
}
