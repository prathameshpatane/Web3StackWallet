'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { authAPI } from '@/lib/api'

export default function SettingsPage() {
  const { user, loadUser, updateProfile } = useAuthStore()

  // Profile form
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [username, setUsername]   = useState('')
  const [mobile, setMobile]       = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Security form
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass]         = useState('')
  const [newPass2, setNewPass2]       = useState('')
  const [passLoading, setPassLoading] = useState(false)
  const [passMsg, setPassMsg]         = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '')
      setLastName(user.last_name || '')
      setUsername(user.username || '')
      setMobile(user.mobile || '')
    }
  }, [user])

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileMsg(null)
    setProfileLoading(true)
    try {
      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username: username.trim(),
        mobile: mobile.trim(),
      })
      await loadUser()
      setProfileMsg({ type: 'ok', text: 'Profile updated successfully!' })
    } catch (err: any) {
      const msg = err.response?.data?.username?.[0] ||
                  err.response?.data?.mobile?.[0] ||
                  err.response?.data?.detail ||
                  'Failed to update profile.'
      setProfileMsg({ type: 'err', text: msg })
    } finally {
      setProfileLoading(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPassMsg(null)

    if (!currentPass) {
      setPassMsg({ type: 'err', text: 'Enter your current password.' })
      return
    }
    if (newPass.length < 8) {
      setPassMsg({ type: 'err', text: 'New password must be at least 8 characters long.' })
      return
    }
    if (newPass !== newPass2) {
      setPassMsg({ type: 'err', text: 'New passwords do not match.' })
      return
    }

    setPassLoading(true)
    try {
      const res = await authAPI.changePassword({
        current_password: currentPass,
        new_password: newPass,
        new_password2: newPass2,
      })
      setPassMsg({ type: 'ok', text: res.message || 'Password changed successfully.' })
      setCurrentPass('')
      setNewPass('')
      setNewPass2('')
    } catch (err: any) {
      const errData = err.response?.data
      const msg = errData?.current_password?.[0] ||
                  errData?.new_password?.[0] ||
                  errData?.new_password2?.[0] ||
                  errData?.detail ||
                  'Failed to change password.'
      setPassMsg({ type: 'err', text: msg })
    } finally {
      setPassLoading(false)
    }
  }

  const kycStatus = user?.kyc_status || 'not_submitted'
  const isKycVerified = user?.is_kyc_verified || kycStatus === 'approved'

  return (
    <>
      <div className="dash-header">
        <h1 className="dash-header-title">Account Settings</h1>
        <div className="dash-header-right">
          <div className="header-badge">
            {isKycVerified ? '🟢 KYC Verified' : kycStatus === 'pending' ? '🟡 KYC Pending' : '🔴 KYC Unverified'}
          </div>
        </div>
      </div>

      <div className="dash-content">
        <div className="grid-2">
          {/* ── PROFILE INFORMATION ── */}
          <div className="card">
            <div className="section-title">Profile Information</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Update your account display details.
            </p>

            {profileMsg && (
              <div style={{
                background: profileMsg.type === 'ok' ? 'rgba(0,217,126,0.08)' : 'rgba(255,71,87,0.08)',
                border: `1px solid ${profileMsg.type === 'ok' ? 'rgba(0,217,126,0.3)' : 'rgba(255,71,87,0.3)'}`,
                borderRadius: 10, padding: '10px 14px', marginBottom: '1.25rem',
                fontSize: 13, color: profileMsg.type === 'ok' ? 'var(--accent-green)' : 'var(--accent-red)',
              }}>
                {profileMsg.type === 'ok' ? '✅' : '⚠️'} {profileMsg.text}
              </div>
            )}

            <form onSubmit={handleUpdateProfile}>
              <div className="form-group">
                <label className="form-label">Email Address (Read-only)</label>
                <input
                  className="form-input"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">First Name</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="First name"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Last Name</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Last name"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mobile Number</label>
                <input
                  className="form-input"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
                disabled={profileLoading}
              >
                {profileLoading ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </form>
          </div>

          {/* ── SECURITY & VERIFICATION ── */}
          <div>
            {/* Account Status Card */}
            <div className="card mb-3">
              <div className="section-title">Identity &amp; Status</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', background: 'var(--bg)', borderRadius: 10,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>KYC Status</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {isKycVerified ? 'Verified account with full withdrawal access' : 'Verification required for withdrawals'}
                    </div>
                  </div>
                  <Link
                    href="/kyc"
                    style={{
                      background: isKycVerified ? 'rgba(0,217,126,0.1)' : 'rgba(255,184,0,0.1)',
                      border: `1px solid ${isKycVerified ? 'var(--accent-green)' : 'var(--accent-amber)'}`,
                      color: isKycVerified ? 'var(--accent-green)' : 'var(--accent-amber)',
                      padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none',
                    }}
                  >
                    {isKycVerified ? 'View KYC' : 'Complete KYC →'}
                  </Link>
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', background: 'var(--bg)', borderRadius: 10,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Cash Balance</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Available USD in account</div>
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>
                    ${parseFloat(user?.usd_balance || '0').toFixed(2)}
                  </div>
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', background: 'var(--bg)', borderRadius: 10,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Member Since</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {user?.date_joined ? new Date(user.date_joined).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Change Password Card */}
            <div className="card">
              <div className="section-title">Change Password</div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Ensure your account is protected with a strong password.
              </p>

              {passMsg && (
                <div style={{
                  background: passMsg.type === 'ok' ? 'rgba(0,217,126,0.08)' : 'rgba(255,71,87,0.08)',
                  border: `1px solid ${passMsg.type === 'ok' ? 'rgba(0,217,126,0.3)' : 'rgba(255,71,87,0.3)'}`,
                  borderRadius: 10, padding: '10px 14px', marginBottom: '1.25rem',
                  fontSize: 13, color: passMsg.type === 'ok' ? 'var(--accent-green)' : 'var(--accent-red)',
                }}>
                  {passMsg.type === 'ok' ? '✅' : '⚠️'} {passMsg.text}
                </div>
              )}

              <form onSubmit={handleChangePassword}>
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Enter current password"
                    value={currentPass}
                    onChange={e => setCurrentPass(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Min. 8 characters"
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Repeat new password"
                    value={newPass2}
                    onChange={e => setNewPass2(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '0.5rem' }}
                  disabled={passLoading}
                >
                  {passLoading ? 'Updating Password...' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

