import { useState, useEffect } from 'react'
import axios from 'axios'
import { Search, Server, Activity, Globe, ShieldAlert } from 'lucide-react'
import './App.css'

interface Host {
  id: number
  ip_address: string
  port: number
  banner: string
  country: string
  timestamp: string
}

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Host[]>([])
  const [stats, setStats] = useState({ total_hosts: 0, top_ports: [], top_countries: [] })
  const [loading, setLoading] = useState(false)

  const fetchStats = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/stats')
      setStats(res.data)
    } catch (err) {
      console.error("Backend offline or error fetching stats")
    }
  }

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoading(true)
    try {
      const res = await axios.get(`http://localhost:3001/api/search?q=${encodeURIComponent(query)}`)
      setResults(res.data.matches)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  // Initial load
  useEffect(() => {
    fetchStats()
    handleSearch()
    // Poll stats every 5s to show live daemon progress
    const interval = setInterval(fetchStats, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="app-container">
      {/* Navbar */}
      <nav className="navbar glass-panel">
        <div className="logo">
          <Globe className="icon neon-text-cyan" />
          <span className="brand">Ether<span className="neon-text-cyan">Lens</span></span>
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
              placeholder="Search e.g. port:22 country:UK apache..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className="search-btn">Scan</button>
          </form>

          <div className="search-hints">
            <span>Try:</span>
            <button onClick={() => setQuery('port:22')}>port:22</button>
            <button onClick={() => setQuery('country:USA')}>country:USA</button>
            <button onClick={() => setQuery('nginx')}>nginx</button>
          </div>
        </section>

        <div className="dashboard-grid">

          {/* Sidebar Stats */}
          <aside className="sidebar">
            <div className="stat-card glass-panel">
              <h3><Activity size={16} /> Live Index</h3>
              <div className="stat-value neon-text-cyan">{stats.total_hosts.toLocaleString()}</div>
              <div className="stat-label">Nodes Indexed</div>
            </div>

            <div className="stat-card glass-panel flex-col">
              <h3>Top Ports</h3>
              <ul className="stat-list">
                {stats.top_ports.map((p: any) => (
                  <li key={p.port}>
                    <span>{p.port}</span>
                    <span className="count">{p.count}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="stat-card glass-panel flex-col">
              <h3>Top Countries</h3>
              <ul className="stat-list">
                {stats.top_countries.map((c: any) => (
                  <li key={c.country}>
                    <span>{c.country}</span>
                    <span className="count">{c.count}</span>
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
