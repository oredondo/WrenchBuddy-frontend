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

          <span className="nav-sep" />
          <NavLink to="/garage">Garajes</NavLink>

          {user ? (
            <>
              <span className="nav-sep" />
              <NavLink to={`/migaraje/${user.username}`}>Mi garaje</NavLink>
              <NavLink to="/feed">Feed</NavLink>
              <NavLink to="/profile">Perfil</NavLink>
              <span className="nav-sep" />
              <button
                onClick={() => logout()}
                style={{
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  padding: '6px 13px', borderRadius: 'var(--radius-sm)',
                  fontSize: 13, fontWeight: 600, fontFamily: "'Manrope', sans-serif",
                  color: 'var(--text2)', letterSpacing: '.3px',
                  transition: 'color .14s, background .14s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'rgba(255,255,255,.05)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.background = 'transparent' }}
              >Salir</button>
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
