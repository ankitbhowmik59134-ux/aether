import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { categoryColor, trendLabel } from '../aqiTheme'
import CountUp from './CountUp'

export default function CityCard({ city, index }) {
  const color = categoryColor(city.latest_category)

  return (
    <motion.article
      className="city-card card"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.45 }}
      whileHover={{ y: -4, borderColor: 'rgba(45, 212, 191, 0.45)' }}
    >
      <Link to={`/cities/${city.id}`} className="city-card-link">
        <div className="city-top">
          <h3>{city.name}</h3>
          <span className="state">{city.state}</span>
        </div>
        <div className="city-metrics">
          <div className="aqi-pill" style={{ borderColor: color, color }}>
            AQI <CountUp value={city.latest_aqi} />
          </div>
          <span className="trend">{trendLabel(city.trend_direction)}</span>
        </div>
        <p className="cat" style={{ color }}>{city.latest_category}</p>
      </Link>
      <style>{`
        .city-card { padding: 0; overflow: hidden; }
        .city-card-link {
          display: block;
          padding: 1.25rem;
          color: inherit;
          text-decoration: none;
        }
        .city-top h3 { margin: 0; font-size: 1.25rem; }
        .state { color: var(--muted); font-size: 0.85rem; }
        .city-metrics {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 1rem;
        }
        .aqi-pill {
          border: 1px solid;
          border-radius: 999px;
          padding: 0.35rem 0.75rem;
          font-weight: 600;
          font-size: 0.95rem;
        }
        .trend { font-size: 0.8rem; color: var(--muted); }
        .cat { margin: 0.5rem 0 0; font-size: 0.9rem; font-weight: 500; }
      `}</style>
    </motion.article>
  )
}
