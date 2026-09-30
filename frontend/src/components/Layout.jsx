import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import LivingBackground from './LivingBackground'
import { useAuth } from '../auth'

const nav = [
  { to: '/', label: 'Home' },
  { to: '/compare', label: 'Compare' },
  { to: '/sources', label: 'Sources' },
  { to: '/watchlist', label: 'Watchlist' },
]

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const { isLoggedIn, user, logout } = useAuth()

  return (
    <>
      <LivingBackground />
      <header className="site-header">
        <Link to="/" className="brand">
          <span className="brand-mark">◐</span> Aether
        </Link>
        <nav>
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={pathname === item.to ? 'active' : ''}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="auth-links">
          {isLoggedIn ? (
            <>
              <span className="user-email">{user?.email}</span>
              <button type="button" className="btn btn-ghost" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">Log in</Link>
              <Link to="/register" className="btn btn-primary">Register</Link>
            </>
          )}
        </div>
      </header>
      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        {children}
      </motion.main>
      <style>{`
        .site-header {
          position: sticky;
          top: 0;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 1rem 1.25rem;
          max-width: 1100px;
          margin: 0 auto;
          backdrop-filter: blur(12px);
          background: rgba(10, 15, 20, 0.72);
          border-bottom: 1px solid var(--border);
        }
        .brand {
          font-family: var(--font-display);
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--text);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .brand-mark { color: var(--teal); }
        nav {
          display: flex;
          gap: 1rem;
          flex: 1;
        }
        nav a {
          color: var(--muted);
          text-decoration: none;
          font-size: 0.95rem;
        }
        nav a.active, nav a:hover { color: var(--teal); }
        .auth-links {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .user-email {
          font-size: 0.8rem;
          color: var(--muted);
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .btn-ghost {
          background: transparent;
          padding: 0.5rem 0.85rem;
          font-size: 0.9rem;
        }
        @media (max-width: 720px) {
          .site-header { flex-wrap: wrap; }
          nav { order: 3; width: 100%; flex-wrap: wrap; }
          .user-email { display: none; }
        }
      `}</style>
    </>
  )
}
