import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export const CATEGORY_COLOR = {
  Good: "#3dceb0",
  Satisfactory: "#8fd18a",
  Moderate: "#e4c15a",
  Poor: "#e08a3c",
  "Very Poor": "#e07a66",
  Severe: "#c44b6a",
};

export function colorFor(category) {
  return CATEGORY_COLOR[category] || "#3dceb0";
}

const MOTES = Array.from({ length: 14 }, (_, index) => ({
  id: index,
  left: `${(index * 7.3) % 100}%`,
  delay: index * 0.7,
  duration: 12 + (index % 5) * 2,
  size: 2 + (index % 3),
}));

export function Background() {
  return (
    <div className="sky" aria-hidden="true">
      <motion.div
        className="orb a"
        animate={{ y: [0, 36, 0], x: [0, 24, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="orb b"
        animate={{ y: [0, -24, 0], x: [0, -16, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      {MOTES.map((mote) => (
        <motion.span
          key={mote.id}
          className="mote"
          style={{ left: mote.left, width: mote.size, height: mote.size }}
          animate={{ y: ["110vh", "-10vh"], opacity: [0, 0.7, 0] }}
          transition={{ duration: mote.duration, delay: mote.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
}

export function MiniMeter({ aqi, category }) {
  const radius = 18;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, (Number(aqi) || 0) / 500));
  return (
    <svg className="mini-meter" viewBox="0 0 52 52" aria-hidden="true">
      <circle cx="26" cy="26" r={radius} className="ring-track" />
      <motion.circle
        cx="26"
        cy="26"
        r={radius}
        className="ring-value mini-value"
        stroke={colorFor(category)}
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ * (1 - pct) }}
        transition={{ type: "spring", stiffness: 40, damping: 14 }}
      />
    </svg>
  );
}

export function CountUp({ value }) {
  const target = Number(value) || 0;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 700);
      setShown(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return shown;
}

export function AqiRing({ aqi, category }) {
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, (Number(aqi) || 0) / 500));
  return (
    <svg className="ring" viewBox="0 0 140 140">
      <circle className="ring-track" cx="70" cy="70" r={radius} />
      <motion.circle
        className="ring-value"
        cx="70"
        cy="70"
        r={radius}
        stroke={colorFor(category)}
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ * (1 - pct) }}
        transition={{ type: "spring", stiffness: 46, damping: 18 }}
      />
      <text x="70" y="66" textAnchor="middle" fill="#e7f2ef" fontSize="28" fontFamily="Fraunces, serif">
        {aqi ?? "—"}
      </text>
      <text x="70" y="86" textAnchor="middle" fill="#93a8a4" fontSize="11">
        AQI
      </text>
    </svg>
  );
}

export const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 70, damping: 16 } },
};

export function freshness(iso) {
  if (!iso) return "Waiting for a live reading";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 2) return "Live · observed just now";
  if (minutes < 60) return `Live · observed ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `Live · observed ${hours} h ago`;
}
