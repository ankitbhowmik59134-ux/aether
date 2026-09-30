import { useEffect, useState } from 'react'
import { animate, useMotionValue, useTransform, motion } from 'framer-motion'

export default function CountUp({ value, duration = 1.2, suffix = '' }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v))
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (value == null) return
    const controls = animate(count, value, { duration, ease: 'easeOut' })
    return controls.stop
  }, [value, count, duration])

  useEffect(() => {
    const unsub = rounded.on('change', (v) => setDisplay(v))
    return () => unsub()
  }, [rounded])

  if (value == null) return <span>—</span>
  return (
    <motion.span>{display}{suffix}</motion.span>
  )
}
