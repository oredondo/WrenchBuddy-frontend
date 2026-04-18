import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as wb from '../api/wrenchbuddy'
import type { ApiError } from '../api/client'

type AuthState = {
  user: wb.User | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  setUser: (u: wb.User) => void
  login: (emailOrUsername: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (data: {
    email: string
    username: string
    password: string
    first_name?: string
    last_name?: string
  }) => Promise<'logged_in' | 'created'>
}

const Ctx = createContext<AuthState | null>(null)

function humanizeError(e: unknown): string {
  const err = e as ApiError
  if (err?.message) return err.message
  return 'Error inesperado'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<wb.User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const u = await wb.me()
      setUser(u)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      await refresh()
      setLoading(false)
    })()
  }, [refresh])

  const login = useCallback(async (emailOrUsername: string, password: string) => {
    setError(null)
    try {
      await wb.login(emailOrUsername, password)
      await refresh()
    } catch (e) {
      setError(humanizeError(e))
      throw e
    }
  }, [refresh])

  const logout = useCallback(async () => {
    setError(null)
    try {
      await wb.logout()
    } finally {
      setUser(null)
    }
  }, [])

  const register = useCallback(async (data: {
    email: string
    username: string
    password: string
    first_name?: string
    last_name?: string
  }): Promise<'logged_in' | 'created'> => {
    setError(null)
    try {
      await wb.registerUser(data)
    } catch (e) {
      setError(humanizeError(e))
      throw e
    }
    // cuenta creada — intentamos auto-login (no lanzamos si falla)
    try {
      await wb.login(data.email, data.password)
      await refresh()
      return 'logged_in'
    } catch {
      return 'created'
    }
  }, [refresh])

  const value = useMemo<AuthState>(() => ({
    user,
    loading,
    error,
    refresh,
    setUser,
    login,
    logout,
    register,
  }), [user, loading, error, refresh, setUser, login, logout, register])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
