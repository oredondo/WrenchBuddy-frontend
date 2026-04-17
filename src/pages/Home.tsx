import { Link } from 'react-router-dom'
import { useAuth } from '../state/auth'
import logo from '../assets/wrenchbuddy-logo.png'

const FEATURES = [
  {
    icon: '🔧',
    label: 'Historial completo',
    desc: 'Registra cada intervención con fecha, kilómetros, coste y adjuntos.',
  },
  {
    icon: '🤖',
    label: 'IA personalizada',
    desc: 'Recibe recomendaciones priorizadas según tu historial y modelo de vehículo.',
  },
  {
    icon: '📋',
    label: 'Catálogo inteligente',
    desc: 'Tareas de mantenimiento generadas por IA y adaptadas a tu vehículo concreto.',
  },
  {
    icon: '📎',
    label: 'Facturas y fotos',
    desc: 'Adjunta documentos del taller. La IA extrae los datos automáticamente.',
  },
]

export default function Home() {
  const { user, loading } = useAuth()

  return (
    <div className="stack" style={{ maxWidth: 820, margin: '0 auto' }}>

      {/* ── Hero ── */}
      <div className="home-hero">
        <img src={logo} alt="WrenchBuddy" className="home-logo" style={{ marginBottom: 20 }} />

        <h1 style={{ fontSize: 72, letterSpacing: 5, marginBottom: 14 }}>
          WRENCHBUDDY
        </h1>

        <p className="home-tagline">
          Tu moto, cada kilómetro documentado.
          <br />
          Mantenimiento inteligente con IA.
        </p>

        {loading ? (
          <p className="muted">Cargando sesión…</p>
        ) : user ? (
          <div className="home-ctas">
            <Link to="/vehicles" className="btn">
              Mis vehículos →
            </Link>
          </div>
        ) : (
          <div className="home-ctas">
            <Link to="/register" className="btn">Empezar gratis</Link>
            <Link to="/login" className="btn secondary">Ya tengo cuenta</Link>
          </div>
        )}
      </div>

      {/* ── Features ── */}
      <div className="home-features">
        {FEATURES.map(f => (
          <div className="feature-card" key={f.label}>
            <span className="feature-icon">{f.icon}</span>
            <div>
              <div className="feature-label">{f.label}</div>
              <p className="feature-desc">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer note ── */}
      {!user && !loading && (
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, paddingBottom: 8 }}>
          Gratis durante el MVP · Solo motos por ahora · Datos privados
        </p>
      )}
    </div>
  )
}
