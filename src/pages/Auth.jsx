import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Button, Input, Card } from '../components/shared/UI'
import logo from '../assets/logo.png'

const ADMIN_EMAIL = 'peterphat1710@gmail.com'

function AuthLayout({ children }) {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(0,212,255,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440, padding: '20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src={logo} alt="Crypto Planet" style={{ width: 200, marginBottom: 8, filter: 'brightness(0) invert(1)', opacity: 0.92 }} />
          <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>Your gateway to crypto trading</p>
        </div>
        {children}
      </div>
    </div>
  )
}

export function LoginPage() {
  const { login, navigate } = useApp()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  // Detect role from email so user never has to pick manually
  const detectedRole = email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : null

  const handleLogin = async () => {
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setLoading(true); setError('')
    const result = await login(email, password)
    if (!result.ok) setError(result.error || 'Login failed. Check your credentials.')
    setLoading(false)
  }

  const handleKey = (e) => { if (e.key === 'Enter') handleLogin() }

  return (
    <AuthLayout>
      <Card>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24 }}>Sign In</h2>

        {detectedRole === 'admin' && (
          <div style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:'rgba(255,215,0,0.08)',border:'1px solid rgba(255,215,0,0.25)',borderRadius:8,marginBottom:16 }}>
            <span style={{ fontSize:16 }}>🛡</span>
            <span style={{ fontSize:12,color:'var(--gold)',fontWeight:600 }}>Admin account detected</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            placeholder="your@email.com"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            placeholder="••••••••"
            onKeyDown={handleKey}
          />
        </div>

        {error && (
          <div style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:'rgba(255,71,87,0.08)',border:'1px solid rgba(255,71,87,0.25)',borderRadius:8,marginTop:14 }}>
            <span>⚠️</span>
            <span style={{ fontSize:12,color:'var(--red)' }}>{error}</span>
          </div>
        )}

        <Button onClick={handleLogin} size="lg" disabled={loading} style={{ width: '100%', marginTop: 20 }}>
          {loading ? 'Signing in…' : 'Sign In'}
        </Button>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text2)' }}>
          Don't have an account?{' '}
          <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate('register')}>
            Register
          </span>
        </p>
      </Card>
    </AuthLayout>
  )
}

export function RegisterPage() {
  const { register, navigate } = useApp()
  const [form, setForm]     = useState({ name:'', email:'', password:'', confirm:'', role:'trader' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password) { setError('All fields are required.'); return }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true); setError('')
    const result = await register(form.name, form.email, form.password, form.role)
    if (result.ok) {
      setSuccess(true)
      setTimeout(() => navigate('login'), 2500)
    } else {
      setError(result.error || 'Registration failed.')
    }
    setLoading(false)
  }

  return (
    <AuthLayout>
      <Card>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24 }}>Create Account</h2>
        {success ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <p style={{ color: 'var(--green)', fontWeight: 600, marginBottom: 6 }}>Account created!</p>
            <p style={{ fontSize: 13, color: 'var(--text2)' }}>Redirecting to login…</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input label="Full Name"        value={form.name}    onChange={e => update('name', e.target.value)}    placeholder="Alice Nguyen" />
            <Input label="Email" type="email" value={form.email} onChange={e => update('email', e.target.value)}   placeholder="alice@example.com" />
            <Input label="Password" type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Min 6 characters" />
            <Input label="Confirm Password" type="password" value={form.confirm} onChange={e => update('confirm', e.target.value)} placeholder="••••••••" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>Account Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['trader', 'viewer'].map(r => (
                  <button key={r} onClick={() => update('role', r)} style={{
                    flex: 1, padding: '10px', borderRadius: 8, border: '1px solid',
                    borderColor: form.role === r ? 'var(--accent)' : 'var(--border)',
                    background:  form.role === r ? 'rgba(0,212,255,0.1)' : 'transparent',
                    color:       form.role === r ? 'var(--accent)' : 'var(--text2)',
                    fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer',
                  }}>
                    {r === 'trader' ? '⇄ Trader' : '👁 Viewer'}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:'rgba(255,71,87,0.08)',border:'1px solid rgba(255,71,87,0.25)',borderRadius:8 }}>
                <span>⚠️</span>
                <span style={{ fontSize:12,color:'var(--red)' }}>{error}</span>
              </div>
            )}

            <Button onClick={handleRegister} size="lg" disabled={loading} style={{ width: '100%', marginTop: 4 }}>
              {loading ? 'Creating account…' : 'Create Account'}
            </Button>
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text2)' }}>
          Already have an account?{' '}
          <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate('login')}>Sign in</span>
        </p>
      </Card>
    </AuthLayout>
  )
}
