import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../api'
import { useAuth } from '../auth'
import CityCard from '../components/CityCard'

export default function Home() {
  const { token, isLoggedIn } = useAuth()
  const [cities, setCities] = useState([])
  const [alerts, setAlerts] = useState([])
  const [q, setQ] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.cities()
      .then(setCities)
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    if (!isLoggedIn) return
    api.alerts(token)
      .then(setAlerts)
      .catch(() => {})
  }, [isLoggedIn, token])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return cities
    return cities.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.state.toLowerCase().includes(term),
    )
  }, [cities, q])

  return (
    <div className="page">
      <motion.section
        className="hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <p className="eyebrow">Indian cities · trends · forecasts</p>
        <h1>Air you can read, plans you can use.</h1>
        <p className="lead">
          Aether fuses ground monitors and satellite estimates, forecasts PM2.5 with SARIMAX,
          and turns the numbers into a plain-language weekly activity plan.
        </p>
        <input
          className="input search"
          placeholder="Search city or state…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </motion.section>

      {isLoggedIn && alerts.length > 0 && (
        <div className="alert-strip">
          {alerts.slice(0, 2).map((a) => (
            <div key={a.id}>{a.message}</div>
          ))}
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <div className="city-grid">
        {filtered.map((city, i) => (
          <CityCard key={city.id} city={city} index={i} />
        ))}
      </div>

      <style>{`
        .hero { margin-bottom: 2rem; max-width: 640px; }
        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 0.75rem;
          color: var(--teal);
          margin: 0 0 0.5rem;
        }
        .hero h1 { font-size: clamp(2rem, 5vw, 2.75rem); margin: 0 0 0.75rem; }
        .lead { color: var(--muted); line-height: 1.6; margin: 0 0 1.25rem; }
        .search { max-width: 360px; }
        .city-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 1rem;
        }
        .error { color: #f87171; }
      `}</style>
    </div>
  )
}
