import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../auth'

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('analyst@aether.dev')
  const [password, setPassword] = useState('Analyst@123')
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      nav('/')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="page auth-page">
      <motion.form
        className="card auth-card"
        onSubmit={submit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1>Welcome back</h1>
        <p className="demo">Demo: analyst@aether.dev / Analyst@123</p>
        {error && <p className="err">{error}</p>}
        <label>
          Email
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" className="btn btn-primary">Log in</button>
        <p className="switch">
          No account? <Link to="/register">Register</Link>
        </p>
      </motion.form>
      <style>{`
        .auth-page { display: flex; justify-content: center; padding-top: 2rem; }
        .auth-card { width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 0.75rem; }
        .auth-card h1 { margin: 0; }
        label { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.9rem; color: var(--muted); }
        .demo { font-size: 0.85rem; color: var(--teal); margin: 0; }
        .err { color: #f87171; margin: 0; }
        .switch { font-size: 0.9rem; color: var(--muted); }
      `}</style>
    </div>
  )
}
