import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../api'

function mergeSeries(left, right) {
  const map = new Map()
  left.forEach((p) => {
    map.set(p.date, { date: p.date, left: p.value })
  })
  right.forEach((p) => {
    const row = map.get(p.date) || { date: p.date }
    row.right = p.value
    map.set(p.date, row)
  })
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export default function Compare() {
  const [cities, setCities] = useState([])
  const [left, setLeft] = useState('1')
  const [right, setRight] = useState('2')
  const [data, setData] = useState([])
  const [names, setNames] = useState({ left: '', right: '' })

  useEffect(() => {
    api.cities().then((list) => {
      setCities(list)
      if (list[0]) setLeft(String(list[0].id))
      if (list[1]) setRight(String(list[1].id))
    })
  }, [])

  useEffect(() => {
    if (!left || !right) return
    api.compare(left, right, 90).then((res) => {
      setData(
        mergeSeries(
          res.left_points.map((p) => ({ date: p.date, value: p.value })),
          res.right_points.map((p) => ({ date: p.date, value: p.value })),
        ),
      )
      const l = cities.find((c) => String(c.id) === left)
      const r = cities.find((c) => String(c.id) === right)
      setNames({ left: l?.name || left, right: r?.name || right })
    })
  }, [left, right, cities])

  return (
    <div className="page">
      <h1>Compare cities</h1>
      <p className="muted">Overlay PM2.5 trends — useful for viva discussions on regional patterns.</p>
      <div className="pickers">
        <select className="input" value={left} onChange={(e) => setLeft(e.target.value)}>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <span>vs</span>
        <select className="input" value={right} onChange={(e) => setRight(e.target.value)}>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <motion.div
        className="card"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45 }}
      >
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={data}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: '#8b9aab', fontSize: 10 }} minTickGap={24} />
            <YAxis tick={{ fill: '#8b9aab', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#151f28', border: '1px solid #2dd4bf33' }} />
            <Legend />
            <Line type="monotone" dataKey="left" name={names.left} stroke="#2dd4bf" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="right" name={names.right} stroke="#f59e0b" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>
      <style>{`
        .muted { color: var(--muted); }
        .pickers {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 1rem 0;
          flex-wrap: wrap;
        }
        .pickers select { max-width: 220px; }
      `}</style>
    </div>
  )
}
