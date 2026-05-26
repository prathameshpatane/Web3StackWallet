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

export default function DashboardPage() {
  const { user, loadUser }    = useAuthStore()
  const [wallet, setWallet]   = useState<WalletEntry[]>([])
  const [usdToInr, setRate]   = useState(83.5)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [w, rate] = await Promise.all([
          walletAPI.getWallet(),
          coinsAPI.getUsdToInr(),
        ])
        setWallet(Array.isArray(w) ? w : (w.results || []))
        setRate(rate)
        await loadUser()
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const usdBalance   = parseFloat(user?.usd_balance || '0')
  const portfolioUsd = wallet.reduce((s, w) => s + (w.value_in_usd || 0), 0)
  const totalUsd     = usdBalance + portfolioUsd
  const totalInr     = totalUsd * usdToInr
  const kycOk        = user?.is_kyc_verified
  const hour         = new Date().getHours()
  const greeting     = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      <div className="dash-header">
        <h1 className="dash-header-title">Dashboard</h1>
        <div className="dash-header-right">
          <div className="header-badge">
            <span className="notif-dot" /> Live
          </div>
          <div className="header-badge">1 USD = ₹{fmt(usdToInr)}</div>
        </div>
      </div>

      <div className="dash-content">

        {/* Greeting */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,229,255,0.08), rgba(124,58,237,0.08))',
          border: '1px solid rgba(0,229,255,0.15)', borderRadius: 14,
          padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {greeting}, {user?.username || 'there'}! 👋
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              {portfolioUsd > 0
                ? `Your portfolio is worth $${fmt(portfolioUsd)}`
                : 'Welcome to CryptoVault — start trading today'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/buy-sell" style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              border: 'none', borderRadius: 8, padding: '9px 20px',
              color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              💱 Trade Crypto
            </Link>
            <Link href="/withdraw" style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '9px 20px', color: 'var(--text)',
              fontWeight: 600, fontSize: 13, cursor: 'pointer', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              ⬆️ Withdraw
            </Link>
          </div>
        </div>

        {/* KYC banner */}
        {!kycOk && (
          <div style={{
            background: 'rgba(255,184,0,0.07)', border: '1px solid rgba(255,184,0,0.2)',
            borderRadius: 10, padding: '12px 16px', marginBottom: '1.5rem',
            fontSize: 13, color: 'var(--accent-amber)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>⚠️ <strong>KYC {user?.kyc_status === 'pending' ? 'Under Review' : 'Pending'}</strong>
              {user?.kyc_status === 'pending'
                ? ' — Your documents are being reviewed.'
                : ' — Complete Aadhaar & PAN verification to unlock withdrawals.'}
            </span>
            {user?.kyc_status !== 'pending' && (
              <Link href="/kyc" style={{ color: 'var(--accent-amber)', fontWeight: 700, textDecoration: 'none' }}>
                Verify Now →
              </Link>
            )}
          </div>
        )}

        {/* Stat cards — real data only */}
        <div className="grid-4 mb-3">
          <div className="stat-card">
            <div className="stat-label">💵 USD Balance</div>
            <div className="stat-value" style={{ fontSize: 22 }}>
              {loading ? '...' : `$${fmt(usdBalance)}`}
            </div>
            <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
              ≈ ₹{loading ? '...' : fmt(usdBalance * usdToInr)}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">📊 Portfolio (USD)</div>
            <div className="stat-value" style={{ fontSize: 22 }}>
              {loading ? '...' : `$${fmt(portfolioUsd)}`}
            </div>
            <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
              ≈ ₹{loading ? '...' : fmt(portfolioUsd * usdToInr)}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">💰 Total Value</div>
            <div className="stat-value" style={{ fontSize: 22 }}>
              {loading ? '...' : `$${fmt(totalUsd)}`}
            </div>
            <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
              ≈ ₹{loading ? '...' : fmt(totalInr)}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">🪙 Coins Held</div>
            <div className="stat-value" style={{ fontSize: 22 }}>
              {loading ? '...' : wallet.length}
            </div>
            <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
              {wallet.length === 0 ? 'No holdings yet' : `${wallet.length} asset${wallet.length > 1 ? 's' : ''}`}
            </div>
          </div>
        </div>

        {/* Holdings table OR empty state */}
        <div className="card mb-3">
          <div className="section-title">
            Your Holdings
            <Link href="/buy-sell" className="section-link">+ Buy Crypto</Link>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading your holdings...
            </div>
          ) : wallet.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👛</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No coins yet</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                Buy your first crypto or ask admin to add coins to your wallet
              </div>
              <Link href="/buy-sell" style={{
                background: 'var(--accent)', borderRadius: 8, padding: '10px 24px',
                color: '#000', fontWeight: 700, fontSize: 14, textDecoration: 'none',
              }}>
                Buy Crypto Now
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
                  <th>24h Change</th>
                </tr>
              </thead>
              <tbody>
                {wallet.map(w => {
                  const change   = parseFloat(w.coin.price_change_24h_pct || '0')
                  const priceUsd = Number(w.coin.current_price_usd) || 0
                  return (
                    <tr key={w.id}>
                      <td>
                        <div className="coin-cell">
                          {w.coin.image_url
                            ? <img src={w.coin.image_url} alt={w.coin.name} style={{ width: 32, height: 32, borderRadius: '50%' }} />
                            : <div className="coin-icon" style={{ background: '#ffffff15', fontSize: 14 }}>{w.coin.symbol[0]}</div>
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
                        ${fmt(w.value_in_usd || 0)}
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                        ₹{fmt(w.value_in_inr || 0)}
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

        {/* Quick actions */}
        <div className="grid-4">
          {[
            { label: 'Buy Crypto',    href: '/buy-sell',  emoji: '⬇️', color: 'var(--accent-green)' },
            { label: 'Sell Crypto',   href: '/buy-sell',  emoji: '⬆️', color: 'var(--accent-red)'   },
            { label: 'Live Market',   href: '/market',    emoji: '📈', color: 'var(--accent)'        },
            { label: 'Complete KYC',  href: '/kyc',       emoji: '🪪', color: 'var(--accent-amber)'  },
          ].map(q => (
            <Link key={q.label} href={q.href} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 10, padding: '1.25rem',
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, cursor: 'pointer', textDecoration: 'none',
              transition: 'border-color 0.15s',
            }}
              onMouseOver={e => (e.currentTarget.style.borderColor = q.color)}
              onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <span style={{ fontSize: 28 }}>{q.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', textAlign: 'center' }}>
                {q.label}
              </span>
            </Link>
          ))}
        </div>

      </div>
    </>
  )
}