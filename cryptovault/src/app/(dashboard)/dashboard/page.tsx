'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { walletAPI, coinsAPI, txAPI } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import {
  TrendingUp, TrendingDown, RefreshCw, Wallet, ArrowUpRight,
  ArrowDownLeft, ShieldCheck, AlertCircle, Coins, Clock, Search,
  CreditCard, ChevronRight, Sparkles, CheckCircle2
} from 'lucide-react'

interface WalletEntry {
  id: number
  coin: {
    id: number
    symbol: string
    name: string
    image_url: string
    current_price_usd: number
    current_price_inr: number
    price_change_24h_pct: string
    usd_to_inr_rate: number
  }
  balance: string
  value_in_usd: number
  value_in_inr: number
}

interface TransactionItem {
  id: number
  type: string
  coin_symbol: string | null
  coin_name: string | null
  coin_amount: string
  usd_amount: string
  status: string
  created_at: string
}

function fmt(n: number | string | null | undefined, dec = 2): string {
  const num = typeof n === 'number' ? n : parseFloat(String(n || '0'))
  if (isNaN(num)) return '0.00'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(num)
}

function fmtInr(n: number | string | null | undefined, dec = 2): string {
  const num = typeof n === 'number' ? n : parseFloat(String(n || '0'))
  if (isNaN(num)) return '0.00'
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(num)
}

function timeAgo(dateStr: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  } catch {
    return 'Recently'
  }
}

export default function DashboardPage() {
  const { user, loadUser } = useAuthStore()
  const [wallet, setWallet] = useState<WalletEntry[]>([])
  const [marketCoins, setMarketCoins] = useState<any[]>([])
  const [recentTx, setRecentTx] = useState<TransactionItem[]>([])
  const [usdToInr, setRate] = useState(83.5)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
  const [activeTab, setActiveTab] = useState<'holdings' | 'all'>('holdings')
  const [searchQuery, setSearchQuery] = useState('')
  const [currencyMode, setCurrencyMode] = useState<'USD' | 'INR'>('USD')

  // ── Fetch & Auto-Sync Dashboard Data ──────────────────────────
  const refreshData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const [walletData, rate, coinsData, txData] = await Promise.all([
        walletAPI.getWallet(),
        coinsAPI.getUsdToInr(),
        coinsAPI.getMarket(),
        txAPI.getHistory(),
        loadUser(),
      ])

      const walletList = Array.isArray(walletData) ? walletData : (walletData.results || [])
      setWallet(walletList)
      setRate(rate || 83.5)
      setMarketCoins(Array.isArray(coinsData) ? coinsData : (coinsData.results || []))
      setRecentTx(Array.isArray(txData) ? txData.slice(0, 4) : [])
      setLastRefreshed(new Date())
    } catch (e) {
      console.error('Failed to sync live data:', e)
    } finally {
      setLoading(false)
      if (isManual) setRefreshing(false)
    }
  }, [loadUser])

  // Initial load
  useEffect(() => {
    refreshData()
  }, [refreshData])

  // Real-time live polling interval (every 25 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      refreshData(false)
    }, 25000)
    return () => clearInterval(timer)
  }, [refreshData])

  // Manual trigger that pings backend refresh-prices
  async function handleManualRefresh() {
    setRefreshing(true)
    try {
      await coinsAPI.refreshPrices().catch(() => {})
      await refreshData(true)
    } finally {
      setRefreshing(false)
    }
  }

  // ── Calculated Portfolio Statistics ───────────────────────────
  const usdBalance = parseFloat(String(user?.usd_balance ?? '0'))
  const portfolioUsd = wallet.reduce((sum, w) => sum + (Number(w.value_in_usd) || 0), 0)
  const totalUsd = usdBalance + portfolioUsd
  const totalInr = totalUsd * usdToInr

  // Filter owned coins with balance > 0
  const ownedWallets = wallet.filter(w => parseFloat(w.balance) > 0)

  // Weighted 24h P&L percentage of held crypto
  const total24hGainUsd = ownedWallets.reduce((acc, w) => {
    const val = Number(w.value_in_usd) || 0
    const pct = parseFloat(w.coin.price_change_24h_pct || '0')
    const prevVal = val / (1 + pct / 100)
    return acc + (val - prevVal)
  }, 0)
  const portfolio24hPct = portfolioUsd > 0 ? (total24hGainUsd / portfolioUsd) * 100 : 0

  // Top 5 market movers for ticker
  const topMovers = marketCoins.slice(0, 5)

  // Filtered rows for the assets table
  const displayCoins = (activeTab === 'holdings' ? ownedWallets : wallet).filter(w => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return w.coin.name.toLowerCase().includes(q) || w.coin.symbol.toLowerCase().includes(q)
  })

  // Greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const isKycVerified = user?.is_kyc_verified || user?.kyc_status === 'approved'

  return (
    <>
      {/* ── STICKY TOP HEADER ────────────────────────────────────── */}
      <div className="dash-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 className="dash-header-title">Dashboard</h1>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(0,217,126,0.1)', border: '1px solid rgba(0,217,126,0.25)',
            borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: 'var(--accent-green)',
          }}>
            <span className="live-indicator">
              <span className="live-indicator-ring" />
              <span className="live-indicator-dot" />
            </span>
            Live Prices
          </div>
        </div>

        <div className="dash-header-right">
          <div className="header-badge" style={{ display: 'none', md: 'flex' } as any}>
            1 USD ≈ ₹{fmtInr(usdToInr)}
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="header-badge"
            title="Refresh prices from CoinGecko"
            style={{
              cursor: refreshing ? 'wait' : 'pointer',
              background: refreshing ? 'rgba(0,229,255,0.12)' : 'var(--card)',
              borderColor: refreshing ? 'var(--accent)' : 'var(--border)',
              color: refreshing ? 'var(--accent)' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Updating...' : 'Sync Live'}</span>
          </button>
        </div>
      </div>

      <div className="dash-content">

        {/* ── TOP MARKET TICKER STRIP ────────────────────────────── */}
        {topMovers.length > 0 && (
          <div style={{
            display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6,
            marginBottom: '1.25rem', scrollbarWidth: 'none',
          }}>
            {topMovers.map(coin => {
              const change = parseFloat(coin.price_change_24h_pct || '0')
              const price = Number(coin.current_price_usd) || 0
              return (
                <Link
                  key={coin.id}
                  href={`/buy-sell?coin=${coin.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'rgba(20,30,46,0.5)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: '8px 14px', textDecoration: 'none',
                    whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.2s',
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(0,229,255,0.4)'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  {coin.image_url ? (
                    <img src={coin.image_url} alt={coin.symbol} style={{ width: 22, height: 22, borderRadius: '50%' }} />
                  ) : (
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#ffffff15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                      {coin.symbol[0]}
                    </div>
                  )}
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{coin.symbol}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--mono)', marginLeft: 8, color: 'var(--text-muted)' }}>
                      ${price < 1 ? price.toFixed(4) : fmt(price)}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                    display: 'inline-flex', alignItems: 'center', gap: 2,
                  }}>
                    {change >= 0 ? '▲' : '▼'}{Math.abs(change).toFixed(2)}%
                  </span>
                </Link>
              )
            })}
          </div>
        )}

        {/* ── HERO PORTFOLIO SHOWCASE CARD ───────────────────────── */}
        <div className="glass-hero mb-3" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>
                  {greeting}, <strong style={{ color: 'var(--text)' }}>{user?.username || 'Trader'}</strong>! 👋
                </span>
                {isKycVerified ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: 'rgba(0,217,126,0.12)', color: 'var(--accent-green)',
                    padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                  }}>
                    <ShieldCheck size={12} /> Verified
                  </span>
                ) : (
                  <Link href="/kyc" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: 'rgba(255,184,0,0.12)', color: 'var(--accent-amber)',
                    padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, textDecoration: 'none',
                  }}>
                    <AlertCircle size={12} /> KYC Pending →
                  </Link>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <div style={{
                  fontSize: 38, fontWeight: 800, fontFamily: 'var(--mono)',
                  letterSpacing: -1, color: '#fff', textShadow: '0 0 24px rgba(0,229,255,0.25)',
                }}>
                  {loading ? '...' : currencyMode === 'USD' ? `$${fmt(totalUsd)}` : `₹${fmtInr(totalInr)}`}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {/* Currency Toggle */}
                  <div style={{
                    display: 'inline-flex', background: 'rgba(0,0,0,0.4)',
                    border: '1px solid var(--border)', borderRadius: 20, padding: 2,
                  }}>
                    <button
                      onClick={() => setCurrencyMode('USD')}
                      style={{
                        background: currencyMode === 'USD' ? 'var(--accent)' : 'transparent',
                        color: currencyMode === 'USD' ? '#000' : 'var(--text-muted)',
                        border: 'none', borderRadius: 16, padding: '3px 10px',
                        fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      USD
                    </button>
                    <button
                      onClick={() => setCurrencyMode('INR')}
                      style={{
                        background: currencyMode === 'INR' ? 'var(--accent)' : 'transparent',
                        color: currencyMode === 'INR' ? '#000' : 'var(--text-muted)',
                        border: 'none', borderRadius: 16, padding: '3px 10px',
                        fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      INR
                    </button>
                  </div>

                  {/* 24h P&L Badge */}
                  {portfolioUsd > 0 && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: portfolio24hPct >= 0 ? 'rgba(0,217,126,0.15)' : 'rgba(255,71,87,0.15)',
                      color: portfolio24hPct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                      border: `1px solid ${portfolio24hPct >= 0 ? 'rgba(0,217,126,0.3)' : 'rgba(255,71,87,0.3)'}`,
                      padding: '3px 8px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    }}>
                      {portfolio24hPct >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                      {portfolio24hPct >= 0 ? '+' : ''}{fmt(portfolio24hPct, 2)}%
                    </span>
                  )}
                </div>
              </div>

              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, display: 'flex', gap: 14 }}>
                <span>
                  {currencyMode === 'USD' ? `≈ ₹${fmtInr(totalInr)} INR` : `≈ $${fmt(totalUsd)} USD`}
                </span>
                <span>•</span>
                <span>Live rate: $1 = ₹{fmtInr(usdToInr)}</span>
              </div>
            </div>

            {/* Quick Action Button Cluster */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link
                href="/buy-sell"
                style={{
                  background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%)',
                  border: 'none', borderRadius: 10, padding: '11px 20px',
                  color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 4px 16px rgba(0,229,255,0.3)', transition: 'all 0.2s',
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'none'}
              >
                <ArrowDownLeft size={16} /> Buy Crypto
              </Link>

              <Link
                href="/wallet"
                style={{
                  background: 'rgba(20,30,46,0.8)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '11px 18px', color: 'var(--text)',
                  fontWeight: 600, fontSize: 13, textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all 0.2s',
                }}
                onMouseOver={e => {
                  e.currentTarget.style.borderColor = 'var(--accent-red)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseOut={e => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.transform = 'none'
                }}
              >
                <ArrowUpRight size={16} /> Instant Sell
              </Link>

              <Link
                href="/withdraw"
                style={{
                  background: 'rgba(20,30,46,0.8)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '11px 18px', color: 'var(--text)',
                  fontWeight: 600, fontSize: 13, textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all 0.2s',
                }}
                onMouseOver={e => {
                  e.currentTarget.style.borderColor = 'var(--accent-green)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseOut={e => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.transform = 'none'
                }}
              >
                <CreditCard size={16} /> Withdraw INR
              </Link>
            </div>
          </div>
        </div>

        {/* ── 4 STAT METRIC CARDS ─────────────────────────────────── */}
        <div className="grid-4 mb-3">
          <div className="glass-stat">
            <div className="stat-label">
              <Wallet size={15} style={{ color: 'var(--accent)' }} /> USD Cash Balance
            </div>
            <div className="stat-value" style={{ fontSize: 24, color: '#fff' }}>
              {loading ? '...' : `$${fmt(usdBalance)}`}
            </div>
            <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
              ≈ ₹{loading ? '...' : fmtInr(usdBalance * usdToInr)} ready to trade
            </div>
          </div>

          <div className="glass-stat">
            <div className="stat-label">
              <Coins size={15} style={{ color: 'var(--accent-amber)' }} /> Crypto Portfolio
            </div>
            <div className="stat-value" style={{ fontSize: 24, color: '#fff' }}>
              {loading ? '...' : `$${fmt(portfolioUsd)}`}
            </div>
            <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
              ≈ ₹{loading ? '...' : fmtInr(portfolioUsd * usdToInr)} in coins
            </div>
          </div>

          <div className="glass-stat">
            <div className="stat-label">
              <TrendingUp size={15} style={{ color: 'var(--accent-green)' }} /> 24h P&L (Crypto)
            </div>
            <div className="stat-value" style={{
              fontSize: 24,
              color: total24hGainUsd >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
            }}>
              {loading ? '...' : `${total24hGainUsd >= 0 ? '+' : ''}$${fmt(total24hGainUsd)}`}
            </div>
            <div className="stat-change" style={{
              color: total24hGainUsd >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
            }}>
              {portfolio24hPct >= 0 ? '▲' : '▼'} {Math.abs(portfolio24hPct).toFixed(2)}% in 24 hours
            </div>
          </div>

          <div className="glass-stat">
            <div className="stat-label">
              <Sparkles size={15} style={{ color: 'var(--accent2)' }} /> Active Assets
            </div>
            <div className="stat-value" style={{ fontSize: 24, color: '#fff' }}>
              {loading ? '...' : ownedWallets.length} <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }}>/ 20</span>
            </div>
            <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
              {ownedWallets.length === 0 ? 'No active crypto yet' : `${ownedWallets.length} tokens held`}
            </div>
          </div>
        </div>

        {/* ── INTERACTIVE ASSET HOLDINGS & MARKET TABLE ──────────── */}
        <div className="card mb-3" style={{ background: 'rgba(20,30,46,0.7)', backdropFilter: 'blur(10px)' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: 12, marginBottom: '1.25rem',
          }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 6, background: 'rgba(0,0,0,0.3)', padding: 3, borderRadius: 24 }}>
              <button
                onClick={() => setActiveTab('holdings')}
                className={`tab-pill ${activeTab === 'holdings' ? 'active' : ''}`}
              >
                My Holdings ({ownedWallets.length})
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`tab-pill ${activeTab === 'all' ? 'active' : ''}`}
              >
                All 20 Crypto Assets
              </button>
            </div>

            {/* Search Filter & Buy Link */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '6px 12px',
              }}>
                <Search size={14} style={{ color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  placeholder="Search coin..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    background: 'transparent', border: 'none', outline: 'none',
                    color: 'var(--text)', fontSize: 12, width: 110,
                  }}
                />
              </div>

              <Link href="/buy-sell" className="section-link" style={{ fontWeight: 700 }}>
                + Buy Crypto
              </Link>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--accent)' }} />
              Loading real-time market data...
            </div>
          ) : displayCoins.length === 0 ? (
            <div style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
              <div style={{
                width: 54, height: 54, borderRadius: '50%', background: 'rgba(0,229,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
              }}>
                <Wallet size={26} style={{ color: 'var(--accent)' }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                {activeTab === 'holdings' ? 'No Coins in Your Wallet Yet' : 'No matching coins found'}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto 18px' }}>
                {activeTab === 'holdings'
                  ? 'Start building your Web3 portfolio by buying Bitcoin, Ethereum, or any top cryptocurrency.'
                  : 'Try searching with another keyword.'}
              </p>
              {activeTab === 'holdings' && (
                <Link href="/buy-sell" style={{
                  background: 'var(--accent)', color: '#000', borderRadius: 8,
                  padding: '9px 22px', fontWeight: 700, fontSize: 13, textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                  <ArrowDownLeft size={15} /> Buy Crypto Now
                </Link>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Holding Balance</th>
                    <th>Live Price (USD)</th>
                    <th>Value (USD)</th>
                    <th>Value (INR)</th>
                    <th>24h Trend</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayCoins.map(w => {
                    const change = parseFloat(w.coin.price_change_24h_pct || '0')
                    const priceUsd = Number(w.coin.current_price_usd) || 0
                    const balance = parseFloat(w.balance || '0')
                    const valUsd = Number(w.value_in_usd) || 0
                    const valInr = Number(w.value_in_inr) || (valUsd * usdToInr)

                    return (
                      <tr key={w.id} className="table-hover-row">
                        <td>
                          <div className="coin-cell">
                            {w.coin.image_url ? (
                              <img src={w.coin.image_url} alt={w.coin.name} style={{ width: 32, height: 32, borderRadius: '50%' }} />
                            ) : (
                              <div className="coin-icon" style={{ background: 'rgba(255,255,255,0.08)', fontSize: 14 }}>
                                {w.coin.symbol[0]}
                              </div>
                            )}
                            <div>
                              <div className="coin-name" style={{ fontWeight: 600 }}>{w.coin.name}</div>
                              <div className="coin-sym" style={{ fontSize: 11 }}>{w.coin.symbol}</div>
                            </div>
                          </div>
                        </td>

                        <td style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: balance > 0 ? 600 : 400 }}>
                          {balance > 0 ? `${balance.toFixed(6)} ${w.coin.symbol}` : <span style={{ color: 'var(--text-dim)' }}>0.00</span>}
                        </td>

                        <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>
                          ${priceUsd < 1 ? priceUsd.toFixed(5) : fmt(priceUsd)}
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 400 }}>
                            ₹{fmtInr(priceUsd * usdToInr)}
                          </div>
                        </td>

                        <td style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: valUsd > 0 ? 'var(--accent)' : 'var(--text-dim)' }}>
                          ${fmt(valUsd)}
                        </td>

                        <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                          ₹{fmtInr(valInr)}
                        </td>

                        <td>
                          <span className={`badge ${change >= 0 ? 'badge-green' : 'badge-red'}`} style={{ padding: '4px 8px' }}>
                            {change >= 0 ? '▲ +' : '▼ '}{Math.abs(change).toFixed(2)}%
                          </span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <Link
                              href={`/buy-sell?coin=${w.coin.id}`}
                              style={{
                                background: 'rgba(0,229,255,0.12)', border: '1px solid rgba(0,229,255,0.25)',
                                color: 'var(--accent)', borderRadius: 6, padding: '4px 10px',
                                fontSize: 11, fontWeight: 700, textDecoration: 'none', transition: 'all 0.15s',
                              }}
                            >
                              Buy
                            </Link>
                            {balance > 0 && (
                              <Link
                                href="/wallet"
                                style={{
                                  background: 'rgba(255,71,87,0.12)', border: '1px solid rgba(255,71,87,0.25)',
                                  color: 'var(--accent-red)', borderRadius: 6, padding: '4px 10px',
                                  fontSize: 11, fontWeight: 700, textDecoration: 'none', transition: 'all 0.15s',
                                }}
                              >
                                Sell
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── LOWER SECTION: RECENT ACTIVITY & QUICK ACTIONS ─────── */}
        <div className="grid-2 mb-3">
          {/* Recent Activity */}
          <div className="card" style={{ background: 'rgba(20,30,46,0.65)' }}>
            <div className="section-title">
              <span>Recent Activity</span>
              <Link href="/history" className="section-link">View All →</Link>
            </div>

            {recentTx.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <Clock size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                No transactions yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recentTx.map(tx => {
                  const isBuy = tx.type === 'buy'
                  const isSell = tx.type === 'sell'
                  const isWithdraw = tx.type === 'withdraw'
                  return (
                    <div
                      key={tx.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px', background: 'rgba(0,0,0,0.25)', borderRadius: 10,
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: isBuy ? 'rgba(0,217,126,0.15)' : isSell ? 'rgba(255,71,87,0.15)' : 'rgba(0,229,255,0.15)',
                          color: isBuy ? 'var(--accent-green)' : isSell ? 'var(--accent-red)' : 'var(--accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                        }}>
                          {isBuy ? '⬇️' : isSell ? '⬆️' : '🏦'}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>
                            {isBuy ? `Bought ${tx.coin_symbol || 'Crypto'}` : isSell ? `Sold ${tx.coin_symbol || 'Crypto'}` : 'Withdrawal to Bank'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                            {timeAgo(tx.created_at)}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--mono)' }}>
                          ${fmt(tx.usd_amount)}
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                          color: tx.status === 'completed' ? 'var(--accent-green)' : tx.status === 'pending' ? 'var(--accent-amber)' : 'var(--accent-red)',
                        }}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Platform Security & Quick Links */}
          <div className="card" style={{ background: 'rgba(20,30,46,0.65)' }}>
            <div className="section-title">
              <span>Quick Navigation</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {[
                { label: 'Buy Crypto',   href: '/buy-sell', emoji: '⬇️', desc: 'UPI & Bank deposit' },
                { label: 'Instant Sell', href: '/wallet',   emoji: '💱', desc: 'Cash out to USD' },
                { label: 'Live Market',  href: '/market',   emoji: '📈', desc: '20 top crypto coins' },
                { label: 'Portfolio',    href: '/portfolio',emoji: '📊', desc: 'Asset breakdown' },
                { label: 'Withdraw INR', href: '/withdraw', emoji: '⬆️', desc: 'Bank / UPI payout' },
                { label: 'Profile Settings', href: '/settings', emoji: '⚙️', desc: 'Security & details' },
              ].map(item => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="quick-action-card"
                  style={{ textAlign: 'left', alignItems: 'flex-start', padding: '12px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{item.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{item.label}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{item.desc}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
