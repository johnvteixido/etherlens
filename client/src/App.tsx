import { useState, useEffect } from 'react'
import axios from 'axios'
import { Search, Server, Activity, Globe, ShieldAlert, Cpu } from 'lucide-react'
import './App.css'

interface Host {
  id: number
  ip_address: string
  port: number
  banner: string
  country: string
  device_type: string
  risk_level: string
  timestamp: string
}

const apiClient = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'x-api-key': 'etherlens_admin'
  }
})

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Host[]>([])
  const [stats, setStats] = useState({ total_hosts: 0, top_ports: [], top_countries: [], risk_levels: [] })
  const [insights, setInsights] = useState({ categories: [], high_risk_hosts: [] })
  const [loading, setLoading] = useState(false)
  const [apiStatus, setApiStatus] = useState<'online' | 'offline'>('online')

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/stats')
      if (res.data) {
        setStats(res.data)
        setApiStatus('online')
      }
    } catch (err) {
      console.error("Stats fetch error")
      setApiStatus('offline')
    }
  }

  const fetchInsights = async () => {
    try {
      const res = await apiClient.get('/ai/insights')
      if (res.data) setInsights(res.data)
    } catch (err) {
      console.error("Insights fetch error")
    }
  }

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoading(true)
    try {
      const res = await apiClient.get(`/search?q=${encodeURIComponent(query)}`)
      setResults(res.data.matches || [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  // Initial load
  useEffect(() => {
    fetchStats()
    fetchInsights()
    handleSearch()

    // Poll stats every 5s to show live daemon progress
    const interval = setInterval(() => {
      fetchStats()
      fetchInsights()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="app-container">
      {/* Navbar */}
      <nav className="navbar glass-panel">
        <div className="logo">
          <Globe className="icon neon-text-cyan" />
          <span className="brand">Ether<span className="neon-text-cyan">Lens</span></span>
          <div className={`status-pill ${apiStatus}`}>
            <div className="dot"></div> {apiStatus.toUpperCase()}
          </div>
        </div>
        <div className="nav-links">
          <a href="#">Explore</a>
          <a href="#">Report</a>
          <a href="#">Pricing</a>
        </div>
      </nav>

      <main className="main-content">

        {/* Search Header */}
        <section className="search-section">
          <h1 className="hero-title">The Search Engine for the <span className="neon-text-magenta">Internet of Things</span></h1>
          <p className="hero-subtitle">Discover exposed devices, servers, and infrastructure.</p>

          <form className="search-bar-container glass-panel" onSubmit={handleSearch}>
            <Search className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search e.g. port:22 type:Router apache..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className="search-btn">Scan</button>
          </form>

          <div className="search-hints">
            <span>Try:</span>
            <button onClick={() => setQuery('port:22')}>port:22</button>
            <button onClick={() => setQuery('type:Web Server')}>type:Web Server</button>
            <button onClick={() => setQuery('nginx')}>nginx</button>
          </div>
        </section>

        <div className="dashboard-grid">

          {/* Sidebar Stats */}
          <aside className="sidebar">
            <div className="stat-card glass-panel">
              <h3><Activity size={16} /> Live Index</h3>
              <div className="stat-value neon-text-cyan">{stats.total_hosts?.toLocaleString() || 0}</div>
              <div className="stat-label">Nodes Indexed</div>
            </div>

            <div className="stat-card glass-panel flex-col">
              <h3><Cpu size={16} className="neon-text-magenta" /> AI Categories</h3>
              <ul className="stat-list">
                {insights.categories?.map((c: any) => (
                  <li key={c.device_type}>
                    <span>{c.device_type}</span>
                    <span className="count">{c.count}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="stat-card glass-panel flex-col">
              <h3>Risk Levels</h3>
              <ul className="stat-list">
                {stats.risk_levels?.map((r: any) => (
                  <li key={r.risk_level}>
                    <span className={r.risk_level === 'High' || r.risk_level === 'Critical' ? 'neon-text-magenta' : ''}>
                      {r.risk_level}
                    </span>
                    <span className="count">{r.count}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="stat-card glass-panel flex-col">
              <h3>Top Ports</h3>
              <ul className="stat-list">
                {stats.top_ports?.map((p: any) => (
                  <li key={p.port}>
                    <span>{p.port}</span>
                    <span className="count">{p.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Results Area */}
          <section className="results-area">
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Querying Global Lens...</p>
              </div>
            ) : (
              <div className="results-list">
                {results.length === 0 ? (
                  <div className="no-results glass-panel">
                    <ShieldAlert className="neon-text-magenta" size={48} />
                    <h2>No targets found</h2>
                    <p>Try broadening your search or wait for the daemon to index more hosts.</p>
                  </div>
                ) : (
                  results.map((host) => (
                    <div key={host.id} className="host-card glass-panel">
                      <div className="host-header">
                        <div className="host-ip">{host.ip_address}</div>
                        <div className="host-badges">
                          <span className="badge category-badge">{host.device_type}</span>
                          <span className={`badge risk-badge risk-${host.risk_level?.toLowerCase()}`}>{host.risk_level} Risk</span>
                        </div>
                        <div className="host-country">{host.country}</div>
                      </div>
                      <div className="host-details">
                        <div className="host-port">
                          <Server size={14} /> Port: {host.port}
                        </div>
                        <div className="host-time">{new Date(host.timestamp).toLocaleString()}</div>
                      </div>
                      <div className="host-banner">
                        <pre>{host.banner}</pre>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>

        </div>
      </main>

    </div>
  )
}

export default App
