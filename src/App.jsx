import { useEffect } from 'react'
import { useApp } from './context/AppContext'
import Sidebar from './components/shared/Sidebar'
import { TickerBar } from './components/shared/UI'
import { LoginPage, RegisterPage } from './pages/Auth'

import {
  AdminDashboard, AdminUsers, AdminTransactions, AdminAssets,
  AdminTradingPairs, AdminReports, AdminNotifications, AdminSupport,
  AdminSecurity, AdminAPI, AdminFinance, AdminFees, AdminPromotions,
} from './pages/admin/AdminPages'

import {
  TraderMarket, TraderTrade, TraderHistory, TraderAssets,
  TraderCharts, TraderAlerts, TraderPayments, TraderPromotions,
  TraderSupport, TraderAccount,
} from './pages/trader/TraderPages'

import {
  ViewerMarketFull, ViewerCharts, ViewerAlerts,
  ViewerSupport, ViewerAccount,
} from './pages/viewer/ViewerPages'

const pageMap = {
  login: LoginPage, register: RegisterPage,
  'admin-dashboard': AdminDashboard, 'admin-users': AdminUsers,
  'admin-transactions': AdminTransactions, 'admin-assets': AdminAssets,
  'admin-pairs': AdminTradingPairs, 'admin-reports': AdminReports,
  'admin-notifications': AdminNotifications, 'admin-support': AdminSupport,
  'admin-security': AdminSecurity, 'admin-api': AdminAPI,
  'admin-finance': AdminFinance, 'admin-fees': AdminFees,
  'admin-promotions': AdminPromotions,
  'trader-market': TraderMarket, 'trader-trade': TraderTrade,
  'trader-history': TraderHistory, 'trader-assets': TraderAssets,
  'trader-charts': TraderCharts, 'trader-alerts': TraderAlerts,
  'trader-payments': TraderPayments, 'trader-promotions': TraderPromotions,
  'trader-support': TraderSupport, 'trader-account': TraderAccount,
  'viewer-market': ViewerMarketFull, 'viewer-charts': ViewerCharts,
  'viewer-alerts': ViewerAlerts, 'viewer-support': ViewerSupport,
  'viewer-account': ViewerAccount,
}

export default function App() {
  const { page, currentUser, authLoading, assets } = useApp()

  // Hide splash once app is ready
  useEffect(() => {
    if (!authLoading) window.__hideSplash?.()
  }, [authLoading])

  // Show nothing while auth resolves (splash handles it)
  if (authLoading) return null

  const PageComponent = pageMap[page] || LoginPage

  if (!currentUser) return <PageComponent />

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TickerBar assets={assets} />
        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', background: 'var(--bg)' }}>
          <PageComponent />
        </main>
      </div>
    </div>
  )
}
