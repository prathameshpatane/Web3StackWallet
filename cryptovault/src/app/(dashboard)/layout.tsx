'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'

const NAV = [
  { label: 'Dashboard',  href: '/dashboard', icon: '📊', section: 'Main'    },
  { label: 'Market',     href: '/market',    icon: '📈', section: null       },
  { label: 'Buy / Sell', href: '/buy-sell',  icon: '💱', section: 'Finance' },
  { label: 'Wallet',     href: '/wallet',    icon: '👛', section: null       },
  { label: 'Portfolio',  href: '/portfolio', icon: '💼', section: null       },
  { label: 'Withdraw',   href: '/withdraw',  icon: '⬆️', section: null       },
  { label: 'History',    href: '/history',   icon: '📋', section: null       },
  { label: 'KYC',        href: '/kyc',       icon: '🪪', section: 'Account'  },
  { label: 'Settings',   href: '/settings',  icon: '⚙️', section: null       },
]

const MOBILE = [
  { label: 'Home',   href: '/dashboard', icon: '📊' },
  { label: 'Market', href: '/market',    icon: '📈' },
  { label: 'Trade',  href: '/buy-sell',  icon: '💱' },
  { label: 'Wallet', href: '/wallet',    icon: '👛' },
  { label: 'KYC',    href: '/kyc',       icon: '🪪' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const { user, loadUser, logout, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return }
    loadUser()
  }, [])

  async function handleLogout() {
    await logout()
    router.push('/login')
  }

  let lastSection = ''

  return (
    <div className="dash-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon" style={{ width: 34, height: 34, fontSize: 16 }}>₿</div>
          <span className="logo-text" style={{ fontSize: 17 }}>CryptoVault</span>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(item => {
            const showSection = item.section && item.section !== lastSection
            if (item.section) lastSection = item.section
            return (
              <div key={item.href}>
                {showSection && <div className="nav-section">{item.section}</div>}
                <Link href={item.href} className={`nav-item${pathname === item.href ? ' active' : ''}`}>
                  <span className="nav-icon">{item.icon}</span>{item.label}
                </Link>
              </div>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div className="user-name">{user?.username || 'User'}</div>
              <div className="user-role">
                {user?.is_kyc_verified ? '🟢 KYC Verified' : '🟡 KYC Pending'}
              </div>
            </div>
          </div>
          {/* USD Balance */}
          <div style={{
            background: 'var(--bg)', borderRadius: 8, padding: '8px 12px',
            marginBottom: 8, fontSize: 12,
          }}>
            <div style={{ color: 'var(--text-muted)' }}>USD Balance</div>
            <div style={{ fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>
              ${parseFloat(user?.usd_balance || '0').toFixed(2)}
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>Sign Out</button>
        </div>
      </aside>

      <main className="dash-main">{children}</main>

      {/* MOBILE NAV */}
      <nav className="mobile-nav">
        <div className="mobile-nav-items">
          {MOBILE.map(item => (
            <Link key={item.href} href={item.href}
              className={`mobile-nav-item${pathname === item.href ? ' active' : ''}`}>
              <span className="mobile-nav-icon">{item.icon}</span>{item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}