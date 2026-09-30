import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from './api'

const AuthContext = createContext(null)

const STORAGE_KEY = 'aether_token'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY))
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (!token) {
      setUser(null)
      return
    }
    api.me(token)
      .then(setUser)
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY)
        setToken(null)
      })
  }, [token])

  const value = useMemo(
    () => ({
      token,
      user,
      isLoggedIn: Boolean(token && user),
      login: async (email, password) => {
        const { access_token } = await api.login(email, password)
        localStorage.setItem(STORAGE_KEY, access_token)
        setToken(access_token)
      },
      register: async (email, password) => {
        const { access_token } = await api.register(email, password)
        localStorage.setItem(STORAGE_KEY, access_token)
        setToken(access_token)
      },
      logout: () => {
        localStorage.removeItem(STORAGE_KEY)
        setToken(null)
        setUser(null)
      },
    }),
    [token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
