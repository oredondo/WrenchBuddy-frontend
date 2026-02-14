import { FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/auth'

export default function Login() {
  const { login, error } = useAuth()
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const navigate = useNavigate()
  const location = useLocation() as any
  const next = location?.state?.from?.pathname || '/vehicles'

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await login(emailOrUsername, password)
      navigate(next, { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <div className="card">
        <h1>Entrar</h1>
        <form onSubmit={onSubmit} className="form">
          <label>
            Email o usuario
            <input
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error ? <div className="error">{error}</div> : null}

          <button className="btn" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <p className="muted">
          ¿No tienes cuenta? <Link to="/register">Crear cuenta</Link>
        </p>
      </div>

      <div className="card">
        <h2>Si el login falla…</h2>
        <p className="muted">
          Asegúrate de haber añadido <code>api-auth/</code> en el backend o ajusta el endpoint de login.
        </p>
      </div>
    </div>
  )
}
