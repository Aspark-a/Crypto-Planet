import { useApp } from '../../context/AppContext'
import logo from '../../assets/logo.png'

const adminNav = [
  { id: 'admin-dashboard',     label: 'Dashboard',      icon: '⊞' },
  { id: 'admin-users',         label: 'Users',           icon: '👥' },
  { id: 'admin-transactions',  label: 'Transactions',    icon: '↔' },
  { id: 'admin-assets',        label: 'Assets',          icon: '◈' },
  { id: 'admin-pairs',         label: 'Trading Pairs',   icon: '⇄' },
  { id: 'admin-reports',       label: 'Reports',         icon: '📊' },
  { id: 'admin-notifications', label: 'Notifications',   icon: '🔔' },
  { id: 'admin-support',       label: 'Support',         icon: '🎧' },
  { id: 'admin-security',      label: 'Security',        icon: '🛡' },
  { id: 'admin-api',           label: 'API',             icon: '⚙' },
  { id: 'admin-finance',       label: 'Finance',         icon: '💰' },
  { id: 'admin-fees',          label: 'Fees',            icon: '%' },
  { id: 'admin-promotions',    label: 'Promotions',      icon: '🎁' },
]

const traderNav = [
  { id: 'trader-market',      label: 'Market',          icon: '📈' },
  { id: 'trader-trade',       label: 'Trade',           icon: '⇄' },
  { id: 'trader-history',     label: 'History',         icon: '🕐' },
  { id: 'trader-assets',      label: 'My Assets',       icon: '◈' },
  { id: 'trader-alerts',      label: 'Price Alerts',    icon: '🔔' },
  { id: 'trader-charts',      label: 'Charts',          icon: '📊' },
  { id: 'trader-payments',    label: 'Payments',        icon: '💳' },
  { id: 'trader-promotions',  label: 'Promotions',      icon: '🎁' },
  { id: 'trader-support',     label: 'Support',         icon: '🎧' },
  { id: 'trader-account',     label: 'Account',         icon: '👤' },
]

const viewerNav = [
  { id: 'viewer-market',  label: 'Market',       icon: '📈' },
  { id: 'viewer-charts',  label: 'Charts',       icon: '📊' },
  { id: 'viewer-alerts',  label: 'Price Alerts', icon: '🔔' },
  { id: 'viewer-support', label: 'Support',      icon: '🎧' },
  { id: 'viewer-account', label: 'Account',      icon: '👤' },
]

export default function Sidebar() {
  const { currentUser, page, navigate, logout } = useApp()
  if (!currentUser) return null

  const navItems = currentUser.role === 'admin' ? adminNav
    : currentUser.role === 'trader' ? traderNav : viewerNav

  const roleColor = currentUser.role === 'admin' ? '#FFD700'
    : currentUser.role === 'trader' ? 'var(--green)' : 'var(--accent)'

  return (
    <aside style={{ width: 220, minHeight: '100vh', background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <img src={logo} alt="Crypto Planet" style={{ width: '100%', maxWidth: 160, display: 'block', filter: 'brightness(0) invert(1)', opacity: 0.92 }} />
      </div>

      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{currentUser.name || currentUser.displayName}</div>
        <div style={{ fontSize: 11, color: roleColor, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>{currentUser.role}</div>
      </div>

      <nav style={{ flex: 1, padding: '10px', overflowY: 'auto' }}>
        {navItems.map(item => {
          const isActive = page === item.id
          return (
            <button key={item.id} onClick={() => navigate(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '9px 12px', borderRadius: 8, border: 'none',
              background: isActive ? 'rgba(0,212,255,0.12)' : 'transparent',
              color: isActive ? 'var(--accent)' : 'var(--text2)',
              fontFamily: 'var(--font)', fontSize: 13, fontWeight: isActive ? 600 : 400,
              cursor: 'pointer', textAlign: 'left', marginBottom: 2,
              borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'all 0.1s',
            }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>

      <div style={{ padding: '14px 10px', borderTop: '1px solid var(--border)' }}>
        <button onClick={logout} style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: '9px 12px', borderRadius: 8, border: 'none',
          background: 'transparent', color: 'var(--red)',
          fontFamily: 'var(--font)', fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'left',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,71,87,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{ fontSize: 15 }}>⏻</span> Sign Out
        </button>
      </div>
    </aside>
  )
}
