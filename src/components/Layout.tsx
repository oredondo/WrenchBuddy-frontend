import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../state/auth'

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-icon">🔧</span>
          WRENCHBUDDY
        </Link>

        <nav className="nav">
          <NavLink to="/" end>Inicio</NavLink>

          {user ? (
            <>
              <span className="nav-sep" />
              <NavLink to="/vehicles">Vehículos</NavLink>
              <span className="nav-sep" />
              <button className="linklike" onClick={() => logout()}>Salir</button>
            </>
          ) : (
            <>
              <span className="nav-sep" />
              <NavLink to="/login">Entrar</NavLink>
              <NavLink to="/register">Crear cuenta</NavLink>
            </>
          )}
        </nav>
      </header>

      <main className="content">
        <Outlet />
      </main>

      <footer className="footer">
        © {new Date().getFullYear()} WrenchBuddy — Tu garaje, documentado
      </footer>
    </div>
  )
}
