// CoinMarketCap API — uses a reliable free CORS proxy
const CMC_API_KEY = '365a48c641e646179c16090ae833d341'
const CMC_BASE    = 'https://pro-api.coinmarketcap.com/v1'

// Two proxy options tried in order — whichever responds first wins
const PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
]

const SYMBOL_LOGOS = {
  BTC:'₿', ETH:'Ξ', SOL:'◎', BNB:'B', ADA:'₳', XRP:'X',
  DOGE:'Ð', DOT:'●', AVAX:'A', MATIC:'M', LTC:'Ł', LINK:'⬡',
  UNI:'🦄', ATOM:'⚛', NEAR:'N', SHIB:'🐕', TRX:'T', TON:'💎',
  BCH:'₿', ALGO:'A',
}

export const MOCK_ASSETS = [
  { symbol:'BTC',  name:'Bitcoin',   price:67234.50, change:2.34,  volume:'28.4B', marketCap:'1.32T', logo:'₿'  },
  { symbol:'ETH',  name:'Ethereum',  price:3541.20,  change:-1.12, volume:'14.2B', marketCap:'425.6B',logo:'Ξ'  },
  { symbol:'SOL',  name:'Solana',    price:178.90,   change:5.67,  volume:'3.8B',  marketCap:'82.1B', logo:'◎'  },
  { symbol:'BNB',  name:'BNB',       price:587.30,   change:0.89,  volume:'1.9B',  marketCap:'87.4B', logo:'B'  },
  { symbol:'ADA',  name:'Cardano',   price:0.624,    change:-2.45, volume:'0.8B',  marketCap:'22.1B', logo:'₳'  },
  { symbol:'XRP',  name:'XRP',       price:0.589,    change:1.23,  volume:'1.2B',  marketCap:'33.5B', logo:'X'  },
  { symbol:'DOGE', name:'Dogecoin',  price:0.178,    change:8.34,  volume:'2.1B',  marketCap:'25.6B', logo:'Ð'  },
  { symbol:'DOT',  name:'Polkadot',  price:8.92,     change:-0.56, volume:'0.5B',  marketCap:'12.3B', logo:'●'  },
  { symbol:'AVAX', name:'Avalanche', price:38.40,    change:3.21,  volume:'0.9B',  marketCap:'15.7B', logo:'A'  },
  { symbol:'MATIC',name:'Polygon',   price:0.91,     change:-1.80, volume:'0.7B',  marketCap:'8.9B',  logo:'M'  },
]

function fmt(n) {
  if (n >= 1e12) return (n/1e12).toFixed(2)+'T'
  if (n >= 1e9)  return (n/1e9).toFixed(1)+'B'
  if (n >= 1e6)  return (n/1e6).toFixed(1)+'M'
  return n.toLocaleString()
}

// Cache so we don't re-fetch on every component mount
let _cache = null
let _cacheTime = 0
const CACHE_TTL = 55_000 // 55 seconds

async function tryFetch(url, headers, timeoutMs = 6000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch(e) {
    clearTimeout(timer)
    throw e
  }
}

export async function fetchTopCryptos(limit = 20) {
  // Return cache if fresh
  if (_cache && Date.now() - _cacheTime < CACHE_TTL) return _cache

  const endpoint = encodeURIComponent(
    `${CMC_BASE}/cryptocurrency/listings/latest?start=1&limit=${limit}&convert=USD`
  )
  const headers = { 'X-CMC_PRO_API_KEY': CMC_API_KEY, 'Accept': 'application/json' }

  for (const proxy of PROXIES) {
    try {
      const json = await tryFetch(`${proxy}${endpoint}`, headers, 6000)
      if (!json?.data) throw new Error('Bad response shape')

      const result = json.data.map(coin => ({
        cmcId:     coin.id,
        symbol:    coin.symbol,
        name:      coin.name,
        logo:      SYMBOL_LOGOS[coin.symbol] || coin.symbol[0],
        price:     parseFloat(coin.quote.USD.price.toFixed(coin.quote.USD.price < 1 ? 6 : 2)),
        change:    parseFloat(coin.quote.USD.percent_change_24h.toFixed(2)),
        volume:    fmt(coin.quote.USD.volume_24h),
        marketCap: fmt(coin.quote.USD.market_cap),
      }))
      _cache = result
      _cacheTime = Date.now()
      return result
    } catch(e) {
      console.warn(`Proxy ${proxy} failed:`, e.message)
    }
  }

  console.warn('All CMC proxies failed — using mock data')
  return _cache || MOCK_ASSETS
}

export async function fetchGlobalMetrics() {
  const endpoint = encodeURIComponent(`${CMC_BASE}/global-metrics/quotes/latest`)
  const headers  = { 'X-CMC_PRO_API_KEY': CMC_API_KEY, 'Accept': 'application/json' }

  for (const proxy of PROXIES) {
    try {
      const json = await tryFetch(`${proxy}${endpoint}`, headers, 6000)
      const d = json?.data
      if (!d) throw new Error('Bad response')
      return {
        totalMarketCap: fmt(d.quote.USD.total_market_cap),
        totalVolume:    fmt(d.quote.USD.total_volume_24h),
        btcDominance:   d.btc_dominance.toFixed(1) + '%',
        activeCryptos:  d.active_cryptocurrencies.toLocaleString(),
      }
    } catch(e) {
      console.warn(`Global metrics proxy failed:`, e.message)
    }
  }
  return { totalMarketCap:'$2.04T', totalVolume:'$89.3B', btcDominance:'52.4%', activeCryptos:'2,843' }
}
