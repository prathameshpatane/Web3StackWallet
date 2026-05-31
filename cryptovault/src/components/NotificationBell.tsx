'use client'
// src/components/NotificationBell.tsx
// Drop this component into your dashboard layout header

import { useEffect, useRef, useState } from 'react'
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

export default function NotificationBell() {
  const [open, setOpen]           = useState(false)
  const [notifications, setNots]  = useState<Notification[]>([])
  const [unread, setUnread]       = useState(0)
  const [loading, setLoading]     = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Poll unread count every 30 seconds
  useEffect(() => {
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchUnread() {
    try {
      const count = await notificationsAPI.getUnreadCount()
      setUnread(count)
    } catch { /* silent fail */ }
  }

  async function handleOpen() {
    setOpen(p => !p)
    if (!open) {
      setLoading(true)
      try {
        const data = await notificationsAPI.getAll()
        setNots(data)
        // Count unread from fresh data
        setUnread(data.filter((n: Notification) => !n.is_read).length)
      } catch { /* silent fail */ }
      finally { setLoading(false) }
    }
  }

  async function handleMarkRead(id: number) {
    await notificationsAPI.markRead(id)
    setNots(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
  }

  async function handleMarkAllRead() {
    await notificationsAPI.markAllRead()
    setNots(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnread(0)
  }

  async function handleNotifClick(notif: Notification) {
    if (!notif.is_read) await handleMarkRead(notif.id)
    if (notif.link) window.location.href = notif.link
  }

  return (
    <div ref={dropRef} style={{ position: 'relative' }}>

      {/* Bell button */}
      <button
        onClick={handleOpen}
        style={{
          position:    'relative',
          background:  open ? 'var(--card2)' : 'var(--card)',
          border:      `1px solid ${open ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 8,
          padding:     '7px 12px',
          cursor:      'pointer',
          display:     'flex',
          alignItems:  'center',
          gap:         6,
          color:       'var(--text-muted)',
          fontSize:    20,
          transition:  'all 0.15s',
        }}
        title="Notifications"
      >
        🔔
        {unread > 0 && (
          <span style={{
            position:   'absolute',
            top:        -6,
            right:      -6,
            background: 'var(--accent-red)',
            color:      '#fff',
            borderRadius: '50%',
            width:      18,
            height:     18,
            fontSize:   10,
            fontWeight: 700,
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border:     '2px solid var(--bg2)',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position:    'absolute',
          top:         'calc(100% + 8px)',
          right:       0,
          width:       360,
          maxHeight:   480,
          background:  'var(--card)',
          border:      '1px solid var(--border)',
          borderRadius: 14,
          boxShadow:   '0 8px 32px rgba(0,0,0,0.4)',
          zIndex:      1000,
          overflow:    'hidden',
          display:     'flex',
          flexDirection: 'column',
        }}>

          {/* Header */}
          <div style={{
            padding:        '14px 16px',
            borderBottom:   '1px solid var(--border)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            flexShrink:     0,
          }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              Notifications
              {unread > 0 && (
                <span style={{
                  marginLeft:  8,
                  background:  'var(--accent-red)',
                  color:       '#fff',
                  borderRadius: 10,
                  padding:     '2px 7px',
                  fontSize:    11,
                  fontWeight:  600,
                }}>
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--accent)', fontSize: 12,
                  cursor: 'pointer', fontWeight: 500,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🔔</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>All caught up!</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No notifications yet</div>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  style={{
                    padding:     '12px 16px',
                    borderBottom: '1px solid rgba(30,45,69,0.4)',
                    cursor:      n.link ? 'pointer' : 'default',
                    background:  n.is_read ? 'transparent' : 'rgba(0,229,255,0.04)',
                    display:     'flex',
                    gap:         12,
                    alignItems:  'flex-start',
                    transition:  'background 0.15s',
                  }}
                  onMouseOver={e => { if (n.link) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)' }}
                  onMouseOut={e => { (e.currentTarget as HTMLDivElement).style.background = n.is_read ? 'transparent' : 'rgba(0,229,255,0.04)' }}
                >
                  {/* Icon */}
                  <div style={{
                    width:          36,
                    height:         36,
                    borderRadius:   '50%',
                    background:     (TYPE_COLORS[n.type] || 'var(--accent)') + '18',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    fontSize:       18,
                    flexShrink:     0,
                  }}>
                    {TYPE_ICONS[n.type] || '📢'}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize:   13,
                      fontWeight: n.is_read ? 500 : 700,
                      marginBottom: 2,
                      color:      n.is_read ? 'var(--text-muted)' : 'var(--text)',
                    }}>
                      {n.title}
                    </div>
                    <div style={{
                      fontSize:   12,
                      color:      'var(--text-muted)',
                      lineHeight: 1.5,
                      overflow:   'hidden',
                      display:    '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical' as const,
                    }}>
                      {n.message}
                    </div>
                    <div style={{
                      fontSize:   11,
                      color:      'var(--text-dim)',
                      marginTop:  4,
                      display:    'flex',
                      alignItems: 'center',
                      gap:        6,
                    }}>
                      {timeAgo(n.created_at)}
                      {!n.is_read && (
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: 'var(--accent)',
                          display: 'inline-block',
                        }} />
                      )}
                      {n.link && (
                        <span style={{ color: 'var(--accent)' }}>→ View</span>
                      )}
                    </div>
                  </div>

                  {/* Mark read button */}
                  {!n.is_read && (
                    <button
                      onClick={e => { e.stopPropagation(); handleMarkRead(n.id) }}
                      style={{
                        background: 'none', border: 'none',
                        color: 'var(--text-dim)', fontSize: 16,
                        cursor: 'pointer', flexShrink: 0,
                        padding: '2px 4px',
                      }}
                      title="Mark as read"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{
              padding:     '10px 16px',
              borderTop:   '1px solid var(--border)',
              textAlign:   'center',
              flexShrink:  0,
            }}>
              <a href="/notifications" style={{
                fontSize: 12, color: 'var(--accent)',
                textDecoration: 'none', fontWeight: 500,
              }}>
                View all notifications →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}