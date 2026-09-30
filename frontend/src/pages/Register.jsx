import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../auth'

export default function Register() {
  const { register } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await register(email, password)
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
        <h1>Create account</h1>
        {error && <p className="err">{error}</p>}
        <label>
          Email
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password (min 8 chars)
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        </label>
        <button type="submit" className="btn btn-primary">Register</button>
        <p className="switch">
          Have an account? <Link to="/login">Log in</Link>
        </p>
      </motion.form>
      <style>{`
        .auth-page { display: flex; justify-content: center; padding-top: 2rem; }
        .auth-card { width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 0.75rem; }
        .auth-card h1 { margin: 0; }
        label { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.9rem; color: var(--muted); }
        .err { color: #f87171; margin: 0; }
        .switch { font-size: 0.9rem; color: var(--muted); }
      `}</style>
    </div>
  )
}
