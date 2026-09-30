import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api'
import { useAuth } from '../auth'

export default function Watchlist() {
  const { token, isLoggedIn } = useAuth()
  const [watches, setWatches] = useState([])
  const [cities, setCities] = useState([])
  const [cityId, setCityId] = useState('')
  const [threshold, setThreshold] = useState(200)

  useEffect(() => {
    api.cities().then(setCities)
  }, [])

  useEffect(() => {
    if (!isLoggedIn) return
    api.watches(token).then(setWatches)
  }, [isLoggedIn, token])

  if (!isLoggedIn) {
    return (
      <div className="page">
        <h1>Watchlist</h1>
        <p><Link to="/login">Log in</Link> to watch cities and receive threshold alerts.</p>
      </div>
    )
  }

  const add = async (e) => {
    e.preventDefault()
    await api.addWatch(token, Number(cityId), Number(threshold))
    setWatches(await api.watches(token))
  }

  const remove = async (id) => {
    await api.deleteWatch(token, id)
    setWatches(await api.watches(token))
  }

  return (
    <div className="page">
      <h1>Your watches</h1>
      <form className="card add-form" onSubmit={add}>
        <select className="input" value={cityId} onChange={(e) => setCityId(e.target.value)} required>
          <option value="">Select city</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input
          className="input"
          type="number"
          min={50}
          max={500}
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">Add watch</button>
      </form>
      <div className="list">
        {watches.map((w, i) => (
          <motion.div
            key={w.id}
            className="card watch-row"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div>
              <Link to={`/cities/${w.city_id}`}>{w.city_name}</Link>
              <p className="muted">Threshold {w.aqi_threshold} · Latest AQI {w.latest_aqi ?? '—'}</p>
            </div>
            <button type="button" className="btn" onClick={() => remove(w.id)}>Remove</button>
          </motion.div>
        ))}
      </div>
      <style>{`
        .add-form {
          display: grid;
          grid-template-columns: 1fr 120px auto;
          gap: 0.75rem;
          margin: 1rem 0;
        }
        @media (max-width: 640px) {
          .add-form { grid-template-columns: 1; }
        }
        .list { display: flex; flex-direction: column; gap: 0.75rem; }
        .watch-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }
        .muted { color: var(--muted); margin: 0.25rem 0 0; font-size: 0.9rem; }
      `}</style>
    </div>
  )
}
