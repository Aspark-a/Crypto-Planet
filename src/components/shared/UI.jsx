import { useState } from 'react'

export const styles = {
  card: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '20px',
  },
}

export function Card({ children, style }) {
  return <div style={{ ...styles.card, ...style }}>{children}</div>
}

export function Button({ children, variant = 'primary', onClick, style, size = 'md', disabled }) {
  const variants = {
    primary: { background: 'var(--accent)', color: '#0A0E1A' },
    success: { background: 'var(--green)', color: '#0A0E1A' },
    danger:  { background: 'var(--red)', color: '#fff' },
    ghost:   { background: 'transparent', color: 'var(--text2)', border: '1px solid var(--border)' },
    outline: { background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)' },
  }
  const sizes = {
    sm: { padding: '5px 12px', fontSize: '12px' },
    md: { padding: '8px 18px', fontSize: '13px' },
    lg: { padding: '12px 28px', fontSize: '15px' },
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{
      borderRadius: 8, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'var(--font)', fontWeight: 600, transition: 'all 0.15s',
      opacity: disabled ? 0.5 : 1,
      ...variants[variant], ...sizes[size], ...style,
    }}>
      {children}
    </button>
  )
}

export function Badge({ children, variant = 'default' }) {
  const variants = {
    success: { background: 'rgba(0,255,136,0.15)', color: 'var(--green)', border: '1px solid rgba(0,255,136,0.3)' },
    danger:  { background: 'rgba(255,71,87,0.15)',  color: 'var(--red)',   border: '1px solid rgba(255,71,87,0.3)' },
    warning: { background: 'rgba(255,215,0,0.15)',  color: 'var(--gold)',  border: '1px solid rgba(255,215,0,0.3)' },
    info:    { background: 'rgba(0,212,255,0.15)',  color: 'var(--accent)',border: '1px solid rgba(0,212,255,0.3)' },
    default: { background: 'var(--card2)', color: 'var(--text2)', border: '1px solid var(--border)' },
  }
  return (
    <span style={{
      ...variants[variant],
      padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
      fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', display: 'inline-block',
    }}>{children}</span>
  )
}

export function Input({ label, type = 'text', value, onChange, placeholder, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>{label}</label>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '10px 14px', color: 'var(--text)', fontFamily: 'var(--font)',
          fontSize: 14, outline: 'none', ...style,
        }} />
    </div>
  )
}

export function Select({ label, value, onChange, options, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>{label}</label>}
      <select value={value} onChange={onChange} style={{
        background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
        padding: '10px 14px', color: 'var(--text)', fontFamily: 'var(--font)',
        fontSize: 14, outline: 'none', cursor: 'pointer', ...style,
      }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export function Table({ columns, data, onRowClick }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={{
                padding: '10px 16px', textAlign: col.align || 'left',
                fontSize: 11, fontWeight: 600, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: '0.8px',
                borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
              }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} onClick={() => onRowClick && onRowClick(row)}
              style={{ borderBottom: '1px solid var(--border)', cursor: onRowClick ? 'pointer' : 'default', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {columns.map(col => (
                <td key={col.key} style={{
                  padding: '12px 16px', fontSize: 13, color: 'var(--text)',
                  textAlign: col.align || 'left',
                  fontFamily: col.mono ? 'var(--mono)' : 'var(--font)',
                }}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ ...styles.card, minWidth: 400, maxWidth: 560, width: '90%', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function StatCard({ label, value, sub, accent, icon }) {
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</span>
        {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--mono)', color: accent || 'var(--text)' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: sub.startsWith('+') ? 'var(--green)' : sub.startsWith('-') ? 'var(--red)' : 'var(--text2)' }}>{sub}</div>}
    </Card>
  )
}

export function TickerBar({ assets }) {
  return (
    <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '8px 0', overflow: 'hidden', whiteSpace: 'nowrap' }}>
      <div style={{ display: 'inline-flex', animation: 'ticker 40s linear infinite', gap: 40 }}>
        {[...assets, ...assets].map((a, i) => (
          <span key={i} style={{ fontSize: 12, fontFamily: 'var(--mono)' }}>
            <span style={{ color: 'var(--text2)' }}>{a.symbol}/USDT </span>
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>${a.price >= 1 ? a.price.toLocaleString() : a.price} </span>
            <span style={{ color: a.change >= 0 ? 'var(--green)' : 'var(--red)' }}>{a.change >= 0 ? '▲' : '▼'} {Math.abs(a.change)}%</span>
          </span>
        ))}
      </div>
      <style>{`@keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: 'var(--text2)' }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 10 }}>{actions}</div>}
    </div>
  )
}

export function EmptyState({ icon, message, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text2)' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon || '📭'}</div>
      <p style={{ fontSize: 14, marginBottom: action ? 20 : 0 }}>{message}</p>
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div style={{ textAlign: 'center', padding: '50px 20px' }}>
      <div style={{ fontSize: 40, marginBottom: 14 }}>⚠️</div>
      <p style={{ fontSize: 14, color: 'var(--red)', marginBottom: 16, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
        {message || 'Something went wrong loading this data.'}
      </p>
      {onRetry && <Button variant="outline" onClick={onRetry}>Try Again</Button>}
    </div>
  )
}

export function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '3px solid var(--border)', borderTopColor: 'var(--accent)',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
