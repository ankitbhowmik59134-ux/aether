import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../api'
import { useAuth } from '../auth'
import AqiGauge from '../components/AqiGauge'

const POLLUTANTS = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3']

export default function CityDetail() {
  const { id } = useParams()
  const { token, isLoggedIn } = useAuth()
  const [city, setCity] = useState(null)
  const [pollutant, setPollutant] = useState('pm25')
  const [series, setSeries] = useState([])
  const [forecast, setForecast] = useState(null)
  const [plan, setPlan] = useState(null)

  useEffect(() => {
    api.city(id).then(setCity)
    api.forecast(id).then(setForecast)
    api.plan(id, token).then(setPlan)
  }, [id, token])

  useEffect(() => {
    api.series(id, 90, pollutant).then((d) =>
      setSeries(d.points.map((p) => ({ ...p, label: p.date }))),
    )
  }, [id, pollutant])

  const downloadPdf = async () => {
    const res = await fetch(`/api/cities/${id}/report.pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aether-${city?.slug || id}-report.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!city) return <div className="page">Loading…</div>

  const fcPoints =
    forecast?.points?.map((p) => ({
      date: p.date,
      forecast: p.pm25,
      lower: p.lower,
      upper: p.upper,
    })) || []

  return (
    <div className="page city-detail">
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="detail-header"
      >
        <div>
          <h1>{city.name}</h1>
          <p className="muted">{city.state}</p>
        </div>
        <AqiGauge aqi={city.latest_aqi} category={city.latest_category} />
      </motion.header>

      <div className="chips">
        {POLLUTANTS.map((p) => (
          <motion.button
            key={p}
            type="button"
            className={`chip ${pollutant === p ? 'active' : ''}`}
            onClick={() => setPollutant(p)}
            whileTap={{ scale: 0.96 }}
          >
            {p.toUpperCase()}
            {city.pollutants?.[p] != null && (
              <span className="chip-val">{Math.round(city.pollutants[p])}</span>
            )}
          </motion.button>
        ))}
      </div>

      <motion.div
        className="card chart-card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h2>90-day {pollutant.toUpperCase()}</h2>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={series}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: '#8b9aab', fontSize: 11 }} hide />
            <YAxis tick={{ fill: '#8b9aab', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#151f28', border: '1px solid #2dd4bf33' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#2dd4bf"
              fill="url(#tealGrad)"
              strokeWidth={2}
            />
            <defs>
              <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0} />
              </linearGradient>
            </defs>
          </ComposedChart>
        </ResponsiveContainer>
      </motion.div>

      <motion.div
        className="card chart-card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <h2>
          7-day forecast
          <span className="method">({forecast?.method || '…'})</span>
        </h2>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={fcPoints}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: '#8b9aab', fontSize: 11 }} />
            <YAxis tick={{ fill: '#8b9aab', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#151f28', border: '1px solid #f59e0b33' }}
            />
            <Area
              type="monotone"
              dataKey="upper"
              stroke="none"
              fill="#f59e0b22"
            />
            <Area type="monotone" dataKey="lower" stroke="none" fill="#0a0f14" />
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </motion.div>

      <motion.div
        className="card plan-panel"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <div className="plan-head">
          <h2>Activity plan</h2>
          {isLoggedIn && (
            <button type="button" className="btn" onClick={downloadPdf}>
              Download PDF
            </button>
          )}
        </div>
        <p>{plan?.summary}</p>
        {plan?.tier === 'guest' && (
          <p className="guest-hint">
            <a href="/login">Log in</a> for the full 7-day plan (outdoor, masks, ventilation, sensitive groups).
          </p>
        )}
        {plan?.sections?.map((s) => (
          <div key={s.title} className="plan-section">
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </div>
        ))}
      </motion.div>

      <style>{`
        .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .muted { color: var(--muted); }
        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .chip {
          border: 1px solid var(--border);
          background: var(--ink-soft);
          color: var(--text);
          border-radius: 999px;
          padding: 0.4rem 0.85rem;
          font-size: 0.8rem;
        }
        .chip.active { border-color: var(--teal); color: var(--teal); }
        .chip-val { margin-left: 0.35rem; opacity: 0.7; }
        .chart-card { margin-bottom: 1rem; }
        .chart-card h2 { margin-top: 0; font-size: 1.15rem; }
        .method {
          font-size: 0.85rem;
          color: var(--muted);
          font-weight: 400;
          margin-left: 0.5rem;
        }
        .plan-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }
        .plan-section h3 { font-size: 1rem; margin-bottom: 0.35rem; }
        .plan-section p { color: var(--muted); line-height: 1.55; }
        .guest-hint {
          padding: 0.75rem 1rem;
          background: rgba(45, 212, 191, 0.08);
          border-radius: 12px;
        }
      `}</style>
    </div>
  )
}
