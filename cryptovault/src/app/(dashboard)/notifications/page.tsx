'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { notificationsAPI } from '@/lib/api'

interface Notification {
  id: number
  type: string
  title: string
  message: string
  link: string
  is_read: boolean
  created_at: string
}

const TYPE_ICONS: Record<string, string> = {
  info:     '📢',
  success:  '✅',
  warning:  '⚠️',
  kyc:      '🪪',
  buy:      '₿',
  sell:     '💱',
  withdraw: '⬆️',
  system:   '🔧',
}

const TYPE_COLORS: Record<string, string> = {
  info:     'var(--accent)',
  success:  'var(--accent-green)',
  warning:  'var(--accent-amber)',
  kyc:      'var(--accent2)',
  buy:      'var(--accent-green)',
  sell:     'var(--accent-red)',
  withdraw: 'var(--accent)',
  system:   'var(--text-muted)',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'Just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export default function NotificationsPage() {
  const [notifications, setNots] = useState<Notification[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState<'all' | 'unread' | 'read'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  useEffect(() => {
    loadNotifications()
  }, [])

  async function loadNotifications() {
    setLoading(true)
    try {
      const data = await notificationsAPI.getAll()
      setNots(Array.isArray(data) ? data : (data.results || []))
    } catch (e) {
      console.error('Failed to load notifications', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkRead(id: number) {
    try {
      await notificationsAPI.markRead(id)
      setNots(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch (e) {
      console.error(e)
    }
  }

  async function handleMarkAllRead() {
    try {
      await notificationsAPI.markAllRead()
      setNots(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (e) {
      console.error(e)
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const filtered = notifications.filter(n => {
    if (filter === 'unread' && n.is_read) return false
    if (filter === 'read' && !n.is_read) return false
    if (typeFilter !== 'all' && n.type !== typeFilter) return false
    return true
  })

  return (
    <>
      <div className="dash-header">
        <h1 className="dash-header-title">Notifications</h1>
        <div className="dash-header-right">
          {unreadCount > 0 && (
            <div className="header-badge" style={{ background: 'rgba(255,71,87,0.15)', color: 'var(--accent-red)' }}>
              🔔 {unreadCount} unread
            </div>
          )}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="quick-btn"
              style={{ fontSize: 13, padding: '6px 14px', flex: 'none' }}
            >
              ✓ Mark All Read
            </button>
          )}
          <button
            onClick={loadNotifications}
            className="quick-btn"
            style={{ fontSize: 13, padding: '6px 14px', flex: 'none' }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="dash-content">
        {/* Filters bar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="buysell-tabs" style={{ marginBottom: 0 }}>
            {(['all', 'unread', 'read'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`bs-tab${filter === f ? ' active' : ''}`}
                style={{ textTransform: 'capitalize', padding: '8px 16px', fontSize: 13 }}
              >
                {f === 'all' ? `All (${notifications.length})` : f === 'unread' ? `Unread (${unreadCount})` : 'Read'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['all', 'buy', 'sell', 'withdraw', 'kyc', 'system', 'info'].map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                style={{
                  background: typeFilter === t ? 'rgba(0,229,255,0.1)' : 'var(--card)',
                  border: `1px solid ${typeFilter === t ? 'var(--accent)' : 'var(--border)'}`,
                  color: typeFilter === t ? 'var(--accent)' : 'var(--text-muted)',
                  borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer',
                  textTransform: 'capitalize', fontWeight: 600,
                }}
              >
                {t === 'all' ? 'All Types' : `${TYPE_ICONS[t] || ''} ${t}`}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications list */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading notifications...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No notifications found</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {filter === 'unread' ? 'You have read all your notifications!' : 'There are no notifications matching your filter.'}
              </div>
            </div>
          ) : (
            <div>
              {filtered.map(n => (
                <div
                  key={n.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 16,
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border)',
                    background: n.is_read ? 'transparent' : 'rgba(0,229,255,0.03)',
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: (TYPE_COLORS[n.type] || 'var(--accent)') + '20',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    flexShrink: 0,
                  }}>
                    {TYPE_ICONS[n.type] || '📢'}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{
                        fontSize: 14,
                        fontWeight: n.is_read ? 600 : 700,
                        color: n.is_read ? 'var(--text)' : '#fff',
                      }}>
                        {n.title}
                      </span>
                      {!n.is_read && (
                        <span style={{
                          background: 'var(--accent-red)',
                          color: '#fff',
                          borderRadius: 6,
                          padding: '1px 6px',
                          fontSize: 10,
                          fontWeight: 700,
                        }}>
                          NEW
                        </span>
                      )}
                    </div>

                    <p style={{
                      fontSize: 13,
                      color: 'var(--text-muted)',
                      lineHeight: 1.6,
                      marginBottom: 8,
                    }}>
                      {n.message}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
                      <span style={{ color: 'var(--text-dim)' }}>
                        {timeAgo(n.created_at)}
                      </span>
                      {n.link && (
                        <Link
                          href={n.link}
                          style={{
                            color: 'var(--accent)',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          Go to action →
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="quick-btn"
                      style={{
                        padding: '4px 10px',
                        fontSize: 11,
                        flexShrink: 0,
                      }}
                      title="Mark as read"
                    >
                      ✓ Mark read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

