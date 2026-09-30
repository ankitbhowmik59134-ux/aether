import { motion } from 'framer-motion'

const steps = [
  {
    title: 'Ground monitors',
    body: 'Daily station-style readings (PM2.5, PM10, gases) with local bias — higher weight near urban cores.',
  },
  {
    title: 'Satellite estimates',
    body: 'Gridded AOD-style proxies with wider coverage but more smoothing — captures regional smoke transport.',
  },
  {
    title: 'Fusion layer',
    body: 'Weighted blend (65% ground, 35% satellite) per pollutant, then Indian AQI sub-indices with a dominant pollutant tag.',
  },
  {
    title: 'Forecast & plan',
    body: 'SARIMAX on fused PM2.5 (fallback moving average) feeds a deterministic rules agent — not an external LLM.',
  },
]

export default function Sources() {
  return (
    <div className="page">
      <h1>Two-source fusion</h1>
      <p className="lead">
        For your viva: explain why multi-source beats a single CSV, how weights were chosen, and that this dataset is
        <strong> seeded synthetic history</strong> — not a live CPCB feed.
      </p>
      <div className="steps">
        {steps.map((s, i) => (
          <motion.div
            key={s.title}
            className="card step"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <span className="num">{i + 1}</span>
            <div>
              <h2>{s.title}</h2>
              <p>{s.body}</p>
            </div>
          </motion.div>
        ))}
      </div>
      <style>{`
        .lead { color: var(--muted); line-height: 1.65; max-width: 720px; }
        .steps { display: flex; flex-direction: column; gap: 1rem; margin-top: 1.5rem; }
        .step { display: flex; gap: 1rem; align-items: flex-start; }
        .step h2 { margin: 0 0 0.35rem; font-size: 1.1rem; }
        .step p { margin: 0; color: var(--muted); line-height: 1.55; }
        .num {
          font-family: var(--font-display);
          color: var(--teal);
          font-size: 1.5rem;
          min-width: 2rem;
        }
      `}</style>
    </div>
  )
}
