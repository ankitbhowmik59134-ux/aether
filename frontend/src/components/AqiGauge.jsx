import { motion } from 'framer-motion'
import { categoryColor } from '../aqiTheme'
import CountUp from './CountUp'

export default function AqiGauge({ aqi, category }) {
  const color = categoryColor(category)
  const pct = Math.min(100, (aqi || 0) / 500 * 100)
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (pct / 100) * circumference * 0.75

  return (
    <div className="gauge-wrap">
      <svg width="160" height="160" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="#1e293b" strokeWidth="10" />
        <motion.circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
          transform="rotate(135 60 60)"
        />
      </svg>
      <div className="gauge-center">
        <div className="gauge-value">
          <CountUp value={aqi} />
        </div>
        <div className="gauge-cat" style={{ color }}>{category || '—'}</div>
      </div>
      <style>{`
        .gauge-wrap { position: relative; width: 160px; height: 160px; margin: 0 auto; }
        .gauge-center {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .gauge-value {
          font-family: var(--font-display);
          font-size: 2rem;
          font-weight: 700;
          line-height: 1;
        }
        .gauge-cat {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-top: 0.25rem;
        }
      `}</style>
    </div>
  )
}
