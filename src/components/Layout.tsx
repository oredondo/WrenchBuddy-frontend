import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../state/auth'

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">WrenchBuddy</Link>
        <nav className="nav">
          <NavLink to="/" end>Inicio</NavLink>
          {user ? (
            <>
              <NavLink to="/vehicles">Vehículos</NavLink>
              <button className="linklike" onClick={() => logout()}>Salir</button>
            </>
          ) : (
            <>
              <NavLink to="/login">Entrar</NavLink>
              <NavLink to="/register">Crear cuenta</NavLink>
            </>
          )}
        </nav>
      </header>

      <main className="content">
        <Outlet />
      </main>

      <footer className="footer">© {new Date().getFullYear()} WrenchBuddy</footer>
    </div>
  )
}
