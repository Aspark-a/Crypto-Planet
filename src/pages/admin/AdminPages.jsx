import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { Card, Button, Badge, Table, Modal, Input, Select, StatCard, PageHeader, EmptyState, ErrorState, Spinner } from '../../components/shared/UI'
import { getAllUsers, getAllTransactions, getAllTickets, updateUserProfile, updateUserBalance } from '../../services/firebaseService'
import { doc, updateDoc, onSnapshot, collection } from 'firebase/firestore'
import { db } from '../../firebase'

// ── Dashboard ─────────────────────────────────────────────────────────────
export function AdminDashboard() {
  const { assets, globalMetrics } = useApp()
  const [users, setUsers]               = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

  const load = () => {
    setLoading(true); setError(null)
    Promise.all([getAllUsers(), getAllTransactions()])
      .then(([u,t])=>{ setUsers(u); setTransactions(t); setLoading(false) })
      .catch(e=>{ console.error('Dashboard load error:', e); setError(e.message); setLoading(false) })
  }

  useEffect(load, [])

  if (loading) return <Spinner/>
  if (error) return <ErrorState message={`Failed to load dashboard data: ${error}`} onRetry={load}/>
  const totalVolume = transactions.reduce((s,t)=>s+(t.total||0),0)

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="System overview and key metrics"/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        <StatCard label="Total Users"    value={users.length}                                    icon="👥"/>
        <StatCard label="Active Users"   value={users.filter(u=>u.status==='active').length}     icon="✅"/>
        <StatCard label="Total Volume"   value={`$${(totalVolume/1000).toFixed(1)}K`}            accent="var(--green)" icon="💹"/>
        <StatCard label="Market Cap"     value={globalMetrics?.totalMarketCap||'…'}              accent="var(--accent)" icon="🌐"/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <Card>
          <h3 style={{ fontSize:14, fontWeight:600, marginBottom:16, color:'var(--text2)' }}>RECENT TRANSACTIONS</h3>
          {transactions.length===0?<EmptyState icon="📋" message="No transactions yet"/>:(
            <Table columns={[
              { key:'id',     label:'ID',     mono:true, render:v=>v?.slice(0,8) },
              { key:'type',   label:'Type',   render:v=><Badge variant={v==='buy'?'success':v==='sell'?'danger':'info'}>{v}</Badge> },
              { key:'pair',   label:'Pair',   mono:true },
              { key:'total',  label:'Total',  mono:true, align:'right', render:v=>`$${(v||0).toLocaleString()}` },
              { key:'status', label:'Status', render:v=><Badge variant={v==='completed'?'success':v==='pending'?'warning':'danger'}>{v}</Badge> },
            ]} data={transactions.slice(0,5)}/>
          )}
        </Card>
        <Card>
          <h3 style={{ fontSize:14, fontWeight:600, marginBottom:16, color:'var(--text2)' }}>TOP ASSETS (LIVE)</h3>
          <Table columns={[
            { key:'symbol', label:'Asset', render:(v,r)=><span style={{ fontFamily:'var(--mono)', fontWeight:600 }}>{r.logo} {v}</span> },
            { key:'price',  label:'Price', mono:true, align:'right', render:v=>`$${v.toLocaleString()}` },
            { key:'change', label:'24h',   align:'right', render:v=><span style={{ color:v>=0?'var(--green)':'var(--red)', fontFamily:'var(--mono)' }}>{v>=0?'+':''}{v}%</span> },
          ]} data={assets.slice(0,5)}/>
        </Card>
      </div>
    </div>
  )
}

// ── Users ─────────────────────────────────────────────────────────────────
export function AdminUsers() {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState(null)
  const [form, setForm]       = useState({ name:'', status:'active', role:'trader' })
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    setLoading(true); setError(null)
    const q = collection(db, 'users')
    const unsub = onSnapshot(q, snap => {
      setUsers(snap.docs.map(d => d.data()))
      setLoading(false)
    }, e => {
      console.error('Users snapshot error:', e)
      setError(e.message)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const filtered = users.filter(u=>
    u.name?.toLowerCase().includes(search.toLowerCase())||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  const openEdit = (user) => { setForm({ name:user.name, status:user.status, role:user.role }); setModal(user) }

  const save = async () => {
    setSaving(true)
    try {
      await updateUserProfile(modal.uid, { name:form.name, status:form.status, role:form.role })
      setUsers(prev=>prev.map(u=>u.uid===modal.uid?{...u,...form}:u))
      setModal(null)
    } catch(e) { alert('Error: '+e.message) }
    setSaving(false)
  }

  if (loading) return <Spinner/>
  if (error) return <ErrorState message={`Failed to load users: ${error}`} onRetry={load}/>

  return (
    <div>
      <PageHeader title="User Management" subtitle={`${users.length} registered users`}/>
      <Card>
        <div style={{ marginBottom:16 }}>
          <Input placeholder="Search by name or email…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        {filtered.length===0?<EmptyState icon="👥" message="No users found"/>:(
          <Table columns={[
            { key:'name',   label:'Name',   render:(v,r)=><div><div style={{ fontWeight:500 }}>{v}</div><div style={{ fontSize:11, color:'var(--text3)' }}>{r.email}</div></div> },
            { key:'role',   label:'Role',   render:v=><Badge variant={v==='admin'?'warning':v==='trader'?'success':'info'}>{v}</Badge> },
            { key:'status', label:'Status', render:v=><Badge variant={v==='active'?'success':'danger'}>{v}</Badge> },
            { key:'balance',label:'Balance',mono:true, align:'right', render:v=>`$${(v||0).toLocaleString()}` },
            { key:'joined', label:'Joined', render:v=><span style={{ color:'var(--text2)', fontSize:12 }}>{v}</span> },
            { key:'uid',    label:'Actions',render:(_,row)=><Button size="sm" variant="ghost" onClick={()=>openEdit(row)}>Edit</Button> },
          ]} data={filtered}/>
        )}
      </Card>
      {modal&&(
        <Modal title="Edit User" onClose={()=>setModal(null)}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ padding:'10px 14px', background:'var(--bg2)', borderRadius:8, fontSize:13, color:'var(--text2)' }}>{modal.email}</div>
            <Input label="Name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
            <Select label="Role" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}
              options={[{value:'trader',label:'Trader'},{value:'viewer',label:'Viewer'},{value:'admin',label:'Admin'}]}/>
            <Select label="Status" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}
              options={[{value:'active',label:'Active'},{value:'suspended',label:'Suspended'}]}/>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:8 }}>
              <Button variant="ghost" onClick={()=>setModal(null)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving?'Saving…':'Save'}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Transactions ──────────────────────────────────────────────────────────
export function AdminTransactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [filter, setFilter]             = useState('all')
  const [toast, setToast]               = useState(null)

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),4000) }

  const load = () => {
    setLoading(true); setError(null)
    getAllTransactions()
      .then(t=>{ setTransactions(t); setLoading(false) })
      .catch(e=>{ console.error('Transactions load error:', e); setError(e.message); setLoading(false) })
  }
  useEffect(load, [])

  // Approve or reject a pending withdrawal
  const verifyWithdrawal = async (txn, action) => {
    const newStatus = action === 'approve' ? 'completed' : 'rejected'
    try {
      await updateDoc(doc(db, 'transactions', txn.id), { status: newStatus })
      if (action === 'approve') {
        await updateUserBalance(txn.uid, -parseFloat(txn.total || 0))
      }
      setTransactions(prev => prev.map(t => t.id===txn.id ? {...t, status:newStatus} : t))
      showToast(
        action==='approve'
          ? `✅ Withdrawal of $${txn.total} approved and processed.`
          : `✗ Withdrawal of $${txn.total} rejected.`,
        action==='approve' ? 'success' : 'error'
      )
    } catch(e) {
      showToast('Failed to update: ' + e.message, 'error')
    }
  }

  if (loading) return <Spinner/>
  if (error)   return <ErrorState message={`Failed to load transactions: ${error}`} onRetry={load}/>

  const pendingWithdrawals = transactions.filter(t => t.type==='withdraw' && t.status==='pending')
  const filtered = filter==='all' ? transactions : transactions.filter(t=>t.status===filter||t.type===filter)

  const toastStyle = {
    success: { bg:'rgba(0,255,136,0.1)',  border:'rgba(0,255,136,0.3)', color:'var(--green)' },
    error:   { bg:'rgba(255,71,87,0.1)',  border:'rgba(255,71,87,0.3)', color:'var(--red)'   },
  }

  return (
    <div>
      <PageHeader title="Transaction Management" subtitle={`${transactions.length} total transactions`}/>

      {toast && (
        <div style={{ padding:'12px 16px', background:toastStyle[toast.type].bg, border:`1px solid ${toastStyle[toast.type].border}`, borderRadius:8, marginBottom:16, fontSize:13, color:toastStyle[toast.type].color }}>
          {toast.msg}
        </div>
      )}

      {/* Pending withdrawals — shown at the top so admin can't miss them */}
      {pendingWithdrawals.length > 0 && (
        <Card style={{ marginBottom:16, border:'1px solid rgba(255,215,0,0.3)', background:'rgba(255,215,0,0.04)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
            <span style={{ fontSize:20 }}>🔐</span>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--gold)' }}>Pending Withdrawals — Action Required</div>
              <div style={{ fontSize:12, color:'var(--text3)' }}>{pendingWithdrawals.length} withdrawal{pendingWithdrawals.length>1?'s':''} awaiting your verification</div>
            </div>
          </div>
          {pendingWithdrawals.map(txn => (
            <div key={txn.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px', background:'var(--bg2)', borderRadius:8, marginBottom:8, border:'1px solid var(--border)' }}>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:16, color:'var(--text)' }}>
                    {parseFloat(txn.amount||0)} {txn.pair?.split('/')[0]}
                  </span>
                  <span style={{ fontSize:13, color:'var(--text2)' }}>(≈ ${parseFloat(txn.total||0).toLocaleString('en',{maximumFractionDigits:2})})</span>
                </div>
                <div style={{ fontSize:12, color:'var(--text3)' }}>From: <span style={{ color:'var(--text2)' }}>{txn.user}</span></div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>{txn.time ? new Date(txn.time).toLocaleString() : ''}</div>
              </div>
              <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                <Button variant="success" size="sm" onClick={() => verifyWithdrawal(txn,'approve')}>✓ Approve</Button>
                <Button variant="danger"  size="sm" onClick={() => verifyWithdrawal(txn,'reject')}>✗ Reject</Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* All transactions table */}
      <Card>
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
          {['all','buy','sell','deposit','withdraw','pending','completed'].map(s=>(
            <Button key={s} variant={filter===s?'primary':'ghost'} size="sm"
              onClick={()=>setFilter(s)} style={{ textTransform:'capitalize' }}>
              {s}{s==='pending'&&pendingWithdrawals.length>0?` (${pendingWithdrawals.length})`:''}
            </Button>
          ))}
        </div>
        {filtered.length===0 ? <EmptyState icon="📋" message="No transactions found"/> : (
          <Table columns={[
            { key:'id',     label:'ID',     mono:true, render:v=>v?.slice(0,8) },
            { key:'user',   label:'User',   render:v=><span style={{ fontSize:12 }}>{v}</span> },
            { key:'type',   label:'Type',   render:v=>(
              <Badge variant={v==='buy'?'success':v==='sell'?'danger':v==='deposit'?'info':v==='withdraw'?'warning':'default'}>
                {v==='deposit'?'⚡ deposit':v==='withdraw'?'🔐 withdraw':v}
              </Badge>
            )},
            { key:'pair',   label:'Asset',  mono:true, render:v=>v?.split('/')[0] },
            { key:'amount', label:'Amount', mono:true, align:'right' },
            { key:'total',  label:'Total',  mono:true, align:'right', render:v=>`$${(v||0).toLocaleString()}` },
            { key:'status', label:'Status', render:v=>(
              <Badge variant={v==='completed'?'success':v==='pending'?'warning':'danger'}>
                {v==='completed'?'✓ '+v:v==='pending'?'⏳ '+v:'✗ '+v}
              </Badge>
            )},
            { key:'time',   label:'Date',   render:v=><span style={{ fontSize:11, color:'var(--text3)' }}>{v?new Date(v).toLocaleDateString():''}</span> },
            { key:'id', label:'', render:(_,row)=>row.type==='withdraw'&&row.status==='pending'?(
              <div style={{ display:'flex', gap:4 }}>
                <Button size="sm" variant="success" onClick={()=>verifyWithdrawal(row,'approve')}>✓</Button>
                <Button size="sm" variant="danger"  onClick={()=>verifyWithdrawal(row,'reject')}>✗</Button>
              </div>
            ):null },
          ]} data={filtered}/>
        )}
      </Card>
    </div>
  )
}

// ── Assets ────────────────────────────────────────────────────────────────
export function AdminAssets() {
  const { assets, assetsLoading, loadAssets, globalMetrics } = useApp()
  return (
    <div>
      <PageHeader title="Asset Management" subtitle="Live prices from CoinMarketCap"
        actions={[<Button key="r" variant="outline" onClick={loadAssets} disabled={assetsLoading}>↻ Refresh</Button>]}/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:20 }}>
        <StatCard label="Total Assets"     value={assets.length}                       icon="◈"/>
        <StatCard label="Gainers"          value={assets.filter(a=>a.change>0).length} accent="var(--green)" icon="↗"/>
        <StatCard label="Losers"           value={assets.filter(a=>a.change<0).length} accent="var(--red)"   icon="↘"/>
        <StatCard label="Total Market Cap" value={globalMetrics?.totalMarketCap||'…'}  icon="💎"/>
      </div>
      {assetsLoading?<Spinner/>:(
        <Card>
          <Table columns={[
            { key:'logo',      label:'',       render:v=><span style={{ fontSize:20 }}>{v}</span> },
            { key:'name',      label:'Asset',  render:(v,r)=><div><div style={{ fontWeight:600 }}>{v}</div><div style={{ fontSize:11, color:'var(--text3)', fontFamily:'var(--mono)' }}>{r.symbol}</div></div> },
            { key:'price',     label:'Price',  mono:true, align:'right', render:v=>`$${v.toLocaleString()}` },
            { key:'change',    label:'24h',    align:'right', render:v=><span style={{ color:v>=0?'var(--green)':'var(--red)', fontFamily:'var(--mono)', fontWeight:600 }}>{v>=0?'+':''}{v}%</span> },
            { key:'volume',    label:'Volume', mono:true, align:'right' },
            { key:'marketCap', label:'Mkt Cap',mono:true, align:'right' },
          ]} data={assets}/>
        </Card>
      )}
    </div>
  )
}

// ── Trading Pairs ─────────────────────────────────────────────────────────
export function AdminTradingPairs() {
  const [pairs, setPairs] = useState([
    { id:1, base:'BTC',  quote:'USDT', status:'active',   minOrder:0.001, fee:0.1  },
    { id:2, base:'ETH',  quote:'USDT', status:'active',   minOrder:0.01,  fee:0.1  },
    { id:3, base:'SOL',  quote:'USDT', status:'active',   minOrder:0.1,   fee:0.15 },
    { id:4, base:'BNB',  quote:'ETH',  status:'active',   minOrder:0.01,  fee:0.1  },
    { id:5, base:'ADA',  quote:'USDT', status:'inactive', minOrder:1,     fee:0.2  },
  ])
  const [modal, setModal] = useState(null)
  const [form, setForm]   = useState({ base:'', quote:'USDT', status:'active', minOrder:0.01, fee:0.1 })

  const save = () => {
    if (!form.base.trim()) return
    if (modal==='add') setPairs(p=>[...p,{ id:Date.now(),...form }])
    else setPairs(p=>p.map(x=>x.id===modal.id?{...x,...form}:x))
    setModal(null)
  }

  return (
    <div>
      <PageHeader title="Trading Pairs" subtitle={`${pairs.length} pairs configured`}
        actions={[<Button key="a" onClick={()=>{ setForm({base:'',quote:'USDT',status:'active',minOrder:0.01,fee:0.1}); setModal('add') }}>+ Add Pair</Button>]}/>
      <Card>
        <Table columns={[
          { key:'base',     label:'Pair',      render:(v,r)=><span style={{ fontFamily:'var(--mono)', fontWeight:700 }}>{v}/{r.quote}</span> },
          { key:'status',   label:'Status',    render:v=><Badge variant={v==='active'?'success':'default'}>{v}</Badge> },
          { key:'minOrder', label:'Min Order', mono:true, align:'right' },
          { key:'fee',      label:'Fee %',     mono:true, align:'right', render:v=>`${v}%` },
          { key:'id', label:'Actions', render:(_,row)=>(
            <div style={{ display:'flex', gap:6 }}>
              <Button size="sm" variant="ghost" onClick={()=>{ setForm({base:row.base,quote:row.quote,status:row.status,minOrder:row.minOrder,fee:row.fee}); setModal(row) }}>Edit</Button>
              <Button size="sm" variant="danger" onClick={()=>{ if(confirm('Delete this pair?')) setPairs(p=>p.filter(x=>x.id!==row.id)) }}>Del</Button>
            </div>
          )},
        ]} data={pairs}/>
      </Card>
      {modal&&(
        <Modal title={modal==='add'?'Add Trading Pair':'Edit Pair'} onClose={()=>setModal(null)}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Input label="Base Asset (e.g. BTC)" value={form.base} onChange={e=>setForm(f=>({...f,base:e.target.value.toUpperCase()}))}/>
            <Input label="Quote Asset (e.g. USDT)" value={form.quote} onChange={e=>setForm(f=>({...f,quote:e.target.value.toUpperCase()}))}/>
            <Input label="Min Order" type="number" value={form.minOrder} onChange={e=>setForm(f=>({...f,minOrder:parseFloat(e.target.value)}))}/>
            <Input label="Fee %" type="number" value={form.fee} onChange={e=>setForm(f=>({...f,fee:parseFloat(e.target.value)}))}/>
            <Select label="Status" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}
              options={[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'}]}/>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:8 }}>
              <Button variant="ghost" onClick={()=>setModal(null)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Reports ───────────────────────────────────────────────────────────────
export function AdminReports() {
  const [transactions, setTransactions] = useState([])
  const [users, setUsers]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

  const load = () => {
    setLoading(true); setError(null)
    Promise.all([getAllTransactions(),getAllUsers()])
      .then(([t,u])=>{ setTransactions(t); setUsers(u); setLoading(false) })
      .catch(e=>{ console.error('Reports load error:', e); setError(e.message); setLoading(false) })
  }

  useEffect(load, [])

  if (loading) return <Spinner/>
  if (error) return <ErrorState message={`Failed to load reports: ${error}`} onRetry={load}/>

  const completed  = transactions.filter(t=>t.status==='completed')
  const revenue    = completed.reduce((s,t)=>s+(t.total||0)*0.001, 0)
  const byType     = (type) => transactions.filter(t=>t.type===type)
  const pct        = (arr) => transactions.length?Math.round(arr.length/transactions.length*100):0

  return (
    <div>
      <PageHeader title="Reports" subtitle="Platform activity and revenue insights"
        actions={[<Button key="e" variant="outline">↓ Export CSV</Button>]}/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        <StatCard label="Total Revenue"  value={`$${revenue.toFixed(2)}`}                          accent="var(--green)" icon="💰"/>
        <StatCard label="Completed Trans" value={completed.length}                                  icon="✅"/>
        <StatCard label="Pending Trans"   value={transactions.filter(t=>t.status==='pending').length} accent="var(--gold)" icon="⏳"/>
        <StatCard label="Total Users"    value={users.length}                                      icon="👤"/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <Card>
          <h3 style={{ fontSize:14, fontWeight:600, marginBottom:16, color:'var(--text2)' }}>TRANSACTION BREAKDOWN</h3>
          {transactions.length===0?<EmptyState icon="📊" message="No transaction data yet"/>:
            ['buy','sell','exchange','deposit','withdraw'].map(type=>{
              const arr = byType(type); const p = pct(arr)
              return p>0?(
                <div key={type} style={{ marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:13 }}>
                    <span style={{ textTransform:'capitalize' }}>{type}</span>
                    <span style={{ fontFamily:'var(--mono)', color:'var(--text2)' }}>{arr.length} ({p}%)</span>
                  </div>
                  <div style={{ height:6, background:'var(--bg2)', borderRadius:3 }}>
                    <div style={{ height:'100%', borderRadius:3, width:`${p}%`, background:type==='buy'?'var(--green)':type==='sell'?'var(--red)':'var(--accent)', transition:'width 0.5s' }}/>
                  </div>
                </div>
              ):null
            })
          }
        </Card>
        <Card>
          <h3 style={{ fontSize:14, fontWeight:600, marginBottom:16, color:'var(--text2)' }}>USER ROLES</h3>
          {['trader','viewer','admin'].map(role=>{
            const count = users.filter(u=>u.role===role).length
            const p = users.length?Math.round(count/users.length*100):0
            return (
              <div key={role} style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:13 }}>
                  <span style={{ textTransform:'capitalize' }}>{role}s</span>
                  <span style={{ fontFamily:'var(--mono)', color:'var(--text2)' }}>{count} ({p}%)</span>
                </div>
                <div style={{ height:6, background:'var(--bg2)', borderRadius:3 }}>
                  <div style={{ height:'100%', borderRadius:3, width:`${p}%`, background:role==='trader'?'var(--green)':role==='viewer'?'var(--accent)':'var(--gold)', transition:'width 0.5s' }}/>
                </div>
              </div>
            )
          })}
        </Card>
      </div>
    </div>
  )
}

// ── Notifications ─────────────────────────────────────────────────────────
export function AdminNotifications() {
  const [msg, setMsg]     = useState('')
  const [target, setTarget] = useState('all')
  const [sent, setSent]   = useState([])
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState('')

  const send = async () => {
    if (!msg.trim()) return
    setSending(true)
    await new Promise(r=>setTimeout(r,600)) // simulate send
    const n = { id:Date.now(), message:msg, target, time:new Date().toLocaleTimeString() }
    setSent(p=>[n,...p])
    setMsg('')
    setToast(`Notification sent to ${target==='all'?'all users':target+'s'}!`)
    setTimeout(()=>setToast(''),3000)
    setSending(false)
  }

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Broadcast messages to users"/>
      {toast&&<div style={{ padding:'12px 16px', background:'rgba(0,255,136,0.1)', border:'1px solid rgba(0,255,136,0.3)', borderRadius:8, marginBottom:16, fontSize:13, color:'var(--green)' }}>✅ {toast}</div>}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <Card>
          <h3 style={{ fontSize:14, fontWeight:600, marginBottom:16, color:'var(--text2)' }}>SEND NOTIFICATION</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Select label="Target Audience" value={target} onChange={e=>setTarget(e.target.value)}
              options={[{value:'all',label:'👥 All Users'},{value:'trader',label:'⇄ Traders Only'},{value:'viewer',label:'👁 Viewers Only'}]}/>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <label style={{ fontSize:12, color:'var(--text2)', fontWeight:500 }}>Message</label>
              <textarea value={msg} onChange={e=>setMsg(e.target.value)} rows={5}
                style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', color:'var(--text)', fontFamily:'var(--font)', fontSize:14, resize:'vertical', outline:'none' }}
                placeholder="Write your notification message…"/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:12, color:'var(--text3)' }}>{msg.length} characters</span>
              <Button onClick={send} disabled={sending||!msg.trim()}>{sending?'Sending…':'Send Notification 🔔'}</Button>
            </div>
          </div>
        </Card>
        <Card>
          <h3 style={{ fontSize:14, fontWeight:600, marginBottom:16, color:'var(--text2)' }}>SENT HISTORY ({sent.length})</h3>
          {sent.length===0?<EmptyState icon="🔔" message="No notifications sent yet"/>:
            sent.map(n=>(
              <div key={n.id} style={{ padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
                <div style={{ fontSize:13, marginBottom:6, lineHeight:1.4 }}>{n.message}</div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <Badge variant={n.target==='all'?'info':n.target==='trader'?'success':'default'}>{n.target}</Badge>
                  <span style={{ fontSize:11, color:'var(--text3)' }}>{n.time}</span>
                </div>
              </div>
            ))
          }
        </Card>
      </div>
    </div>
  )
}

// ── Support ───────────────────────────────────────────────────────────────
export function AdminSupport() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [selected, setSelected] = useState(null)
  const [reply, setReply]       = useState('')

  const load = () => {
    setLoading(true); setError(null)
    getAllTickets()
      .then(t=>{ setTickets(t); setLoading(false) })
      .catch(e=>{ console.error('Tickets load error:', e); setError(e.message); setLoading(false) })
  }

  useEffect(load, [])

  const updateStatus = (id, status) => setTickets(prev=>prev.map(t=>t.id===id?{...t,status}:t))

  const sendReply = () => {
    if (!reply.trim()) return
    setTickets(prev=>prev.map(t=>t.id===selected.id?{...t,status:'in-progress'}:t))
    setReply('')
    setSelected(null)
  }

  if (loading) return <Spinner/>
  if (error) return <ErrorState message={`Failed to load support tickets: ${error}`} onRetry={load}/>

  return (
    <div>
      <PageHeader title="Support Management" subtitle={`${tickets.filter(t=>t.status!=='resolved').length} open tickets`}/>
      <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:16 }}>
        <Card>
          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            {['all','open','in-progress','resolved'].map(s=>(
              <Button key={s} variant={s==='all'?'ghost':'ghost'} size="sm"
                style={{ textTransform:'capitalize', color:s==='open'?'var(--gold)':s==='in-progress'?'var(--accent)':s==='resolved'?'var(--green)':'var(--text2)' }}
                onClick={()=>{}}>
                {s==='all'?`All (${tickets.length})`:s==='open'?`Open (${tickets.filter(t=>t.status==='open').length})`:s==='in-progress'?`Active (${tickets.filter(t=>t.status==='in-progress').length})`:`Done (${tickets.filter(t=>t.status==='resolved').length})`}
              </Button>
            ))}
          </div>
          {tickets.length===0?<EmptyState icon="🎧" message="No tickets yet"/>:(
            <Table columns={[
              { key:'id',       label:'Ticket',   mono:true, render:v=>v?.slice(0,8) },
              { key:'user',     label:'User',     render:v=><span style={{ fontSize:12 }}>{v}</span> },
              { key:'subject',  label:'Subject' },
              { key:'category', label:'Category', render:v=><Badge variant="info">{v}</Badge> },
              { key:'status',   label:'Status',   render:v=><Badge variant={v==='resolved'?'success':v==='in-progress'?'info':'warning'}>{v}</Badge> },
              { key:'id', label:'Action', render:(_,row)=>(
                <div style={{ display:'flex', gap:4 }}>
                  <Button size="sm" variant="ghost" onClick={()=>setSelected(row)}>Reply</Button>
                  {row.status!=='resolved'&&<Button size="sm" variant="success" onClick={()=>updateStatus(row.id,'resolved')}>✓</Button>}
                </div>
              )},
            ]} data={tickets}/>
          )}
        </Card>
        <Card>
          <h3 style={{ fontSize:14, fontWeight:600, marginBottom:16, color:'var(--text2)' }}>
            {selected?`REPLYING: ${selected.subject}`:'SELECT A TICKET'}
          </h3>
          {selected?(
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ padding:12, background:'var(--bg2)', borderRadius:8 }}>
                <div style={{ fontSize:12, color:'var(--text3)', marginBottom:4 }}>From: {selected.user}</div>
                <div style={{ fontSize:13 }}>{selected.subject}</div>
                <Badge variant={selected.category==='payment'?'warning':'info'} style={{ marginTop:8 }}>{selected.category}</Badge>
              </div>
              <textarea rows={5} value={reply} onChange={e=>setReply(e.target.value)}
                placeholder="Type your reply…"
                style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', color:'var(--text)', fontFamily:'var(--font)', fontSize:13, resize:'vertical', outline:'none' }}/>
              <div style={{ display:'flex', gap:8 }}>
                <Button onClick={sendReply} disabled={!reply.trim()}>Send Reply</Button>
                <Button variant="ghost" onClick={()=>setSelected(null)}>Cancel</Button>
              </div>
            </div>
          ):<EmptyState icon="🎧" message="Click Reply on a ticket to respond"/>}
        </Card>
      </div>
    </div>
  )
}

// ── Security ──────────────────────────────────────────────────────────────
export function AdminSecurity() {
  const [settings, setSettings] = useState({
    twoFA: true, ipWhitelist: false, sessionTimeout: 30, maxAttempts: 5, rateLimit: 100,
  })
  const [saved, setSaved] = useState(false)
  const [auditLog] = useState([
    { action:'Admin login',          user:'peterphat1710@gmail.com', ip:'103.56.xx.xx', time:'2 min ago',  risk:'low' },
    { action:'User suspended',       user:'carol@example.com',        ip:'103.56.xx.xx', time:'1 hour ago', risk:'medium' },
    { action:'5 failed login attempts',user:'unknown@test.com',      ip:'185.22.xx.xx', time:'3 hours ago',risk:'high' },
    { action:'Password changed',     user:'alice@example.com',        ip:'14.161.xx.xx', time:'1 day ago',  risk:'low' },
  ])

  const toggle = (key) => setSettings(s=>({...s,[key]:!s[key]}))
  const saveSettings = async () => {
    setSaved(true); setTimeout(()=>setSaved(false),2000)
  }

  return (
    <div>
      <PageHeader title="Security Management" subtitle="System security settings and audit log"/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
        <StatCard label="2FA Adoption" value="68%"  sub="↑4% this month" accent="var(--green)" icon="🔐"/>
        <StatCard label="Failed Logins" value="24"  sub="last 24 hours"  accent="var(--red)"   icon="⚠️"/>
        <StatCard label="Active Sessions" value="142" icon="💻"/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <Card>
          <h3 style={{ fontSize:14, fontWeight:600, marginBottom:16, color:'var(--text2)' }}>SECURITY SETTINGS</h3>
          {saved&&<div style={{ padding:'8px 12px', background:'rgba(0,255,136,0.1)', border:'1px solid rgba(0,255,136,0.3)', borderRadius:6, fontSize:12, color:'var(--green)', marginBottom:12 }}>✅ Settings saved</div>}

          {[
            { key:'twoFA',       label:'Two-Factor Authentication', desc:'Require 2FA for all users', type:'toggle' },
            { key:'ipWhitelist', label:'IP Whitelist',              desc:'Restrict access to whitelisted IPs', type:'toggle' },
          ].map(item=>(
            <div key={item.key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 0', borderBottom:'1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight:500, fontSize:13, marginBottom:2 }}>{item.label}</div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>{item.desc}</div>
              </div>
              <button onClick={()=>toggle(item.key)} style={{ width:44, height:24, borderRadius:12, border:'none', cursor:'pointer', background:settings[item.key]?'var(--green)':'var(--border)', transition:'background 0.2s', position:'relative', flexShrink:0 }}>
                <div style={{ position:'absolute', top:3, left:settings[item.key]?22:3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left 0.2s' }}/>
              </button>
            </div>
          ))}

          {[
            { key:'sessionTimeout', label:'Session Timeout (min)', min:5,   max:120 },
            { key:'maxAttempts',    label:'Max Login Attempts',    min:3,   max:10  },
            { key:'rateLimit',      label:'API Rate Limit (req/min)', min:10, max:500 },
          ].map(item=>(
            <div key={item.key} style={{ padding:'14px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:13, fontWeight:500 }}>{item.label}</span>
                <span style={{ fontFamily:'var(--mono)', fontSize:13, color:'var(--accent)' }}>{settings[item.key]}</span>
              </div>
              <input type="range" min={item.min} max={item.max} value={settings[item.key]}
                onChange={e=>setSettings(s=>({...s,[item.key]:parseInt(e.target.value)}))}
                style={{ width:'100%', accentColor:'var(--accent)' }}/>
            </div>
          ))}
          <Button onClick={saveSettings} style={{ marginTop:16, width:'100%' }}>Save Settings</Button>
        </Card>

        <Card>
          <h3 style={{ fontSize:14, fontWeight:600, marginBottom:16, color:'var(--text2)' }}>AUDIT LOG</h3>
          {auditLog.map((log,i)=>(
            <div key={i} style={{ padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                <span style={{ fontSize:13, fontWeight:500 }}>{log.action}</span>
                <Badge variant={log.risk==='high'?'danger':log.risk==='medium'?'warning':'success'}>{log.risk}</Badge>
              </div>
              <div style={{ fontSize:11, color:'var(--text3)' }}>{log.user} · {log.ip} · {log.time}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

// ── API ───────────────────────────────────────────────────────────────────
export function AdminAPI() {
  const [keys, setKeys] = useState([
    { id:1, name:'Main Trading Bot',  key:'cp_live_4x7z8k2m9p3q', calls:12450, limit:100, status:'active', created:'2024-01-15' },
    { id:2, name:'Analytics Service', key:'cp_live_8k2m4x7z1n5r', calls:3210,  limit:50,  status:'active', created:'2024-03-20' },
  ])
  const [modal, setModal]     = useState(false)
  const [newName, setNewName] = useState('')
  const [newLimit, setNewLimit] = useState(100)
  const [toast, setToast]     = useState('')

  const generateKey = () => {
    if (!newName.trim()) return
    const newKey = 'cp_live_' + Math.random().toString(36).slice(2,14)
    setKeys(prev=>[...prev,{ id:Date.now(), name:newName, key:newKey, calls:0, limit:newLimit, status:'active', created:new Date().toISOString().split('T')[0] }])
    setToast(`New API key generated for "${newName}"`)
    setTimeout(()=>setToast(''),3000)
    setNewName(''); setModal(false)
  }

  const revokeKey = (id) => {
    if (confirm('Revoke this API key? This cannot be undone.')) {
      setKeys(prev=>prev.filter(k=>k.id!==id))
    }
  }

  const copyKey = (key) => {
    navigator.clipboard?.writeText(key)
    setToast('API key copied to clipboard!')
    setTimeout(()=>setToast(''),2000)
  }

  return (
    <div>
      <PageHeader title="API Management" subtitle="Manage developer API keys"
        actions={[<Button key="n" onClick={()=>setModal(true)}>+ Generate Key</Button>]}/>
      {toast&&<div style={{ padding:'12px 16px', background:'rgba(0,212,255,0.08)', border:'1px solid rgba(0,212,255,0.25)', borderRadius:8, marginBottom:16, fontSize:13, color:'var(--accent)' }}>ℹ️ {toast}</div>}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }}>
        <Card>
          <h3 style={{ fontSize:14, fontWeight:600, marginBottom:16, color:'var(--text2)' }}>API KEYS ({keys.length})</h3>
          {keys.length===0?<EmptyState icon="⚙" message="No API keys yet"/>:
            keys.map(k=>(
              <div key={k.id} style={{ padding:'14px 0', borderBottom:'1px solid var(--border)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                  <div>
                    <div style={{ fontWeight:600, marginBottom:2 }}>{k.name}</div>
                    <div style={{ fontSize:11, color:'var(--text3)' }}>Created {k.created}</div>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <Badge variant={k.status==='active'?'success':'default'}>{k.status}</Badge>
                    <Button size="sm" variant="danger" onClick={()=>revokeKey(k.id)}>Revoke</Button>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:'var(--bg2)', borderRadius:6, marginBottom:8 }}>
                  <code style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--accent)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{k.key}</code>
                  <Button size="sm" variant="ghost" onClick={()=>copyKey(k.key)}>Copy</Button>
                </div>
                <div style={{ display:'flex', gap:16, fontSize:12, color:'var(--text2)' }}>
                  <span>📊 {k.calls.toLocaleString()} calls</span>
                  <span>⚡ {k.limit} req/min limit</span>
                  <div style={{ flex:1 }}>
                    <div style={{ height:4, background:'var(--border)', borderRadius:2, marginTop:4 }}>
                      <div style={{ height:'100%', width:`${Math.min(k.calls/100000*100,100)}%`, background:'var(--accent)', borderRadius:2 }}/>
                    </div>
                  </div>
                </div>
              </div>
            ))
          }
        </Card>
        <Card>
          <h3 style={{ fontSize:14, fontWeight:600, marginBottom:16, color:'var(--text2)' }}>ENDPOINTS</h3>
          {[
            { path:'/v1/markets',  method:'GET',  desc:'Market data'    },
            { path:'/v1/tickers',  method:'GET',  desc:'Price tickers'  },
            { path:'/v1/trades',   method:'GET',  desc:'Trade history'  },
            { path:'/v1/orders',   method:'POST', desc:'Place orders'   },
            { path:'/v1/account',  method:'GET',  desc:'Account info'   },
            { path:'/v1/withdraw', method:'POST', desc:'Withdrawals'    },
          ].map(ep=>(
            <div key={ep.path} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
              <div>
                <code style={{ fontFamily:'var(--mono)', fontSize:12 }}>{ep.path}</code>
                <div style={{ fontSize:11, color:'var(--text3)' }}>{ep.desc}</div>
              </div>
              <Badge variant={ep.method==='GET'?'info':'success'}>{ep.method}</Badge>
            </div>
          ))}
        </Card>
      </div>

      {modal&&(
        <Modal title="Generate New API Key" onClose={()=>setModal(false)}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Input label="Key Name" value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g. My Trading Bot"/>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <label style={{ fontSize:12, color:'var(--text2)', fontWeight:500 }}>Rate Limit (req/min): {newLimit}</label>
              <input type="range" min={10} max={500} value={newLimit} onChange={e=>setNewLimit(parseInt(e.target.value))} style={{ accentColor:'var(--accent)' }}/>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <Button variant="ghost" onClick={()=>setModal(false)}>Cancel</Button>
              <Button onClick={generateKey} disabled={!newName.trim()}>Generate</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Finance ───────────────────────────────────────────────────────────────
export function AdminFinance() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = () => {
    setLoading(true); setError(null)
    getAllTransactions()
      .then(t=>{ setTransactions(t); setLoading(false) })
      .catch(e=>{ console.error('Finance load error:', e); setError(e.message); setLoading(false) })
  }
  useEffect(load, [])

  if (loading) return <Spinner/>
  if (error) return <ErrorState message={`Failed to load financial data: ${error}`} onRetry={load}/>

  const completed = transactions.filter(t=>t.status==='completed')
  const revenue   = completed.reduce((s,t)=>s+(t.total||0)*0.001, 0)
  const volume    = completed.reduce((s,t)=>s+(t.total||0), 0)

  const months   = ['Jan','Feb','Mar','Apr','May','Jun']
  const mockRevs = [32000,35000,38000,42000,45000,48230]
  const maxRev   = Math.max(...mockRevs)

  return (
    <div>
      <PageHeader title="Financial Management" subtitle="Revenue, costs and platform finances"/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        <StatCard label="Fee Revenue"    value={`$${revenue.toFixed(2)}`}                                    accent="var(--green)" icon="💰"/>
        <StatCard label="Trading Volume" value={`$${(volume/1000).toFixed(1)}K`}                             icon="📊"/>
        <StatCard label="Completed Trans" value={completed.length}                                            icon="✅"/>
        <StatCard label="Avg Trans Size"    value={completed.length?`$${(volume/completed.length).toFixed(0)}`:'$0'} icon="📈"/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }}>
        <Card>
          <h3 style={{ fontSize:14, fontWeight:600, marginBottom:16, color:'var(--text2)' }}>MONTHLY REVENUE (PROJECTED)</h3>
          <div style={{ display:'flex', alignItems:'flex-end', gap:10, height:160, padding:'0 8px' }}>
            {months.map((m,i)=>{
              const h = Math.round(mockRevs[i]/maxRev*100)
              return (
                <div key={m} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                  <div style={{ fontSize:11, color:'var(--green)', fontFamily:'var(--mono)' }}>${(mockRevs[i]/1000).toFixed(0)}k</div>
                  <div style={{ width:'100%', height:`${h}%`, background:`linear-gradient(180deg, var(--accent), var(--green))`, borderRadius:'4px 4px 0 0', transition:'height 0.5s', minHeight:4 }}/>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>{m}</div>
                </div>
              )
            })}
          </div>
        </Card>
        <Card>
          <h3 style={{ fontSize:14, fontWeight:600, marginBottom:16, color:'var(--text2)' }}>BREAKDOWN</h3>
          {[
            { label:'Trading Fees',   value:'72%', amount:'$34,726', color:'var(--accent)' },
            { label:'Withdrawal Fees',value:'18%', amount:'$8,681',  color:'var(--green)'  },
            { label:'Listing Fees',   value:'10%', amount:'$4,823',  color:'var(--gold)'   },
          ].map(item=>(
            <div key={item.label} style={{ padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:13 }}>
                <span>{item.label}</span>
                <span style={{ fontFamily:'var(--mono)', color:item.color, fontWeight:600 }}>{item.amount}</span>
              </div>
              <div style={{ height:4, background:'var(--bg2)', borderRadius:2 }}>
                <div style={{ height:'100%', width:item.value, background:item.color, borderRadius:2 }}/>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

// ── Fees ──────────────────────────────────────────────────────────────────
export function AdminFees() {
  const [fees, setFees] = useState([
    { id:1, tier:'Standard', maker:0.1,  taker:0.15, minVolume:0,       maxVolume:50000   },
    { id:2, tier:'Silver',   maker:0.08, taker:0.12, minVolume:50000,   maxVolume:200000  },
    { id:3, tier:'Gold',     maker:0.05, taker:0.08, minVolume:200000,  maxVolume:1000000 },
    { id:4, tier:'VIP',      maker:0.02, taker:0.04, minVolume:1000000, maxVolume:null    },
  ])
  const [modal, setModal] = useState(null)
  const [form, setForm]   = useState({ tier:'', maker:0.1, taker:0.15, minVolume:0, maxVolume:50000 })
  const [saved, setSaved] = useState(false)

  const save = () => {
    if (modal==='add') setFees(p=>[...p,{ id:Date.now(),...form }])
    else setFees(p=>p.map(f=>f.id===modal.id?{...f,...form}:f))
    setModal(null); setSaved(true); setTimeout(()=>setSaved(false),2000)
  }

  return (
    <div>
      <PageHeader title="Trading Fees" subtitle="Fee tiers based on 30-day volume"
        actions={[<Button key="a" variant="outline" onClick={()=>{ setForm({tier:'',maker:0.1,taker:0.15,minVolume:0,maxVolume:50000}); setModal('add') }}>+ Add Tier</Button>]}/>
      {saved&&<div style={{ padding:'12px 16px', background:'rgba(0,255,136,0.1)', border:'1px solid rgba(0,255,136,0.3)', borderRadius:8, marginBottom:16, fontSize:13, color:'var(--green)' }}>✅ Fee schedule saved</div>}
      <Card>
        <Table columns={[
          { key:'tier',      label:'Tier',       render:v=><span style={{ fontWeight:700 }}>{v}</span> },
          { key:'maker',     label:'Maker Fee',  mono:true, align:'right', render:v=><span style={{ color:'var(--green)' }}>{v}%</span> },
          { key:'taker',     label:'Taker Fee',  mono:true, align:'right', render:v=><span style={{ color:'var(--red)' }}>{v}%</span> },
          { key:'minVolume', label:'Min Volume', mono:true, align:'right', render:v=>`$${v.toLocaleString()}` },
          { key:'maxVolume', label:'Max Volume', mono:true, align:'right', render:v=>v?`$${v.toLocaleString()}`:'Unlimited' },
          { key:'id', label:'', render:(_,row)=>(
            <Button size="sm" variant="ghost" onClick={()=>{ setForm({tier:row.tier,maker:row.maker,taker:row.taker,minVolume:row.minVolume,maxVolume:row.maxVolume||0}); setModal(row) }}>Edit</Button>
          )},
        ]} data={fees}/>
      </Card>

      {modal&&(
        <Modal title={modal==='add'?'Add Fee Tier':'Edit Fee Tier'} onClose={()=>setModal(null)}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Input label="Tier Name" value={form.tier} onChange={e=>setForm(f=>({...f,tier:e.target.value}))} placeholder="e.g. Diamond"/>
            <Input label="Maker Fee %" type="number" value={form.maker} onChange={e=>setForm(f=>({...f,maker:parseFloat(e.target.value)}))}/>
            <Input label="Taker Fee %" type="number" value={form.taker} onChange={e=>setForm(f=>({...f,taker:parseFloat(e.target.value)}))}/>
            <Input label="Min 30d Volume ($)" type="number" value={form.minVolume} onChange={e=>setForm(f=>({...f,minVolume:parseFloat(e.target.value)}))}/>
            <Input label="Max 30d Volume ($ — 0 = unlimited)" type="number" value={form.maxVolume||0} onChange={e=>setForm(f=>({...f,maxVolume:parseFloat(e.target.value)||null}))}/>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:8 }}>
              <Button variant="ghost" onClick={()=>setModal(null)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Promotions ────────────────────────────────────────────────────────────
export function AdminPromotions() {
  const [promotions, setPromotions] = useState([
    { id:1, title:'Zero Fee Weekend',  desc:'Trade BTC/USDT with 0% fee this weekend.',        discount:'100% fee off',   expires:'2024-12-22', status:'active',   code:'ZEROFEE'   },
    { id:2, title:'New User Bonus',    desc:'Get $50 USDT bonus on first deposit over $500.',  discount:'$50 USDT',       expires:'2024-12-31', status:'active',   code:'NEWUSER50' },
    { id:3, title:'Referral Reward',   desc:'Earn 20% of your referrals\' trading fees.',      discount:'20% commission', expires:'2024-09-30', status:'inactive', code:'REF20'     },
  ])
  const [modal, setModal] = useState(null)
  const [form, setForm]   = useState({ title:'', desc:'', discount:'', expires:'', status:'active', code:'' })

  const save = () => {
    if (modal==='add') setPromotions(p=>[...p,{ id:Date.now(),...form }])
    else setPromotions(p=>p.map(x=>x.id===modal.id?{...x,...form}:x))
    setModal(null)
  }

  const genCode = () => setForm(f=>({...f,code:Math.random().toString(36).slice(2,10).toUpperCase()}))

  return (
    <div>
      <PageHeader title="Promotions" subtitle={`${promotions.filter(p=>p.status==='active').length} active campaigns`}
        actions={[<Button key="a" onClick={()=>{ setForm({title:'',desc:'',discount:'',expires:'',status:'active',code:''}); setModal('add') }}>+ New Promo</Button>]}/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
        {promotions.map(promo=>(
          <Card key={promo.id} style={{ background:`linear-gradient(135deg,var(--card) 0%,${promo.status==='active'?'rgba(0,212,255,0.05)':'rgba(255,255,255,0.01)'} 100%)`, border:`1px solid ${promo.status==='active'?'rgba(0,212,255,0.2)':'var(--border)'}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
              <Badge variant={promo.status==='active'?'success':'default'}>{promo.status}</Badge>
              <div style={{ display:'flex', gap:6 }}>
                <Button size="sm" variant="ghost" onClick={()=>{ setForm(promo); setModal(promo) }}>Edit</Button>
                <Button size="sm" variant="danger" onClick={()=>{ if(confirm('Delete?')) setPromotions(p=>p.filter(x=>x.id!==promo.id)) }}>Del</Button>
              </div>
            </div>
            <h3 style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>{promo.title}</h3>
            <p style={{ fontSize:12, color:'var(--text2)', marginBottom:12, lineHeight:1.5 }}>{promo.desc}</p>
            <div style={{ fontSize:20, fontWeight:700, color:'var(--green)', fontFamily:'var(--mono)', marginBottom:6 }}>{promo.discount}</div>
            {promo.code&&<div style={{ padding:'6px 10px', background:'var(--bg2)', borderRadius:6, fontFamily:'var(--mono)', fontSize:13, letterSpacing:2, color:'var(--accent)', marginBottom:8, display:'inline-block' }}>{promo.code}</div>}
            <div style={{ fontSize:11, color:'var(--text3)' }}>Expires: {promo.expires}</div>
          </Card>
        ))}
      </div>

      {modal&&(
        <Modal title={modal==='add'?'New Promotion':'Edit Promotion'} onClose={()=>setModal(null)}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Input label="Title"    value={form.title}    onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Zero Fee Weekend"/>
            <Input label="Description" value={form.desc}  onChange={e=>setForm(f=>({...f,desc:e.target.value}))}  placeholder="Short description"/>
            <Input label="Discount" value={form.discount} onChange={e=>setForm(f=>({...f,discount:e.target.value}))} placeholder="e.g. $50 USDT or 20% off"/>
            <Input label="Expires"  type="date" value={form.expires} onChange={e=>setForm(f=>({...f,expires:e.target.value}))}/>
            <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
              <div style={{ flex:1 }}><Input label="Promo Code" value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="e.g. SAVE20"/></div>
              <Button variant="ghost" onClick={genCode} style={{ flexShrink:0 }}>Generate</Button>
            </div>
            <Select label="Status" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}
              options={[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'}]}/>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:8 }}>
              <Button variant="ghost" onClick={()=>setModal(null)}>Cancel</Button>
              <Button onClick={save} disabled={!form.title}>Save</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
