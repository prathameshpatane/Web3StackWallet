'use client'
import { useEffect, useState } from 'react'
import { coinsAPI } from '@/lib/api'

interface Coin {
  id: number; coingecko_id: string; symbol: string; name: string
  image_url: string; current_price_usd: string; current_price_inr: number
  price_change_24h_pct: string; market_cap_usd: string
  volume_24h_usd: string; high_24h_usd: string; low_24h_usd: string
  usd_to_inr_rate: string
}

function fmt(n: number, dec = 2) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n)
}

export default function MarketPage() {
  const [coins, setCoins]       = useState<Coin[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')
  const [usdToInr, setUsdToInr] = useState(83.5)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000) // refresh every 60s
    return () => clearInterval(interval)
  }, [])

  async function fetchData() {
    try {
      const [data, rate] = await Promise.all([coinsAPI.getMarket(), coinsAPI.getUsdToInr()])
      setCoins(data.results || data)
      setUsdToInr(rate)
      setError('')
    } catch {
      setError('Failed to load market data. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  const filtered = coins.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                        c.symbol.toLowerCase().includes(search.toLowerCase())
    if (filter === 'gainers') return matchSearch && parseFloat(c.price_change_24h_pct) > 0
    if (filter === 'losers')  return matchSearch && parseFloat(c.price_change_24h_pct) < 0
    return matchSearch
  })

  return (
    <>
      <div className="dash-header">
        <h1 className="dash-header-title">Live Market</h1>
        <div className="dash-header-right">
          <div className="header-badge">
            <span className="notif-dot" />
            Live USD Prices
          </div>
          <div className="header-badge">1 USD = ₹{fmt(usdToInr)}</div>
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

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {['all', 'gainers', 'losers'].map(f => (
            <button key={f} className="quick-btn"
              style={{ flex: 'none', padding: '8px 16px', borderColor: filter === f ? 'var(--accent)' : undefined, color: filter === f ? 'var(--accent)' : undefined }}
              onClick={() => setFilter(f)}>
              {f === 'all' ? 'All Coins' : f === 'gainers' ? '▲ Gainers' : '▼ Losers'}
            </button>
          ))}
          <input className="form-input" placeholder="🔍  Search coins..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 220, padding: '8px 14px', fontSize: 13 }} />
          <button className="quick-btn" style={{ flex: 'none', padding: '8px 16px' }} onClick={fetchData}>
            🔄 Refresh
          </button>
        </div>

        <div className="card">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Loading live prices...
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Coin</th>
                  <th>Price (USD)</th>
                  <th>Price (INR)</th>
                  <th>24h Change</th>
                  <th>Market Cap</th>
                  <th>Volume 24h</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const change = parseFloat(c.price_change_24h_pct)
                  const priceUsd = parseFloat(c.current_price_usd)
                  const priceInr = priceUsd * usdToInr

                  return (
                    <tr key={c.id}>
                      <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td>
                        <div className="coin-cell">
                          {c.image_url && (
                            <img src={c.image_url} alt={c.name}
                              style={{ width: 32, height: 32, borderRadius: '50%' }} />
                          )}
                          <div>
                            <div className="coin-name">{c.name}</div>
                            <div className="coin-sym">{c.symbol}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>
                        ${priceUsd < 1 ? priceUsd.toFixed(6) : fmt(priceUsd)}
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', color: 'var(--text-muted)', fontSize: 12 }}>
                        ₹{fmt(priceInr)}
                      </td>
                      <td>
                        <span className={`badge ${change >= 0 ? 'badge-green' : 'badge-red'}`}>
                          {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        ${(parseFloat(c.market_cap_usd) / 1e9).toFixed(2)}B
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        ${(parseFloat(c.volume_24h_usd) / 1e6).toFixed(0)}M
                      </td>
                      <td>
                        <a href="/buy-sell" style={{
                          background: 'var(--accent)', border: 'none', borderRadius: 6,
                          padding: '5px 12px', color: '#000', fontSize: 12,
                          fontWeight: 700, cursor: 'pointer', textDecoration: 'none',
                        }}>
                          Trade
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}