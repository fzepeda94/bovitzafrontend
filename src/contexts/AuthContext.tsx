import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react'
import { api, getStoredAuth, storeAuth } from '../lib/api'
import type { AuthResponse } from '../types'

interface AuthContextValue {
  session: AuthResponse | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthResponse | null>(() => getStoredAuth())
  const value = useMemo<AuthContextValue>(() => ({
    session,
    login: async (email, password) => {
      const auth = await api<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password, tenantId: null }) })
      storeAuth(auth); setSession(auth)
    },
    logout: async () => {
      if (session) await api<void>('/auth/revoke', { method: 'POST', body: JSON.stringify({ refreshToken: session.refreshToken }) }).catch(() => undefined)
      storeAuth(null); setSession(null)
    }
  }), [session])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth debe utilizarse dentro de AuthProvider')
  return value
}

