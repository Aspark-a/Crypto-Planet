import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { onAuthChange, loginUser, logoutUser, registerUser } from '../services/firebaseService'
import { fetchTopCryptos, fetchGlobalMetrics, MOCK_ASSETS } from '../services/cryptoApi'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser]     = useState(null)
  const [authLoading, setAuthLoading]     = useState(true)
  const [page, setPage]                   = useState('login')
  const [assets, setAssets]               = useState(MOCK_ASSETS)  // start with mock instantly
  const [globalMetrics, setGlobalMetrics] = useState(null)
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [transactions, setTransactions]   = useState([])
  const [alerts, setAlerts]               = useState([])
  const intervalRef = useRef(null)

  // ── Firebase auth listener ───────────────────────────────────────────────
  // Set a max wait of 3s — if Firebase doesn't respond, go to login anyway
  useEffect(() => {
    const timeout = setTimeout(() => setAuthLoading(false), 3000)
    const unsub = onAuthChange((user) => {
      clearTimeout(timeout)
      setCurrentUser(user)
      setAuthLoading(false)
      if (user) {
        setPage(
          user.role === 'admin'  ? 'admin-dashboard' :
          user.role === 'trader' ? 'trader-market'   : 'viewer-market'
        )
        // Hide splash screen once auth resolves
        window.__hideSplash?.()
      } else {
        setPage('login')
        window.__hideSplash?.()
      }
    })
    return () => { unsub(); clearTimeout(timeout) }
  }, [])

  // ── Crypto prices — load immediately but don't block auth ────────────────
  const loadAssets = useCallback(async () => {
    setAssetsLoading(true)
    try {
      const [cryptos, metrics] = await Promise.all([
        fetchTopCryptos(20),
        fetchGlobalMetrics(),
      ])
      setAssets(cryptos)
      setGlobalMetrics(metrics)
    } catch(e) {
      console.warn('Asset load error', e)
    } finally {
      setAssetsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Small delay so auth fires first and page renders faster
    const t = setTimeout(loadAssets, 500)
    intervalRef.current = setInterval(loadAssets, 60000)
    return () => { clearTimeout(t); clearInterval(intervalRef.current) }
  }, [loadAssets])

  // ── Auth actions ─────────────────────────────────────────────────────────
  const login = async (email, password) => {
    try {
      const user = await loginUser(email, password)
      setCurrentUser(user)
      setPage(
        user.role === 'admin'  ? 'admin-dashboard' :
        user.role === 'trader' ? 'trader-market'   : 'viewer-market'
      )
      return { ok: true }
    } catch(err) {
      return { ok: false, error: err.message }
    }
  }

  const register = async (name, email, password, role) => {
    try {
      await registerUser(name, email, password, role)
      return { ok: true }
    } catch(err) {
      return { ok: false, error: err.message }
    }
  }

  const logout = async () => {
    await logoutUser()
    setCurrentUser(null)
    setTransactions([])
    setAlerts([])
    setPage('login')
  }

  const navigate = (p) => setPage(p)

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser, authLoading, page, navigate, login, logout, register,
      assets, assetsLoading, globalMetrics, loadAssets,
      transactions, setTransactions,
      alerts, setAlerts,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
