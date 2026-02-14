import { Link } from 'react-router-dom'
import { useAuth } from '../state/auth'

export default function Home() {
  const { user, loading } = useAuth()

  return (
    <div className="stack">
      <div className="card">
        <h1>WrenchBuddy</h1>
        <p>
          Frontend React conectado a tu backend Django REST.
        </p>
        <ul>
          <li>Usuarios: <code>/api/users/</code> (registro) y <code>/api/users/me/</code></li>
          <li>Vehículos: <code>/api/vehicles/</code></li>
          <li>Mantenimiento: <code>/api/maintenance/...</code></li>
        </ul>
        {loading ? (
          <p>Cargando sesión...</p>
        ) : user ? (
          <p>
            Hola, <b>{user.email}</b>. Ir a <Link to="/vehicles">Vehículos</Link>.
          </p>
        ) : (
          <p>
            Para empezar: <Link to="/register">crea cuenta</Link> o <Link to="/login">entra</Link>.
          </p>
        )}
      </div>

      <div className="card">
        <h2>Nota sobre el login</h2>
        <p>
          Este frontend usa autenticación por <b>sesión de Django</b>. Para que funcione el login, el backend
          debe exponer <code>/api-auth/login/</code> y <code>/api-auth/logout/</code> (ver README del frontend).
        </p>
      </div>
    </div>
  )
}
