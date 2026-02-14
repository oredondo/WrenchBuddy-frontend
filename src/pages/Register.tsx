import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/auth'

export default function Register() {
  const { register, error } = useAuth()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const navigate = useNavigate()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await register({
        email,
        username,
        password,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
      })
      navigate('/vehicles')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <div className="card">
        <h1>Crear cuenta</h1>
        <form onSubmit={onSubmit} className="form">
          <div className="grid2">
            <label>
              Nombre
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
            </label>
            <label>
              Apellidos
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
            </label>
          </div>

          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>

          <label>
            Usuario (username)
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
          </label>

          <label>
            Contraseña (mínimo 8)
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required minLength={8} />
          </label>

          {error ? <div className="error">{error}</div> : null}

          <button className="btn" disabled={busy}>
            {busy ? 'Creando…' : 'Crear cuenta'}
          </button>
        </form>
        <p className="muted">
          ¿Ya tienes cuenta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
