import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { Card, Button, Badge, Table, Modal, Input, Select, StatCard, PageHeader, EmptyState, ErrorState, Spinner } from '../../components/shared/UI'
import { saveTransaction, getUserTransactions, saveAlert, getUserAlerts, deleteAlert, saveTicket, updateUserProfile } from '../../services/firebaseService'
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { auth } from '../../firebase'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const generateChartData = (base, points = 30) =>
  Array.from({ length: points }, (_, i) => ({
    time: `${i + 1}`,
    price: Math.round(base * (0.95 + Math.random() * 0.1) * 100) / 100,
  }))

// ── Market ────────────────────────────────────────────────────────────────
export function TraderMarket() {
  const { assets, assetsLoading, globalMetrics } = useApp()
  const [selected, setSelected] = useState(null)
  useEffect(() => { if (assets.length && !selected) setSelected(assets[0]) }, [assets])
  if (assetsLoading || !selected) return <Spinner />
  return (
    <div>
      <PageHeader title="Market Overview" subtitle="Live cryptocurrency prices" />
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }}>
        <div>
          <Card style={{ marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20 }}>
              <div style={{ fontSize:36 }}>{selected.logo}</div>
              <div>
                <div style={{ fontSize:18, fontWeight:700 }}>{selected.name} <span style={{ color:'var(--text2)', fontSize:14 }}>{selected.symbol}</span></div>
                <div style={{ fontSize:28, fontFamily:'var(--mono)', fontWeight:700 }}>${selected.price.toLocaleString()}</div>
              </div>
              <div style={{ marginLeft:'auto', textAlign:'right' }}>
                <Badge variant={selected.change>=0?'success':'danger'}>{selected.change>=0?'▲':'▼'} {Math.abs(selected.change)}%</Badge>
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:6 }}>Vol: {selected.volume}</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={generateChartData(selected.price)}>
                <defs>
                  <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={selected.change>=0?'#00FF88':'#FF4757'} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={selected.change>=0?'#00FF88':'#FF4757'} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide /><YAxis domain={['auto','auto']} hide />
                <Tooltip contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }}/>
                <Area type="monotone" dataKey="price" stroke={selected.change>=0?'#00FF88':'#FF4757'} fill="url(#pg)" strokeWidth={2} dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            <StatCard label="Mkt Cap"  value={globalMetrics?.totalMarketCap||'…'} icon="🌐"/>
            <StatCard label="24h Vol"  value={globalMetrics?.totalVolume||'…'}    icon="📊"/>
            <StatCard label="BTC Dom." value={globalMetrics?.btcDominance||'…'}   icon="₿"/>
            <StatCard label="Cryptos"  value={globalMetrics?.activeCryptos||'…'}  icon="◈"/>
          </div>
        </div>
        <Card style={{ maxHeight:500, overflowY:'auto' }}>
          <h3 style={{ fontSize:13, fontWeight:600, marginBottom:12, color:'var(--text2)' }}>ALL ASSETS</h3>
          {assets.map(a => (
            <div key={a.symbol} onClick={() => setSelected(a)} style={{
              display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'10px 8px', borderRadius:8, cursor:'pointer', marginBottom:2,
              background: selected?.symbol===a.symbol?'rgba(0,212,255,0.08)':'transparent',
            }}
              onMouseEnter={e=>{ if(selected?.symbol!==a.symbol) e.currentTarget.style.background='rgba(255,255,255,0.03)' }}
              onMouseLeave={e=>{ if(selected?.symbol!==a.symbol) e.currentTarget.style.background='transparent' }}
            >
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:18 }}>{a.logo}</span>
                <div><div style={{ fontSize:13, fontWeight:600 }}>{a.symbol}</div><div style={{ fontSize:11, color:'var(--text3)' }}>{a.name}</div></div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:13, fontFamily:'var(--mono)', fontWeight:600 }}>${a.price>=1?a.price.toLocaleString():a.price}</div>
                <div style={{ fontSize:11, color:a.change>=0?'var(--green)':'var(--red)' }}>{a.change>=0?'+':''}{a.change}%</div>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

// ── Trade ─────────────────────────────────────────────────────────────────
export function TraderTrade() {
  const { assets, currentUser, setCurrentUser } = useApp()
  const [tab, setTab]         = useState('buy')
  const [pair, setPair]       = useState('BTC/USDT')
  const [amount, setAmount]   = useState('')
  const [price, setPrice]     = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError]     = useState('')
  const [transactions, setTransactions] = useState([])
  const [balLoading, setBalLoading]     = useState(true)

  useEffect(() => {
    getUserTransactions(currentUser.uid)
      .then(t => { setTransactions(t); setBalLoading(false) })
      .catch(() => setBalLoading(false))
  }, [currentUser.uid])

  // Build balances from completed transactions
  const balances = {}
  transactions.filter(t => t.status === 'completed').forEach(t => {
    const [base, quote] = (t.pair || '/').split('/')
    if (t.type === 'buy') {
      balances[base]  = (balances[base]  || 0) + parseFloat(t.amount || 0)
      balances[quote] = (balances[quote] || 0) - parseFloat(t.total  || 0)
    } else if (t.type === 'sell') {
      balances[base]  = (balances[base]  || 0) - parseFloat(t.amount || 0)
      balances[quote] = (balances[quote] || 0) + parseFloat(t.total  || 0)
    } else if (t.type === 'deposit') {
      const sym = t.pair?.split('/')[0]; if (sym) balances[sym] = (balances[sym] || 0) + parseFloat(t.total || 0)
    } else if (t.type === 'withdraw') {
      const sym = t.pair?.split('/')[0]; if (sym) balances[sym] = (balances[sym] || 0) - parseFloat(t.total || 0)
    }
  })
  Object.keys(balances).forEach(k => { if (balances[k] < 0) balances[k] = 0 })

  const selectedAsset = assets.find(a => `${a.symbol}/USDT` === pair) || assets[0]
  const baseSymbol  = pair.split('/')[0]
  const quoteSymbol = pair.split('/')[1] || 'USDT'
  const baseBalance  = balances[baseSymbol]  || 0
  const quoteBalance = (quoteSymbol === 'USDT' && currentUser?.balance != null)
    ? Math.max(0, Number(currentUser.balance))
    : (balances[quoteSymbol] || 0)

  useEffect(() => { if (selectedAsset) setPrice(selectedAsset.price.toString()) }, [pair, assets])

  const total        = (parseFloat(amount || 0) * parseFloat(price || 0)).toFixed(2)
  const fee          = (parseFloat(total) * 0.001).toFixed(4)
  const totalWithFee = parseFloat(total) + parseFloat(fee)

  const getInsufficientReason = () => {
    if (!amount || parseFloat(amount) <= 0) return null
    if (tab === 'buy'  && totalWithFee > quoteBalance)
      return `Insufficient ${quoteSymbol}. You have ${quoteBalance.toLocaleString('en',{maximumFractionDigits:4})} ${quoteSymbol} but need ${totalWithFee.toLocaleString('en',{maximumFractionDigits:4})}`
    if ((tab === 'sell' || tab === 'exchange') && parseFloat(amount) > baseBalance)
      return `Insufficient ${baseSymbol}. You have ${baseBalance.toLocaleString('en',{maximumFractionDigits:6})} ${baseSymbol} but need ${parseFloat(amount).toLocaleString('en',{maximumFractionDigits:6})}`
    return null
  }
  const insufficientReason = getInsufficientReason()
  const canTrade = !insufficientReason && parseFloat(amount || 0) > 0 && parseFloat(price || 0) > 0

  const setMax = () => {
    if (tab === 'buy' && parseFloat(price) > 0) setAmount((quoteBalance / (parseFloat(price) * 1.001)).toFixed(6))
    else setAmount(baseBalance.toFixed(6))
  }

  const execute = async () => {
    if (!canTrade) return
    setLoading(true); setError('')
    try {
      const txn = { user:currentUser.name||currentUser.email, type:tab, pair, amount:parseFloat(amount), price:parseFloat(price), total:parseFloat(total), status:'completed', time:new Date().toISOString() }
      const { id:realId, balance:nextBalance } = await saveTransaction(currentUser.uid, txn)
      setTransactions(prev => [{ id:realId, uid:currentUser.uid, ...txn }, ...prev])
      if (nextBalance != null && setCurrentUser) {
        setCurrentUser(prev => prev ? { ...prev, balance: nextBalance } : prev)
      }
      setSuccess(txn); setAmount('')
    } catch(e) { setError('Transaction failed: '+e.message) }
    setLoading(false)
  }

  const BalancePill = ({ symbol, value, highlight }) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', borderRadius:8, background:highlight?'rgba(0,212,255,0.08)':'var(--bg2)', border:`1px solid ${highlight?'rgba(0,212,255,0.25)':'var(--border)'}` }}>
      <span style={{ fontSize:13, color:'var(--text2)', fontWeight:500 }}>{symbol} Balance</span>
      <span style={{ fontFamily:'var(--mono)', fontSize:14, fontWeight:700, color:value>0?'var(--text)':'var(--text3)' }}>
        {value>0?value.toLocaleString('en',{maximumFractionDigits:symbol==='USDT'?2:6}):'0.00'}
        <span style={{ fontSize:11, color:'var(--text3)', marginLeft:4 }}>{symbol}</span>
      </span>
    </div>
  )

  return (
    <div>
      <PageHeader title="Trade" subtitle="Buy, sell and exchange crypto"/>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <Card>
          {/* Tab selector */}
          <div style={{ display:'flex', gap:8, marginBottom:20 }}>
            {['buy','sell','exchange'].map(t=>(
              <button key={t} onClick={()=>{ setTab(t); setSuccess(null); setError(''); setAmount('') }} style={{
                flex:1, padding:'10px', borderRadius:8, border:'none', cursor:'pointer',
                fontFamily:'var(--font)', fontWeight:600, fontSize:13, textTransform:'capitalize',
                background:tab===t?(t==='buy'?'var(--green)':t==='sell'?'var(--red)':'var(--accent)'):'var(--bg2)',
                color:tab===t?'#0A0E1A':'var(--text2)',
              }}>{t}</button>
            ))}
          </div>

          {success ? (
            <div style={{ textAlign:'center', padding:'30px 0' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
              <div style={{ fontSize:16, fontWeight:600, color:'var(--green)', marginBottom:8 }}>Order Executed!</div>
              <div style={{ fontSize:13, color:'var(--text2)' }}>{success.type.toUpperCase()} {success.amount} {baseSymbol} @ ${parseFloat(success.price).toLocaleString()}</div>
              <div style={{ fontSize:20, fontFamily:'var(--mono)', fontWeight:700, marginTop:8, color:'var(--accent)' }}>Total: ${parseFloat(success.total).toLocaleString()}</div>
              <div style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>Fee paid: ${(parseFloat(success.total)*0.001).toFixed(4)} {quoteSymbol}</div>
              <Button variant="ghost" onClick={()=>setSuccess(null)} style={{ marginTop:16 }}>New Order</Button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

              {/* Live balance pills */}
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <div style={{ fontSize:11, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.6px' }}>
                  Your Balances {balLoading && <span style={{ color:'var(--text3)', fontWeight:400 }}>— loading…</span>}
                </div>
                <BalancePill symbol={quoteSymbol} value={quoteBalance} highlight={tab==='buy'}/>
                <BalancePill symbol={baseSymbol}  value={baseBalance}  highlight={tab==='sell'||tab==='exchange'}/>
              </div>

              <Select label="Trading Pair" value={pair} onChange={e=>setPair(e.target.value)}
                options={assets.map(a=>({ value:`${a.symbol}/USDT`, label:`${a.symbol}/USDT — $${a.price>=1?a.price.toLocaleString():a.price}` }))}/>
              <Input label="Price (USDT)" type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="0.00"/>

              {/* Amount + MAX button */}
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <label style={{ fontSize:12, color:'var(--text2)', fontWeight:500 }}>Amount ({baseSymbol})</label>
                  <button onClick={setMax} style={{ fontSize:11, fontWeight:700, color:'var(--accent)', background:'rgba(0,212,255,0.1)', border:'1px solid rgba(0,212,255,0.25)', borderRadius:4, padding:'2px 8px', cursor:'pointer', fontFamily:'var(--font)' }}>MAX</button>
                </div>
                <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"
                  style={{ background:'var(--bg2)', border:`1px solid ${insufficientReason?'var(--red)':'var(--border)'}`, borderRadius:8, padding:'10px 14px', color:'var(--text)', fontFamily:'var(--font)', fontSize:14, outline:'none' }}/>
              </div>

              {/* Order summary */}
              <div style={{ padding:12, background:'var(--bg2)', borderRadius:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6 }}>
                  <span style={{ color:'var(--text2)' }}>Subtotal</span>
                  <span style={{ fontFamily:'var(--mono)' }}>${parseFloat(total).toLocaleString()}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text3)', marginBottom:6 }}>
                  <span>Fee (0.1%)</span>
                  <span style={{ fontFamily:'var(--mono)' }}>${fee}</span>
                </div>
                <div style={{ borderTop:'1px solid var(--border)', paddingTop:6, display:'flex', justifyContent:'space-between', fontWeight:700 }}>
                  <span style={{ fontSize:13 }}>Total</span>
                  <span style={{ fontFamily:'var(--mono)', color:'var(--accent)', fontSize:16 }}>${totalWithFee.toLocaleString('en',{maximumFractionDigits:4})} {quoteSymbol}</span>
                </div>
                {parseFloat(amount)>0 && parseFloat(price)>0 && (
                  <div style={{ borderTop:'1px solid var(--border)', paddingTop:6, marginTop:6, display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text3)' }}>
                    <span>{tab==='buy'?`${quoteSymbol} remaining`:`${baseSymbol} remaining`}</span>
                    <span style={{ fontFamily:'var(--mono)', color:insufficientReason?'var(--red)':'var(--green)' }}>
                      {tab==='buy'
                        ? (quoteBalance-totalWithFee).toLocaleString('en',{maximumFractionDigits:2})
                        : (baseBalance-parseFloat(amount||0)).toLocaleString('en',{maximumFractionDigits:6})
                      }
                    </span>
                  </div>
                )}
              </div>

              {/* Insufficient funds warning */}
              {insufficientReason && (
                <div style={{ padding:'10px 14px', background:'rgba(255,71,87,0.08)', border:'1px solid rgba(255,71,87,0.3)', borderRadius:8, fontSize:12, color:'var(--red)', lineHeight:1.5 }}>
                  🚫 {insufficientReason}
                  {tab==='buy' && quoteBalance===0 && (
                    <div style={{ marginTop:6, color:'var(--text3)' }}>Go to <strong style={{ color:'var(--accent)' }}>Payments → Deposit</strong> to add funds first.</div>
                  )}
                </div>
              )}
              {error && <div style={{ padding:'10px 14px', background:'rgba(255,71,87,0.08)', border:'1px solid rgba(255,71,87,0.25)', borderRadius:8, fontSize:12, color:'var(--red)' }}>⚠️ {error}</div>}

              <Button
                variant={tab==='buy'?'success':tab==='sell'?'danger':'primary'}
                size="lg" onClick={execute}
                disabled={loading||!canTrade}
                style={{ width:'100%', opacity:canTrade?1:0.5 }}
              >
                {loading?'Processing…'
                  :insufficientReason?`Insufficient ${tab==='buy'?quoteSymbol:baseSymbol}`
                  :tab==='buy'?`Buy ${baseSymbol}`
                  :tab==='sell'?`Sell ${baseSymbol}`
                  :'Exchange'}
              </Button>
            </div>
          )}
        </Card>

        {/* Order book + portfolio snapshot */}
        <Card>
          <h3 style={{ fontSize:13, fontWeight:600, marginBottom:16, color:'var(--text2)' }}>ORDER BOOK — {pair}</h3>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, color:'var(--red)', marginBottom:6, fontWeight:600 }}>ASKS (SELL)</div>
            {[4,3,2,1,0].map(i=>(
              <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:12, fontFamily:'var(--mono)', padding:'4px 0', color:'var(--red)' }}>
                <span>${selectedAsset?(selectedAsset.price*(1+(i+1)*0.002)).toLocaleString():'…'}</span>
                <span style={{ color:'var(--text3)' }}>{(Math.random()*2+0.1).toFixed(4)}</span>
              </div>
            ))}
          </div>
          <div style={{ textAlign:'center', padding:'10px 0', fontSize:20, fontFamily:'var(--mono)', fontWeight:700, borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', marginBottom:12, color:'var(--accent)' }}>
            ${selectedAsset?.price.toLocaleString()}
            <span style={{ fontSize:12, color:selectedAsset?.change>=0?'var(--green)':'var(--red)', marginLeft:6 }}>{selectedAsset?.change>=0?'▲':'▼'} {Math.abs(selectedAsset?.change||0)}%</span>
          </div>
          <div>
            <div style={{ fontSize:12, color:'var(--green)', marginBottom:6, fontWeight:600 }}>BIDS (BUY)</div>
            {[0,1,2,3,4].map(i=>(
              <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:12, fontFamily:'var(--mono)', padding:'4px 0', color:'var(--green)' }}>
                <span>${selectedAsset?(selectedAsset.price*(1-(i+1)*0.001)).toLocaleString():'…'}</span>
                <span style={{ color:'var(--text3)' }}>{(Math.random()*3+0.1).toFixed(4)}</span>
              </div>
            ))}
          </div>

          {/* Portfolio snapshot */}
          <div style={{ marginTop:20, padding:14, background:'var(--bg2)', borderRadius:8 }}>
            <div style={{ fontSize:11, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:10 }}>My Portfolio</div>
            {Object.entries(balances).filter(([,v])=>v>0).length===0?(
              <div style={{ fontSize:12, color:'var(--text3)', textAlign:'center', padding:'8px 0' }}>No holdings yet. Deposit funds to start.</div>
            ):Object.entries(balances).filter(([,v])=>v>0).map(([sym,val])=>{
              const asset = assets.find(a=>a.symbol===sym)
              const usdVal = asset ? asset.price*val : null
              return (
                <div key={sym} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
                  <span style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:600 }}>{sym}</span>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:'var(--mono)', fontSize:13 }}>{val.toLocaleString('en',{maximumFractionDigits:sym==='USDT'?2:6})}</div>
                    {usdVal&&<div style={{ fontSize:11, color:'var(--text3)' }}>≈ ${usdVal.toLocaleString('en',{maximumFractionDigits:2})}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ── History ───────────────────────────────────────────────────────────────
export function TraderHistory() {
  const { currentUser } = useApp()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [filter, setFilter]   = useState('all')

  const load = () => {
    setLoading(true); setError(null)
    getUserTransactions(currentUser.uid)
      .then(t=>{ setTransactions(t); setLoading(false) })
      .catch(e=>{ console.error('History load error:', e); setError(e.message); setLoading(false) })
  }
  useEffect(load, [currentUser.uid])

  if (loading) return <Spinner/>
  if (error) return <ErrorState message={`Failed to load transaction history: ${error}`} onRetry={load}/>
  const filtered = filter==='all'?transactions:transactions.filter(t=>t.status===filter||t.type===filter)

  return (
    <div>
      <PageHeader title="Transaction History" subtitle={`${transactions.length} total transactions`}/>
      <Card>
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
          {['all','buy','sell','exchange','completed'].map(f=>(
            <Button key={f} variant={filter===f?'primary':'ghost'} size="sm" onClick={()=>setFilter(f)} style={{ textTransform:'capitalize' }}>{f}</Button>
          ))}
        </div>
        {filtered.length===0?<EmptyState icon="📋" message="No transactions found"/>:(
          <Table
            columns={[
              { key:'id',     label:'ID',     mono:true, render:v=>v?.slice(0,8) },
              { key:'type',   label:'Type',   render:v=><Badge variant={v==='buy'?'success':v==='sell'?'danger':'info'}>{v}</Badge> },
              { key:'pair',   label:'Pair',   mono:true },
              { key:'amount', label:'Amount', mono:true, align:'right' },
              { key:'price',  label:'Price',  mono:true, align:'right', render:v=>`$${parseFloat(v||0).toLocaleString()}` },
              { key:'total',  label:'Total',  mono:true, align:'right', render:v=>`$${parseFloat(v||0).toLocaleString()}` },
              { key:'status', label:'Status', render:v=><Badge variant={v==='completed'?'success':v==='pending'?'warning':'danger'}>{v}</Badge> },
              { key:'time',   label:'Date',   render:v=><span style={{ fontSize:11, color:'var(--text3)' }}>{v?new Date(v).toLocaleDateString():''}</span> },
            ]}
            data={filtered}
          />
        )}
      </Card>
    </div>
  )
}

// ── Assets ────────────────────────────────────────────────────────────────
export function TraderAssets() {
  const { assets, currentUser } = useApp()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = () => {
    setLoading(true); setError(null)
    getUserTransactions(currentUser.uid)
      .then(t=>{ setTransactions(t); setLoading(false) })
      .catch(e=>{ console.error('Assets load error:', e); setError(e.message); setLoading(false) })
  }
  useEffect(load, [currentUser.uid])

  if (loading) return <Spinner/>
  if (error) return <ErrorState message={`Failed to load your portfolio: ${error}`} onRetry={load}/>

  const portfolio = {}
  transactions.filter(t=>t.type==='buy'&&t.status==='completed').forEach(t=>{
    const sym = t.pair?.split('/')[0]; if (!sym) return
    if (!portfolio[sym]) portfolio[sym]={ symbol:sym, amount:0, totalCost:0 }
    portfolio[sym].amount    += parseFloat(t.amount||0)
    portfolio[sym].totalCost += parseFloat(t.total||0)
  })
  transactions.filter(t=>t.type==='sell'&&t.status==='completed').forEach(t=>{
    const sym = t.pair?.split('/')[0]; if (!sym||!portfolio[sym]) return
    portfolio[sym].amount -= parseFloat(t.amount||0)
  })

  const holdings = Object.values(portfolio).filter(p=>p.amount>0).map(p=>{
    const asset = assets.find(a=>a.symbol===p.symbol)||{}
    const currentValue = (asset.price||0)*p.amount
    const pnl  = currentValue - p.totalCost
    const pnlPct = p.totalCost>0?(pnl/p.totalCost*100).toFixed(2):'0.00'
    return { ...p, ...asset, currentValue, pnl, pnlPct }
  })

  const totalValue = holdings.reduce((s,h)=>s+h.currentValue,0)
  const totalPnl   = holdings.reduce((s,h)=>s+h.pnl,0)

  return (
    <div>
      <PageHeader title="My Assets" subtitle="Your portfolio overview"/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
        <StatCard label="Portfolio Value" value={`$${totalValue.toLocaleString('en',{maximumFractionDigits:2})}`} accent="var(--accent)" icon="💼"/>
        <StatCard label="Total P&L" value={`${totalPnl>=0?'+':''}$${totalPnl.toFixed(2)}`} accent={totalPnl>=0?'var(--green)':'var(--red)'} icon="📈"/>
        <StatCard label="Assets Held" value={holdings.length} icon="◈"/>
      </div>
      <Card>
        {holdings.length===0?<EmptyState icon="◈" message="No assets yet. Go to Trade to buy your first crypto!"/>:(
          <Table
            columns={[
              { key:'logo',         label:'',       render:v=><span style={{ fontSize:20 }}>{v||'◈'}</span> },
              { key:'name',         label:'Asset',  render:(v,r)=><div><div style={{ fontWeight:600 }}>{v||r.symbol}</div><div style={{ fontSize:11, color:'var(--text3)', fontFamily:'var(--mono)' }}>{r.symbol}</div></div> },
              { key:'amount',       label:'Amount', mono:true, align:'right', render:v=>parseFloat(v||0).toFixed(6) },
              { key:'price',        label:'Price',  mono:true, align:'right', render:v=>`$${(v||0).toLocaleString()}` },
              { key:'currentValue', label:'Value',  mono:true, align:'right', render:v=>`$${(v||0).toLocaleString('en',{maximumFractionDigits:2})}` },
              { key:'pnl',          label:'P&L',    align:'right', render:(v,r)=><span style={{ color:v>=0?'var(--green)':'var(--red)', fontFamily:'var(--mono)' }}>{v>=0?'+':''}${parseFloat(v||0).toFixed(2)} ({r.pnlPct}%)</span> },
            ]}
            data={holdings}
          />
        )}
      </Card>
    </div>
  )
}

// ── Charts ────────────────────────────────────────────────────────────────
export function TraderCharts() {
  const { assets } = useApp()
  const [selected, setSelected] = useState(null)
  const [period, setPeriod]     = useState('1W')
  useEffect(()=>{ if(assets.length&&!selected) setSelected(assets[0]) },[assets])
  if (!selected) return <Spinner/>
  const points   = period==='1D'?24:period==='1W'?30:60
  const chartData= generateChartData(selected.price, points)
  return (
    <div>
      <PageHeader title="Chart Analysis" subtitle="Technical analysis and price charts"/>
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        {assets.slice(0,8).map(a=>(
          <Button key={a.symbol} variant={selected?.symbol===a.symbol?'primary':'ghost'} size="sm" onClick={()=>setSelected(a)}>
            {a.logo} {a.symbol}
          </Button>
        ))}
      </div>
      <Card>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div>
            <span style={{ fontSize:22, fontWeight:700, fontFamily:'var(--mono)' }}>${selected.price.toLocaleString()}</span>
            <span style={{ fontSize:14, color:selected.change>=0?'var(--green)':'var(--red)', marginLeft:10 }}>{selected.change>=0?'+':''}{selected.change}%</span>
            <div style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>Mkt Cap: {selected.marketCap} · Vol: {selected.volume}</div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {['1D','1W','1M'].map(p=>(
              <Button key={p} variant={period===p?'primary':'ghost'} size="sm" onClick={()=>setPeriod(p)}>{p}</Button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={selected.change>=0?'#00FF88':'#FF4757'} stopOpacity={0.25}/>
                <stop offset="95%" stopColor={selected.change>=0?'#00FF88':'#FF4757'} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="time" stroke="#5a6380" tick={{ fontSize:11 }}/>
            <YAxis domain={['auto','auto']} stroke="#5a6380" tick={{ fontSize:11 }} tickFormatter={v=>`$${v>=1000?(v/1000).toFixed(1)+'k':v}`}/>
            <Tooltip contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} formatter={v=>[`$${v.toLocaleString()}`,'Price']}/>
            <Area type="monotone" dataKey="price" stroke={selected.change>=0?'#00FF88':'#FF4757'} fill="url(#cg)" strokeWidth={2} dot={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}

// ── Alerts ────────────────────────────────────────────────────────────────
export function TraderAlerts() {
  const { assets, currentUser } = useApp()
  const [alerts, setAlerts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [saving, setSaving]   = useState(false)
  const [saveError, setSaveError] = useState('')
  const [form, setForm]       = useState({ asset:'BTC', condition:'above', price:'' })

  const load = () => {
    setLoading(true); setError(null)
    getUserAlerts(currentUser.uid)
      .then(a=>{ setAlerts(a); setLoading(false) })
      .catch(e=>{ console.error('Alerts load error:', e); setError(e.message); setLoading(false) })
  }
  useEffect(load, [currentUser.uid])

  const addAlert = async () => {
    if (!form.price||parseFloat(form.price)<=0) return
    setSaving(true); setSaveError('')
    try {
      const id = await saveAlert(currentUser.uid, form)
      setAlerts(prev=>[...prev,{ id, ...form, status:'active', createdAt:new Date() }])
      setForm(f=>({...f,price:''}))
    } catch(e) {
      console.error('Save alert error:', e)
      setSaveError('Failed to save alert: ' + e.message)
    }
    setSaving(false)
  }

  const remove = async (id) => {
    try {
      await deleteAlert(id)
      setAlerts(prev=>prev.filter(a=>a.id!==id))
    } catch(e) {
      console.error('Delete alert error:', e)
      setSaveError('Failed to delete alert: ' + e.message)
    }
  }

  const currentPrice = assets.find(a=>a.symbol===form.asset)?.price

  if (error) return <ErrorState message={`Failed to load alerts: ${error}`} onRetry={load}/>

  return (
    <div>
      <PageHeader title="Price Alerts" subtitle="Get notified when prices hit your targets"/>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:16 }}>
        <Card>
          <h3 style={{ fontSize:14, fontWeight:600, marginBottom:16, color:'var(--text2)' }}>NEW ALERT</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <Select label="Asset" value={form.asset} onChange={e=>setForm(f=>({...f,asset:e.target.value}))}
              options={assets.map(a=>({ value:a.symbol, label:`${a.symbol} — $${a.price>=1?a.price.toLocaleString():a.price}` }))}/>
            {currentPrice&&<div style={{ fontSize:12, color:'var(--text2)', padding:'8px 10px', background:'var(--bg2)', borderRadius:6 }}>Current price: <span style={{ fontFamily:'var(--mono)', color:'var(--accent)' }}>${currentPrice.toLocaleString()}</span></div>}
            <Select label="Condition" value={form.condition} onChange={e=>setForm(f=>({...f,condition:e.target.value}))}
              options={[{value:'above',label:'Price goes above ▲'},{value:'below',label:'Price goes below ▼'}]}/>
            <Input label="Target Price (USDT)" type="number" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} placeholder="0.00"/>
            {saveError && <div style={{ padding:'8px 12px', background:'rgba(255,71,87,0.08)', border:'1px solid rgba(255,71,87,0.25)', borderRadius:6, fontSize:12, color:'var(--red)' }}>⚠️ {saveError}</div>}
            <Button onClick={addAlert} disabled={saving||!form.price}>{saving?'Saving…':'Set Alert 🔔'}</Button>
          </div>
        </Card>
        <Card>
          <h3 style={{ fontSize:14, fontWeight:600, marginBottom:16, color:'var(--text2)' }}>ACTIVE ALERTS ({alerts.length})</h3>
          {loading?<Spinner/>:alerts.length===0?<EmptyState icon="🔔" message="No alerts yet. Create one on the left."/>:
            alerts.map(a=>{
              const asset = assets.find(x=>x.symbol===a.asset)
              const triggered = asset&&(a.condition==='above'?asset.price>=parseFloat(a.price):asset.price<=parseFloat(a.price))
              return (
                <div key={a.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight:600, marginBottom:4 }}>
                      <span style={{ fontFamily:'var(--mono)', color:'var(--text)' }}>{a.asset}/USDT</span>
                      {' '}<span style={{ color:'var(--text2)', fontSize:12, fontWeight:400 }}>{a.condition}</span>{' '}
                      <span style={{ fontFamily:'var(--mono)', color:'var(--accent)' }}>${parseFloat(a.price).toLocaleString()}</span>
                    </div>
                    {asset&&<div style={{ fontSize:11, color:'var(--text3)' }}>Current: ${asset.price.toLocaleString()} {triggered&&<span style={{ color:'var(--gold)' }}>⚡ TRIGGERED</span>}</div>}
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <Badge variant={triggered?'warning':'success'}>{triggered?'Triggered':'Active'}</Badge>
                    <Button size="sm" variant="danger" onClick={()=>remove(a.id)}>×</Button>
                  </div>
                </div>
              )
            })
          }
        </Card>
      </div>
    </div>
  )
}

// ── Account ───────────────────────────────────────────────────────────────
export function TraderAccount() {
  const { currentUser } = useApp()
  const [form, setForm]       = useState({ name:currentUser?.name||'' })
  const [pwForm, setPwForm]   = useState({ current:'', newPw:'', confirm:'' })
  const [twoFA, setTwoFA]     = useState(false)
  const [saving, setSaving]   = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [msg, setMsg]         = useState(null) // { text, type }
  const [pwMsg, setPwMsg]     = useState(null)

  const saveProfile = async () => {
    if (!form.name.trim()) { setMsg({ text:'Name cannot be empty', type:'error' }); return }
    setSaving(true)
    try {
      await updateUserProfile(currentUser.uid, { name:form.name })
      setMsg({ text:'Profile updated successfully!', type:'success' })
    } catch(e) { setMsg({ text:'Error: '+e.message, type:'error' }) }
    setSaving(false)
  }

  const changePassword = async () => {
    if (!pwForm.current||!pwForm.newPw) { setPwMsg({ text:'Fill in all fields', type:'error' }); return }
    if (pwForm.newPw.length<6) { setPwMsg({ text:'New password must be at least 6 characters', type:'error' }); return }
    if (pwForm.newPw!==pwForm.confirm) { setPwMsg({ text:'Passwords do not match', type:'error' }); return }
    setPwSaving(true)
    try {
      const user = auth.currentUser
      if (!user) throw new Error('Not authenticated')
      const cred = EmailAuthProvider.credential(user.email, pwForm.current)
      await reauthenticateWithCredential(user, cred)
      await updatePassword(user, pwForm.newPw)
      setPwMsg({ text:'Password changed successfully!', type:'success' })
      setPwForm({ current:'', newPw:'', confirm:'' })
    } catch(e) {
      const friendly = e.code==='auth/wrong-password'?'Current password is incorrect':e.message
      setPwMsg({ text:friendly, type:'error' })
    }
    setPwSaving(false)
  }

  const Msg = ({m})=>m?<div style={{ padding:'8px 12px', borderRadius:6, fontSize:12, background:m.type==='success'?'rgba(0,255,136,0.1)':'rgba(255,71,87,0.1)', color:m.type==='success'?'var(--green)':'var(--red)', border:`1px solid ${m.type==='success'?'rgba(0,255,136,0.3)':'rgba(255,71,87,0.3)'}` }}>{m.type==='success'?'✅':'⚠️'} {m.text}</div>:null

  return (
    <div>
      <PageHeader title="My Account" subtitle="Manage your profile and security"/>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <Card>
            <h3 style={{ fontSize:14, fontWeight:600, marginBottom:16, color:'var(--text2)' }}>PROFILE INFO</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <Input label="Full Name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <label style={{ fontSize:12, color:'var(--text2)', fontWeight:500 }}>Email</label>
                <div style={{ padding:'10px 14px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, fontSize:14, color:'var(--text3)' }}>{currentUser?.email}</div>
              </div>
              <Msg m={msg}/>
              <Button onClick={saveProfile} disabled={saving}>{saving?'Saving…':'Save Changes'}</Button>
            </div>
          </Card>
          <Card>
            <h3 style={{ fontSize:14, fontWeight:600, marginBottom:16, color:'var(--text2)' }}>CHANGE PASSWORD</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <Input label="Current Password" type="password" value={pwForm.current} onChange={e=>setPwForm(f=>({...f,current:e.target.value}))} placeholder="••••••••"/>
              <Input label="New Password" type="password" value={pwForm.newPw} onChange={e=>setPwForm(f=>({...f,newPw:e.target.value}))} placeholder="Min 6 characters"/>
              <Input label="Confirm New Password" type="password" value={pwForm.confirm} onChange={e=>setPwForm(f=>({...f,confirm:e.target.value}))} placeholder="••••••••"/>
              <Msg m={pwMsg}/>
              <Button variant="outline" onClick={changePassword} disabled={pwSaving}>{pwSaving?'Updating…':'Update Password'}</Button>
            </div>
          </Card>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <Card>
            <h3 style={{ fontSize:14, fontWeight:600, marginBottom:16, color:'var(--text2)' }}>SECURITY</h3>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 0', borderBottom:'1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight:500, marginBottom:4 }}>Two-Factor Authentication</div>
                <div style={{ fontSize:12, color:'var(--text2)' }}>{twoFA?'Enabled — your account is protected':'Disabled — enable for extra security'}</div>
              </div>
              <button onClick={()=>setTwoFA(!twoFA)} style={{ width:44, height:24, borderRadius:12, border:'none', cursor:'pointer', background:twoFA?'var(--green)':'var(--border)', transition:'background 0.2s', position:'relative', flexShrink:0 }}>
                <div style={{ position:'absolute', top:3, left:twoFA?22:3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left 0.2s' }}/>
              </button>
            </div>
            <div style={{ marginTop:16 }}>
              <div style={{ fontSize:13, color:'var(--text2)', marginBottom:12, fontWeight:500 }}>Account Details</div>
              {[
                { label:'User ID',  value:currentUser?.uid?.slice(0,16)+'…' },
                { label:'Role',     value:currentUser?.role },
                { label:'Status',   value:currentUser?.status||'active' },
                { label:'Joined',   value:currentUser?.joined||'—' },
              ].map(item=>(
                <div key={item.label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
                  <span style={{ color:'var(--text2)' }}>{item.label}</span>
                  <span style={{ fontFamily:'var(--mono)', fontWeight:500, textTransform:'capitalize' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h3 style={{ fontSize:14, fontWeight:600, marginBottom:16, color:'var(--text2)' }}>ACTIVE SESSIONS</h3>
            {[
              { device:'Chrome — Windows', location:'Ho Chi Minh City, VN', time:'Current session', current:true },
              { device:'Mobile — iOS',     location:'Hanoi, VN',            time:'2 days ago',      current:false },
            ].map((s,i)=>(
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:500 }}>{s.device}</div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>{s.location} · {s.time}</div>
                </div>
                {s.current?<Badge variant="success">Current</Badge>:<Button size="sm" variant="danger">Revoke</Button>}
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}

// ── Support ───────────────────────────────────────────────────────────────
export function TraderSupport() {
  const { currentUser } = useApp()
  const [form, setForm]     = useState({ subject:'', category:'trading', message:'' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  const submit = async () => {
    if (!form.subject.trim()||!form.message.trim()) { setError('Please fill in all fields'); return }
    setLoading(true); setError('')
    try {
      await saveTicket(currentUser.uid, { ...form, user:currentUser.email })
      setSubmitted(true)
    } catch(e) { setError('Failed to submit: '+e.message) }
    setLoading(false)
  }

  return (
    <div>
      <PageHeader title="Support" subtitle="Get help from our team"/>
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }}>
        <Card>
          {submitted?(
            <div style={{ textAlign:'center', padding:'40px 0' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
              <div style={{ fontSize:16, fontWeight:600, color:'var(--green)', marginBottom:8 }}>Ticket Submitted!</div>
              <div style={{ fontSize:13, color:'var(--text2)', marginBottom:20 }}>Our team will respond within 24 hours.</div>
              <Button variant="outline" onClick={()=>{ setSubmitted(false); setForm({subject:'',category:'trading',message:''}) }}>Submit Another</Button>
            </div>
          ):(
            <>
              <h3 style={{ fontSize:14, fontWeight:600, marginBottom:16, color:'var(--text2)' }}>SUBMIT A TICKET</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <Select label="Category" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}
                  options={[
                    {value:'trading',   label:'🔄 Trading Issue'},
                    {value:'account',   label:'👤 Account Problem'},
                    {value:'payment',   label:'💳 Payment / Withdrawal'},
                    {value:'technical', label:'⚙️ Technical Issue'},
                    {value:'other',     label:'💬 Other'},
                  ]}/>
                <Input label="Subject" value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))} placeholder="Brief description of your issue"/>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <label style={{ fontSize:12, color:'var(--text2)', fontWeight:500 }}>Message</label>
                  <textarea rows={5} value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))}
                    placeholder="Describe your issue in detail…"
                    style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', color:'var(--text)', fontFamily:'var(--font)', fontSize:14, resize:'vertical', outline:'none' }}/>
                </div>
                {error&&<div style={{ padding:'8px 12px', background:'rgba(255,71,87,0.08)', border:'1px solid rgba(255,71,87,0.25)', borderRadius:6, fontSize:12, color:'var(--red)' }}>⚠️ {error}</div>}
                <Button onClick={submit} disabled={loading}>{loading?'Submitting…':'Submit Ticket'}</Button>
              </div>
            </>
          )}
        </Card>
        <Card>
          <h3 style={{ fontSize:14, fontWeight:600, marginBottom:16, color:'var(--text2)' }}>FAQ</h3>
          {[
            { q:'How do I deposit crypto?',   a:'Go to Payments → Deposit to get your wallet address.' },
            { q:'What are trading fees?',     a:'Fees range from 0.02%–0.15% based on your 30-day trading volume.' },
            { q:'How to enable 2FA?',          a:'Go to Account → Security and toggle on 2FA.' },
            { q:'How to cancel an order?',     a:'Go to History, find the pending order and click Cancel.' },
            { q:'When do I receive my crypto?',a:'Completed orders are reflected instantly in your asset balance.' },
          ].map((item,i)=>(
            <div key={i} style={{ padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:4, color:'var(--accent)' }}>Q: {item.q}</div>
              <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5 }}>{item.a}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

// ── Payments ──────────────────────────────────────────────────────────────
export function TraderPayments() {
  const { currentUser, setCurrentUser } = useApp()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [modal, setModal]               = useState(null) // 'deposit' | 'withdraw'
  const [amount, setAmount]             = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [toast, setToast]               = useState(null)

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),5000) }

  const load = () => {
    setLoading(true); setError(null)
    getUserTransactions(currentUser.uid)
      .then(t=>{ setTransactions(t); setLoading(false) })
      .catch(e=>{ setError(e.message); setLoading(false) })
  }
  useEffect(load, [currentUser.uid])

  const payments  = transactions.filter(t=>t.type==='deposit'||t.type==='withdraw')
  const deposited = payments.filter(t=>t.type==='deposit'&&t.status==='completed').reduce((s,t)=>s+parseFloat(t.total||0),0)
  const withdrawn = payments.filter(t=>t.type==='withdraw'&&t.status==='completed').reduce((s,t)=>s+parseFloat(t.total||0),0)
  const pendingCount = payments.filter(t=>t.status==='pending').length

  // Current USDT balance = total deposited - total withdrawn - total spent buying
  const spent  = transactions.filter(t=>t.type==='buy'&&t.status==='completed').reduce((s,t)=>s+parseFloat(t.total||0),0)
  const earned = transactions.filter(t=>t.type==='sell'&&t.status==='completed').reduce((s,t)=>s+parseFloat(t.total||0),0)
  const calculatedBalance = Math.max(0, deposited - withdrawn - spent + earned)
  const usdtBalance = currentUser?.balance != null ? Math.max(0, Number(currentUser.balance)) : calculatedBalance

  const submit = async () => {
    const val = parseFloat(amount)
    if (!val || val <= 0) { showToast('Please enter a valid amount', 'error'); return }
    if (modal === 'withdraw') {
      if (val > usdtBalance) { showToast(`You only have $${usdtBalance.toFixed(2)} available to withdraw`, 'error'); return }
      if (val < 10)          { showToast('Minimum withdrawal is $10', 'error'); return }
    }
    if (modal === 'deposit' && val < 10) { showToast('Minimum deposit is $10', 'error'); return }

    setSubmitting(true)
    const txn = {
      type:   modal,
      pair:   'USDT/USD',
      amount: val,
      price:  1,
      total:  val,
      // Deposits are instant; withdrawals need admin approval
      status: modal === 'deposit' ? 'completed' : 'pending',
      time:   new Date().toISOString(),
      user:   currentUser.email,
    }
    const tempId = 'temp-' + Date.now()
    setTransactions(prev => [{ id:tempId, ...txn }, ...prev])
    setModal(null); setAmount('')
    setSubmitting(false)

    if (modal === 'deposit') {
      showToast(`✅ $${val.toFixed(2)} added to your account instantly!`)
    } else {
      showToast(`⏳ Withdrawal of $${val.toFixed(2)} submitted. Admin will approve within 24h.`, 'warning')
    }

    try {
      const { id:realId, balance:nextBalance } = await saveTransaction(currentUser.uid, txn)
      setTransactions(prev => prev.map(t => t.id===tempId ? { id:realId, ...txn } : t))
      if (nextBalance != null && setCurrentUser) {
        setCurrentUser(prev => prev ? { ...prev, balance: nextBalance } : prev)
      }
    } catch(e) {
      setTransactions(prev => prev.filter(t => t.id!==tempId))
      showToast('Error: ' + e.message, 'error')
    }
  }

  if (loading) return <Spinner/>
  if (error)   return <ErrorState message={`Failed to load: ${error}`} onRetry={load}/>

  const toastStyle = {
    success: { bg:'rgba(0,255,136,0.1)', border:'rgba(0,255,136,0.3)', color:'var(--green)' },
    warning: { bg:'rgba(255,215,0,0.1)',  border:'rgba(255,215,0,0.3)',  color:'var(--gold)'  },
    error:   { bg:'rgba(255,71,87,0.1)',  border:'rgba(255,71,87,0.3)',  color:'var(--red)'   },
  }

  return (
    <div>
      <PageHeader title="Payments" subtitle="Manage your account balance"/>

      {toast && (
        <div style={{ padding:'12px 16px', background:toastStyle[toast.type].bg, border:`1px solid ${toastStyle[toast.type].border}`, borderRadius:8, marginBottom:16, fontSize:13, color:toastStyle[toast.type].color, lineHeight:1.5 }}>
          {toast.msg}
        </div>
      )}

      {/* Balance card — big and clear */}
      <Card style={{ marginBottom:20, background:'linear-gradient(135deg,var(--card),rgba(0,212,255,0.05))', border:'1px solid rgba(0,212,255,0.2)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>
          <div>
            <div style={{ fontSize:12, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:6 }}>Available Balance</div>
            <div style={{ fontSize:40, fontWeight:700, fontFamily:'var(--mono)', color:'var(--accent)' }}>
              ${usdtBalance.toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2})}
              <span style={{ fontSize:16, color:'var(--text3)', marginLeft:8 }}>USDT</span>
            </div>
            <div style={{ fontSize:12, color:'var(--text3)', marginTop:6 }}>
              Total deposited: <span style={{ color:'var(--green)' }}>${deposited.toFixed(2)}</span>
              {' · '}Total withdrawn: <span style={{ color:'var(--red)' }}>${withdrawn.toFixed(2)}</span>
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <Button variant="success" onClick={()=>{ setModal('deposit'); setAmount('') }}>+ Add Funds</Button>
            <Button variant="outline" onClick={()=>{ setModal('withdraw'); setAmount('') }}>↑ Withdraw</Button>
          </div>
        </div>
      </Card>

      {/* Info row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
        <div style={{ padding:'12px 16px', background:'rgba(0,255,136,0.05)', border:'1px solid rgba(0,255,136,0.15)', borderRadius:8, display:'flex', gap:10, alignItems:'center' }}>
          <span style={{ fontSize:22 }}>⚡</span>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--green)' }}>Deposits are instant</div>
            <div style={{ fontSize:11, color:'var(--text3)' }}>Funds appear in your balance immediately</div>
          </div>
        </div>
        <div style={{ padding:'12px 16px', background:'rgba(255,215,0,0.05)', border:'1px solid rgba(255,215,0,0.15)', borderRadius:8, display:'flex', gap:10, alignItems:'center' }}>
          <span style={{ fontSize:22 }}>🔐</span>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--gold)' }}>Withdrawals need approval</div>
            <div style={{ fontSize:11, color:'var(--text3)' }}>Admin reviews and approves within 24h</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:20 }}>
        <StatCard label="Total Deposited"      value={`$${deposited.toFixed(2)}`}  accent="var(--green)" icon="↙"/>
        <StatCard label="Total Withdrawn"      value={`$${withdrawn.toFixed(2)}`}  accent="var(--red)"   icon="↗"/>
        <StatCard label="Pending Withdrawals"  value={pendingCount}                 accent="var(--gold)"  icon="⏳"/>
      </div>

      {/* History */}
      <Card>
        <h3 style={{ fontSize:14, fontWeight:600, marginBottom:16, color:'var(--text2)' }}>PAYMENT HISTORY</h3>
        {payments.length===0 ? (
          <EmptyState icon="💳" message="No payment history yet. Click Add Funds to get started!"/>
        ) : (
          <Table
            columns={[
              { key:'id',     label:'ID',     mono:true, render:v=>v?.slice(0,8)||'—' },
              { key:'type',   label:'Type',   render:v=><Badge variant={v==='deposit'?'success':'warning'}>{v==='deposit'?'⚡ Deposit':'🔐 Withdraw'}</Badge> },
              { key:'total',  label:'Amount', mono:true, align:'right', render:v=>`$${parseFloat(v||0).toFixed(2)}` },
              { key:'status', label:'Status', render:v=>(
                <Badge variant={v==='completed'?'success':v==='pending'?'warning':'danger'}>
                  {v==='completed'?'✓ Done':v==='pending'?'⏳ Pending':'✗ Rejected'}
                </Badge>
              )},
              { key:'time', label:'Date', render:v=><span style={{ fontSize:11,color:'var(--text3)' }}>{v?new Date(v).toLocaleString():''}</span> },
            ]}
            data={payments}
          />
        )}
      </Card>

      {/* Simple modal — no crypto addresses, just an amount */}
      {modal && (
        <Modal
          title={modal==='deposit' ? '⚡ Add Funds to Your Account' : '🔐 Withdraw Funds'}
          onClose={()=>{ setModal(null); setAmount('') }}
        >
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {modal==='deposit' ? (
              <div style={{ padding:'12px 14px', background:'rgba(0,255,136,0.08)', border:'1px solid rgba(0,255,136,0.2)', borderRadius:8, fontSize:13, color:'var(--green)', lineHeight:1.5 }}>
                ⚡ Funds will appear in your balance <strong>instantly</strong> after confirming.
              </div>
            ) : (
              <div style={{ padding:'12px 14px', background:'rgba(255,215,0,0.08)', border:'1px solid rgba(255,215,0,0.2)', borderRadius:8, fontSize:13, color:'var(--gold)', lineHeight:1.5 }}>
                🔐 Your withdrawal will be reviewed by an admin and processed within <strong>24 hours</strong>.
                <div style={{ marginTop:6, color:'var(--text2)', fontSize:12 }}>
                  Available to withdraw: <span style={{ fontFamily:'var(--mono)', fontWeight:700, color:'var(--text)' }}>${usdtBalance.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <label style={{ fontSize:12, color:'var(--text2)', fontWeight:500 }}>Amount (USD)</label>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', fontSize:16, fontWeight:700 }}>$</span>
                <input
                  type="number" value={amount}
                  onChange={e=>setAmount(e.target.value)}
                  placeholder="0.00" min="10"
                  max={modal==='withdraw'?usdtBalance:undefined}
                  style={{ width:'100%', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, padding:'12px 14px 12px 30px', color:'var(--text)', fontFamily:'var(--mono)', fontSize:18, fontWeight:700, outline:'none' }}
                />
              </div>
              <div style={{ fontSize:11, color:'var(--text3)' }}>Minimum: $10</div>
            </div>

            {/* Quick amount buttons */}
            <div style={{ display:'flex', gap:8 }}>
              {(modal==='deposit'?[100,500,1000,5000]:[50,100,500,usdtBalance]).map(v=>(
                <button key={v} onClick={()=>setAmount(v.toFixed(2))} style={{
                  flex:1, padding:'7px 4px', borderRadius:6, border:'1px solid var(--border)',
                  background:'var(--bg2)', color:'var(--text2)', fontFamily:'var(--font)',
                  fontSize:12, fontWeight:600, cursor:'pointer',
                }}>
                  {v===usdtBalance?'MAX':'$'+v}
                </button>
              ))}
            </div>

            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
              <Button variant="ghost" onClick={()=>{ setModal(null); setAmount('') }}>Cancel</Button>
              <Button
                variant={modal==='deposit'?'success':'outline'}
                onClick={submit}
                disabled={submitting||!amount||parseFloat(amount)<=0}
              >
                {submitting ? 'Processing…' : modal==='deposit' ? `Add $${parseFloat(amount||0).toFixed(2)}` : `Withdraw $${parseFloat(amount||0).toFixed(2)}`}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}


// ── Promotions ────────────────────────────────────────────────────────────
export function TraderPromotions() {
  const [claimed, setClaimed] = useState({})
  const promotions = [
    { id:1, title:'Zero Fee Weekend',  desc:'Trade BTC/USDT with 0% fee this weekend.',        discount:'100% fee off',   expires:'2024-12-22', code:'ZEROFEE' },
    { id:2, title:'New User Bonus',    desc:'Get $50 USDT bonus on your first deposit > $500.', discount:'$50 USDT',       expires:'2024-12-31', code:'NEWUSER50' },
    { id:3, title:'Referral Reward',   desc:'Earn 20% of your referrals\' trading fees.',       discount:'20% commission', expires:'2024-09-30', code:'REF20' },
  ]

  const claim = (promo) => {
    setClaimed(p=>({...p,[promo.id]:true}))
  }

  return (
    <div>
      <PageHeader title="Promotions" subtitle="Exclusive offers for traders"/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
        {promotions.map(promo=>(
          <Card key={promo.id} style={{ background:'linear-gradient(135deg,var(--card) 0%,rgba(0,212,255,0.05) 100%)', border:`1px solid ${claimed[promo.id]?'rgba(0,255,136,0.3)':'rgba(0,212,255,0.2)'}` }}>
            <div style={{ fontSize:36, marginBottom:12 }}>{claimed[promo.id]?'✅':'🎁'}</div>
            <h3 style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>{promo.title}</h3>
            <p style={{ fontSize:13, color:'var(--text2)', marginBottom:14, lineHeight:1.5 }}>{promo.desc}</p>
            <div style={{ fontSize:22, fontWeight:700, color:'var(--green)', fontFamily:'var(--mono)', marginBottom:8 }}>{promo.discount}</div>
            <div style={{ fontSize:12, color:'var(--text3)', marginBottom:16 }}>Expires: {promo.expires}</div>
            {claimed[promo.id]?(
              <div style={{ padding:'10px', background:'rgba(0,255,136,0.1)', border:'1px solid rgba(0,255,136,0.3)', borderRadius:8, textAlign:'center' }}>
                <div style={{ fontSize:12, color:'var(--green)', fontWeight:600, marginBottom:4 }}>Promo Code</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:16, fontWeight:700, letterSpacing:2, color:'var(--text)' }}>{promo.code}</div>
              </div>
            ):(
              <Button variant="outline" style={{ width:'100%' }} onClick={()=>claim(promo)}>Claim Offer</Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
