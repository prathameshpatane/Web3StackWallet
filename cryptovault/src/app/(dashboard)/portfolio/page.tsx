'use client'
import { useEffect, useState } from 'react'
import { walletAPI, coinsAPI } from '@/lib/api'

interface Holding {
  id: number
  coin: {
    id: number; symbol: string; name: string; image_url: string
    current_price_usd: number; current_price_inr: number
    price_change_24h_pct: number; usd_to_inr_rate: number
  }
  balance: number; value_in_usd: number; value_in_inr: number
}

function fmt(n: number, dec = 2) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n)
}

export default function PortfolioPage() {
  const [holdings, setHoldings]   = useState<Holding[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [usdToInr, setUsdToInr]   = useState(83.5)

  useEffect(() => {
    fetchPortfolioData()
    
    // Refresh every 30 seconds (instead of 60) to catch admin approvals faster
    const interval = setInterval(fetchPortfolioData, 30000)
    
    // Also refresh when tab becomes visible (user switches back to browser)
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
      setHoldings(data || [])
      setUsdToInr(rate)
      setError('')
    } catch (err) {
      setError('Failed to load portfolio. Is the backend running?')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Calculate totals
  const totalInr = holdings.reduce((sum, h) => sum + h.value_in_inr, 0)
  const totalUsd = holdings.reduce((sum, h) => sum + h.value_in_usd, 0)

  // Calculate allocation percentages
  const holdingsWithAllocation = holdings.map(h => ({
    ...h,
    pct: totalInr > 0 ? Math.round((h.value_in_inr / totalInr) * 100) : 0,
  }))

  // Find best performer
  const bestPerformer = holdings.length > 0
    ? holdings.reduce((best, curr) =>
        curr.coin.price_change_24h_pct > best.coin.price_change_24h_pct ? curr : best
      )
    : null

  return (
    <>
      <div className="dash-header">
        <h1 className="dash-header-title">Portfolio</h1>
        <div className="dash-header-right">
          <div className="header-badge">
            <span className="notif-dot" />
            Total: ₹{fmt(totalInr)}
          </div>
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

        {loading && holdings.length === 0 ? (
          <div style={{
            background: 'var(--card-bg)', borderRadius: 12, padding: '3rem',
            textAlign: 'center', color: 'var(--text-muted)'
          }}>
            Loading your portfolio...
          </div>
        ) : holdings.length === 0 ? (
          <div style={{
            background: 'var(--card-bg)', borderRadius: 12, padding: '3rem',
            textAlign: 'center', color: 'var(--text-muted)'
          }}>
            No holdings yet. Start buying crypto to see your portfolio!
          </div>
        ) : (
          <>
            <div className="grid-3 mb-3">
              {[
                { label:'Total Value', value:`₹${fmt(totalInr)}`, sub:`$${fmt(totalUsd)} USD`, color:'var(--accent-green)' },
                { label:'Holdings', value:holdings.length.toString(), sub:'Coins owned', color:'var(--text-muted)' },
                { label:'Best Performer', value:`${bestPerformer?.coin.symbol} ${(bestPerformer?.coin.price_change_24h_pct ?? 0) >= 0 ? '▲' : '▼'} ${Math.abs(bestPerformer?.coin.price_change_24h_pct || 0).toFixed(2)}%`, sub:`${fmt(bestPerformer?.balance || 0, 4)} ${bestPerformer?.coin.symbol} held`, color: (bestPerformer?.coin.price_change_24h_pct ?? 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value" style={{ fontSize:22 }}>{s.value}</div>
                  <div className="stat-change" style={{ color: s.color }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {holdingsWithAllocation.length > 0 && (
              <div className="card mb-3">
                <div className="section-title">Allocation</div>
                <div style={{ display:'flex', gap:0, height:12, borderRadius:8, overflow:'hidden', marginBottom:'1rem' }}>
                  {holdingsWithAllocation.map(c => (
                    <div key={c.id} style={{ width:`${c.pct}%`, background:`hsl(${Math.random() * 360}, 70%, 50%)`, transition:'width 0.5s' }} title={`${c.coin.symbol}: ${c.pct}%`} />
                  ))}
                </div>
                <div style={{ display:'flex', gap:'1.5rem', flexWrap:'wrap' }}>
                  {holdingsWithAllocation.map(c => (
                    <div key={c.id} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:`hsl(${Math.random() * 360}, 70%, 50%)` }} />
                      <span style={{ color:'var(--text-muted)' }}>{c.coin.symbol}</span>
                      <span style={{ fontWeight:600 }}>{c.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
                <div className="section-title">Holdings</div>
                <button className="quick-btn" style={{ flex:'none', padding:'8px 16px', fontSize:13 }} onClick={fetchPortfolioData}>
                  🔄 Refresh
                </button>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Coin</th>
                    <th>Price (INR)</th>
                    <th>Holdings</th>
                    <th>Value (INR)</th>
                    <th>Allocation</th>
                    <th>24h Change</th>
                  </tr>
                </thead>
                <tbody>
                  {holdingsWithAllocation.map(h => {
                    const change = h.coin.price_change_24h_pct || 0
                    return (
                      <tr key={h.id}>
                        <td>
                          <div className="coin-cell">
                            {h.coin.image_url && (
                              <img src={h.coin.image_url} alt={h.coin.name}
                                style={{ width: 32, height: 32, borderRadius: '50%' }} />
                            )}
                            <div>
                              <div className="coin-name">{h.coin.name}</div>
                              <div className="coin-sym">{h.coin.symbol}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontFamily:'var(--mono)', fontWeight:600 }}>
                          ₹{fmt(h.coin.current_price_inr)}
                        </td>
                        <td style={{ fontFamily:'var(--mono)' }}>
                          {fmt(h.balance, 4)} {h.coin.symbol}
                        </td>
                        <td style={{ fontFamily:'var(--mono)', fontWeight:600 }}>
                          ₹{fmt(h.value_in_inr)}
                        </td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ flex:1, height:4, background:'var(--border)', borderRadius:4 }}>
                              <div style={{ width:`${h.pct}%`, height:'100%', background:'var(--accent)', borderRadius:4 }} />
                            </div>
                            <span style={{ fontSize:11, color:'var(--text-muted)', width:30 }}>{h.pct}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${change >= 0 ? 'badge-green':'badge-red'}`}>
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