import { motion } from 'framer-motion'

export default function LivingBackground() {
  return (
    <div className="living-bg" aria-hidden="true">
      <motion.div
        className="orb orb-a"
        animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="orb orb-b"
        animate={{ x: [0, -50, 30, 0], y: [0, 25, -15, 0] }}
        transition={{ duration: 34, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="grain" />
      <style>{`
        .living-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          background: radial-gradient(ellipse 120% 80% at 50% -20%, #0f2830 0%, #0a0f14 55%);
          pointer-events: none;
        }
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.35;
        }
        .orb-a {
          width: 420px;
          height: 420px;
          top: 10%;
          left: -5%;
          background: #0d9488;
        }
        .orb-b {
          width: 380px;
          height: 380px;
          bottom: 5%;
          right: -8%;
          background: #b45309;
          opacity: 0.22;
        }
        .grain {
          position: absolute;
          inset: 0;
          opacity: 0.04;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
      `}</style>
    </div>
  )
}
