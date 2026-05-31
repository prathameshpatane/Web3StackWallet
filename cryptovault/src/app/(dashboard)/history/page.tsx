'use client'
import { useEffect, useState } from 'react'
import { txAPI } from '@/lib/api'

interface Transaction {
  id: number
  type: 'buy' | 'sell' | 'withdraw' | 'deposit'
  coin?: { symbol: string; name: string; image_url?: string }
  coin_amount?: string
  usd_amount: string
  inr_amount?: string
  fee_usd?: string
  status: 'completed' | 'pending' | 'failed'
  notes?: string
  created_at: string
}

const TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
  buy:      { icon: '🛒', label: 'Buy',      color: 'var(--accent-green)' },
  sell:     { icon: '💱', label: 'Sell',     color: 'var(--accent-red)'   },
  withdraw: { icon: '⬆️', label: 'Withdraw', color: 'var(--accent)'       },
  deposit:  { icon: '⬇️', label: 'Deposit',  color: 'var(--accent-green)' },
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  completed: { label: 'Completed', color: 'var(--accent-green)', bg: 'rgba(0,217,126,0.1)'  },
  pending:   { label: 'Pending',   color: 'var(--accent-amber)', bg: 'rgba(255,184,0,0.1)'  },
  failed:    { label: 'Failed',    color: 'var(--accent-red)',   bg: 'rgba(255,71,87,0.1)'  },
}

function fmt(n: number, dec = 2) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n)
}

function timeStr(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function HistoryPage() {
  const [txns, setTxns]         = useState<Transaction[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<'all' | 'buy' | 'sell' | 'withdraw'>('all')
  const [search, setSearch]     = useState('')

  useEffect(() => {
    txAPI.getHistory().then(data => {
      setTxns(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtered = txns.filter(t => {
    const matchType   = filter === 'all' || t.type === filter
    const matchSearch = !search || (
      t.coin?.symbol?.toLowerCase().includes(search.toLowerCase()) ||
      t.coin?.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.type.toLowerCase().includes(search.toLowerCase())
    )
    return matchType && matchSearch
  })

  // Summary stats
  const totalBought  = txns.filter(t => t.type === 'buy'  && t.status === 'completed').reduce((s, t) => s + parseFloat(t.usd_amount || '0'), 0)
  const totalSold    = txns.filter(t => t.type === 'sell' && t.status === 'completed').reduce((s, t) => s + parseFloat(t.usd_amount || '0'), 0)
  const totalWithdraw = txns.filter(t => t.type === 'withdraw').reduce((s, t) => s + parseFloat(t.usd_amount || '0'), 0)
  const totalFees    = txns.reduce((s, t) => s + parseFloat(t.fee_usd || '0'), 0)

  return (
    <>
      <div className="dash-header">
        <h1 className="dash-header-title">Transaction History</h1>
        <div className="dash-header-right">
          <div className="header-badge">{txns.length} transactions</div>
        </div>
      </div>

      <div className="dash-content">

        {/* ── SUMMARY CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Bought',    value: `$${fmt(totalBought)}`,   color: 'var(--accent-green)', icon: '🛒' },
            { label: 'Total Sold',      value: `$${fmt(totalSold)}`,     color: 'var(--accent-red)',   icon: '💱' },
            { label: 'Total Withdrawn', value: `$${fmt(totalWithdraw)}`, color: 'var(--accent)',       icon: '⬆️' },
            { label: 'Total Fees Paid', value: `$${fmt(totalFees, 4)}`,  color: 'var(--text-muted)',   icon: '💸' },
          ].map(card => (
            <div key={card.label} className="card" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{card.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: card.color, fontFamily: 'var(--mono)' }}>
                {card.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* ── FILTERS ── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="buysell-tabs" style={{ marginBottom: 0 }}>
            {(['all', 'buy', 'sell', 'withdraw'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`bs-tab${filter === f ? ' active' : ''}`}
                style={{ textTransform: 'capitalize', padding: '8px 16px', fontSize: 13 }}>
                {f === 'all' ? '📋 All' : f === 'buy' ? '🛒 Buy' : f === 'sell' ? '💱 Sell' : '⬆️ Withdraw'}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search coin..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 14px', color: 'var(--text)',
              fontSize: 13, outline: 'none', minWidth: 180,
            }}
          />
        </div>

        {/* ── TABLE ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr 120px 120px 100px 90px',
            gap: 0, padding: '12px 20px',
            borderBottom: '1px solid var(--border)',
            fontSize: 11, fontWeight: 600,
            color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            <div />
            <div>Asset / Type</div>
            <div style={{ textAlign: 'right' }}>Amount (USD)</div>
            <div style={{ textAlign: 'right' }}>Coin Qty</div>
            <div style={{ textAlign: 'center' }}>Status</div>
            <div style={{ textAlign: 'right' }}>Date</div>
          </div>

          {/* Rows */}
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading transactions...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No transactions yet</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                {filter !== 'all' ? `No ${filter} transactions found.` : 'Your transaction history will appear here.'}
              </div>
              <a href="/buy-sell" style={{
                background: 'var(--accent)', color: '#000', textDecoration: 'none',
                borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: 13,
              }}>
                Make your first trade →
              </a>
            </div>
          ) : (
            filtered.map((t, i) => {
              const meta   = TYPE_META[t.type]   || TYPE_META.buy
              const status = STATUS_META[t.status] || STATUS_META.pending
              const usd    = parseFloat(t.usd_amount || '0')
              const coinAmt = parseFloat(t.coin_amount || '0')

              return (
                <div key={t.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 120px 120px 100px 90px',
                  gap: 0, padding: '14px 20px',
                  borderBottom: i < filtered.length - 1 ? '1px solid rgba(30,45,69,0.4)' : 'none',
                  alignItems: 'center',
                  transition: 'background 0.15s',
                }}
                  onMouseOver={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)'}
                  onMouseOut={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                >
                  {/* Icon */}
                  <div style={{ fontSize: 20 }}>{meta.icon}</div>

                  {/* Asset / Type */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {t.coin?.image_url && (
                      <img src={t.coin.image_url} alt={t.coin.symbol}
                        style={{ width: 28, height: 28, borderRadius: '50%' }} />
                    )}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {t.coin ? `${t.coin.name} (${t.coin.symbol})` : 'USD Withdrawal'}
                      </div>
                      <div style={{ fontSize: 11, color: meta.color, fontWeight: 500 }}>
                        {meta.label}
                        {t.notes && <span style={{ color: 'var(--text-dim)', marginLeft: 6 }}>· {t.notes.slice(0, 40)}{t.notes.length > 40 ? '…' : ''}</span>}
                      </div>
                    </div>
                  </div>

                  {/* USD Amount */}
                  <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600 }}>
                    <span style={{ color: t.type === 'sell' || t.type === 'deposit' ? 'var(--accent-green)' : 'var(--text)' }}>
                      {t.type === 'sell' || t.type === 'deposit' ? '+' : '-'}${fmt(usd)}
                    </span>
                    {t.fee_usd && parseFloat(t.fee_usd) > 0 && (
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                        fee: ${parseFloat(t.fee_usd).toFixed(4)}
                      </div>
                    )}
                  </div>

                  {/* Coin qty */}
                  <div style={{ textAlign: 'right', fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>
                    {coinAmt > 0 ? `${coinAmt.toFixed(6)} ${t.coin?.symbol || ''}` : '—'}
                  </div>

                  {/* Status badge */}
                  <div style={{ textAlign: 'center' }}>
                    <span style={{
                      background: status.bg, color: status.color,
                      borderRadius: 6, padding: '3px 10px',
                      fontSize: 11, fontWeight: 600,
                    }}>
                      {status.label}
                    </span>
                  </div>

                  {/* Date */}
                  <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {timeStr(t.created_at)}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer note */}
        {filtered.length > 0 && (
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-dim)', marginTop: '1rem' }}>
            Showing {filtered.length} of {txns.length} transactions
          </div>
        )}

      </div>
    </>
  )
}