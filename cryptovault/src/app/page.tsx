// import { redirect } from 'next/navigation'

// export default function Home() {
//   redirect('')
// }

'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const TICKER = [
  { sym: 'BTC', name: 'Bitcoin',  change: '+2.4%', up: true,  color: '#f7931a' },
  { sym: 'ETH', name: 'Ethereum', change: '+1.8%', up: true,  color: '#627eea' },
  { sym: 'SOL', name: 'Solana',   change: '-0.6%', up: false, color: '#9945ff' },
  { sym: 'BNB', name: 'BNB',      change: '+0.9%', up: true,  color: '#f0b90b' },
  { sym: 'XRP', name: 'Ripple',   change: '-1.2%', up: false, color: '#00aae4' },
]

const FEATURES = [
  { icon: '📈', title: 'Live USD Prices',      desc: 'Real-time cryptocurrency prices powered by CoinGecko' },
  { icon: '🔒', title: 'Secure KYC',           desc: 'Aadhaar & PAN verified accounts with full compliance' },
  { icon: '₹',  title: 'INR Withdrawals',      desc: 'Convert your crypto to INR and withdraw via UPI or NEFT' },
  { icon: '👛', title: 'Multi-Coin Wallet',    desc: 'Hold Bitcoin, Ethereum, Solana and 17 more coins' },
  { icon: '⚡', title: 'Fast Transactions',    desc: 'Buy crypto instantly with UPI payment verification' },
  { icon: '🛡️', title: 'Admin Protected',      desc: 'Every transaction manually verified by our admin team' },
]

export default function HomePage() {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick(p => (p + 1) % TICKER.length), 2000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      color: 'var(--text)',
      fontFamily: 'var(--font)',
    }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg2)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            borderRadius: 8, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#000',
          }}>₿</div>
          <span style={{
            fontSize: 18, fontWeight: 700,
            background: 'linear-gradient(135deg, var(--accent), #fff)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>CryptoVault</span>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/login" style={{
            color: 'var(--text-muted)', fontSize: 14, fontWeight: 500,
            textDecoration: 'none', padding: '8px 16px',
          }}>
            Sign In
          </Link>
          <Link href="/register" style={{
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            color: '#fff', fontSize: 14, fontWeight: 600,
            textDecoration: 'none', padding: '9px 20px',
            borderRadius: 8,
          }}>
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* ── TICKER BAR ── */}
      <div style={{
        background: 'var(--card)', borderBottom: '1px solid var(--border)',
        padding: '8px 2rem', display: 'flex', gap: '2rem', overflowX: 'auto',
      }}>
        {TICKER.map(t => (
          <div key={t.sym} style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: t.color + '22', color: t.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}>
              {t.sym[0]}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{t.sym}</span>
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: t.up ? 'var(--accent-green)' : 'var(--accent-red)',
            }}>
              {t.change}
            </span>
          </div>
        ))}
      </div>

      {/* ── HERO ── */}
      <section style={{
        padding: '5rem 2rem 4rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,229,255,0.06) 0%, transparent 70%)',
          top: -200, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none',
        }} />

        <div style={{
          display: 'inline-block', background: 'rgba(0,229,255,0.1)',
          border: '1px solid rgba(0,229,255,0.2)', borderRadius: 20,
          padding: '4px 16px', fontSize: 12, fontWeight: 600,
          color: 'var(--accent)', marginBottom: '1.5rem',
        }}>
          🚀 India&apos;s Trusted Crypto Platform
        </div>

        <h1 style={{
          fontSize: 'clamp(2.5rem, 5vw, 4rem)',
          fontWeight: 700,
          lineHeight: 1.15,
          marginBottom: '1.5rem',
          letterSpacing: '-1px',
        }}>
          Buy & Hold Crypto<br />
          <span style={{
            background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            with Confidence
          </span>
        </h1>

        <p style={{
          fontSize: 18, color: 'var(--text-muted)', maxWidth: 560,
          margin: '0 auto 2.5rem', lineHeight: 1.7,
        }}>
          Live USD prices, instant UPI payments, KYC-verified accounts,
          and INR withdrawals directly to your bank account.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" style={{
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            color: '#fff', fontSize: 16, fontWeight: 700,
            textDecoration: 'none', padding: '14px 32px', borderRadius: 10,
            display: 'inline-block',
          }}>
            Create Free Account →
          </Link>
          <Link href="/login" style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: 16, fontWeight: 600,
            textDecoration: 'none', padding: '14px 32px', borderRadius: 10,
            display: 'inline-block',
          }}>
            Sign In
          </Link>
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex', gap: '3rem', justifyContent: 'center',
          marginTop: '3rem', flexWrap: 'wrap',
        }}>
          {[
            { value: '20+',   label: 'Cryptocurrencies' },
            { value: 'UPI',   label: 'Instant Payments'  },
            { value: '100%',  label: 'Admin Verified'    },
            { value: 'Free',  label: 'Account Creation'  },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: 28, fontWeight: 700,
                fontFamily: 'var(--mono)', color: 'var(--accent)',
              }}>
                {s.value}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{
        padding: '4rem 2rem',
        background: 'var(--bg2)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}>
        <h2 style={{
          textAlign: 'center', fontSize: 28, fontWeight: 700,
          marginBottom: '0.5rem',
        }}>
          How It Works
        </h2>
        <p style={{
          textAlign: 'center', color: 'var(--text-muted)',
          fontSize: 15, marginBottom: '3rem',
        }}>
          Buy crypto in 4 simple steps
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          maxWidth: 900,
          margin: '0 auto',
        }}>
          {[
            { step: '1', icon: '👤', title: 'Create Account',    desc: 'Sign up free with your email and mobile number' },
            { step: '2', icon: '🪪', title: 'Complete KYC',       desc: 'Verify your Aadhaar & PAN for full access' },
            { step: '3', icon: '💸', title: 'Pay via UPI',        desc: 'Send payment to our UPI ID and upload screenshot' },
            { step: '4', icon: '₿',  title: 'Receive Crypto',     desc: 'Admin verifies and coins appear in your wallet' },
          ].map(s => (
            <div key={s.step} style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '1.5rem', textAlign: 'center',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                color: '#000', fontWeight: 700, fontSize: 12,
                width: 24, height: 24, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {s.step}
              </div>
              <div style={{ fontSize: 32, marginBottom: 12, marginTop: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: '4rem 2rem' }}>
        <h2 style={{
          textAlign: 'center', fontSize: 28, fontWeight: 700, marginBottom: '3rem',
        }}>
          Everything You Need
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1rem',
          maxWidth: 900,
          margin: '0 auto',
        }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '1.25rem',
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'rgba(0,229,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
              }}>
                {f.icon}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* ── FOOTER ── */}
      <footer style={{
        padding: '1.5rem 2rem',
        borderTop: '1px solid var(--border)',
        textAlign: 'center',
        fontSize: 13,
        color: 'var(--text-dim)',
      }}>
        © 2025 CryptoVault. All rights reserved. · Crypto trading involves risk.
      </footer>
    </div>
  )
}