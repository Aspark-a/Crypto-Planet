import { useApp } from '../../context/AppContext'
import { Card, Badge, StatCard, PageHeader, Spinner } from '../../components/shared/UI'

// Viewer reuses trader pages for Charts, Alerts, Support, Account
export { TraderCharts as ViewerCharts, TraderAlerts as ViewerAlerts, TraderSupport as ViewerSupport, TraderAccount as ViewerAccount } from '../trader/TraderPages'

export function ViewerMarketFull() {
  const { assets, assetsLoading, globalMetrics } = useApp()

  if (assetsLoading) return <Spinner />

  return (
    <div>
      <PageHeader title="Market Info" subtitle="Live cryptocurrency market data" />
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:24 }}>
        <StatCard label="Total Market Cap" value={globalMetrics?.totalMarketCap||'…'} accent="var(--accent)" icon="🌐" />
        <StatCard label="24h Volume"        value={globalMetrics?.totalVolume||'…'}    icon="📊" />
        <StatCard label="BTC Dominance"     value={globalMetrics?.btcDominance||'…'}   icon="₿" />
        <StatCard label="Active Cryptos"    value={globalMetrics?.activeCryptos||'…'}  icon="◈" />
      </div>
      <Card>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12 }}>
          {assets.map(a => (
            <div key={a.symbol} style={{
              background:'var(--bg2)', borderRadius:10, padding:16,
              border:`1px solid ${a.change>=0?'rgba(0,255,136,0.15)':'rgba(255,71,87,0.15)'}`,
              transition:'transform 0.1s',cursor:'default',
            }}
              onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
            >
              <div style={{ display:'flex',justifyContent:'space-between',marginBottom:8 }}>
                <span style={{ fontSize:24 }}>{a.logo}</span>
                <Badge variant={a.change>=0?'success':'danger'}>{a.change>=0?'+':''}{a.change}%</Badge>
              </div>
              <div style={{ fontSize:14,fontWeight:700,marginBottom:2 }}>{a.symbol}</div>
              <div style={{ fontSize:12,color:'var(--text3)',marginBottom:8 }}>{a.name}</div>
              <div style={{ fontSize:18,fontFamily:'var(--mono)',fontWeight:700 }}>
                ${a.price>=1?a.price.toLocaleString():a.price}
              </div>
              <div style={{ fontSize:11,color:'var(--text3)',marginTop:6,display:'flex',justifyContent:'space-between' }}>
                <span>Vol: {a.volume}</span>
                <span>Cap: {a.marketCap}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
