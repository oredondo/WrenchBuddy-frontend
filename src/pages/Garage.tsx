import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as wb from '../api/wrenchbuddy'
import type { ApiError } from '../api/client'

function errMsg(e: unknown) { return (e as ApiError)?.message || 'Error' }

function GarageCard({ item }: { item: wb.GarageListItem }) {
  return (
    <Link to={`/garage/${item.username}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          transition: 'border-color .2s, transform .15s, box-shadow .2s',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'var(--accent)'
          el.style.transform = 'translateY(-3px)'
          el.style.boxShadow = '0 8px 30px rgba(242,162,0,.12)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'var(--border)'
          el.style.transform = 'translateY(0)'
          el.style.boxShadow = 'none'
        }}
      >
        {/* Imagen con overlay */}
        <div style={{
          height: 200,
          background: item.preview_photo
            ? `url(${item.preview_photo.image}) center/cover`
            : 'var(--panel2)',
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-end',
        }}>
          {!item.preview_photo && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 52, opacity: 0.12 }}>🔧</span>
            </div>
          )}

          {/* Gradiente */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(7,9,13,.92) 0%, rgba(7,9,13,.3) 50%, transparent 100%)',
          }} />

          {/* Username + vehículos superpuestos */}
          <div style={{ position: 'relative', padding: '14px 16px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
              <span style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 22,
                letterSpacing: '1px',
                color: '#fff',
                lineHeight: 1,
              }}>
                {item.username}
              </span>
              <span style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                color: 'var(--accent)',
                background: 'rgba(242,162,0,.15)',
                border: '1px solid rgba(242,162,0,.3)',
                borderRadius: 4,
                padding: '3px 8px',
                flexShrink: 0,
              }}>
                {item.vehicle_count} {item.vehicle_count === 1 ? 'vehículo' : 'vehículos'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function Garage() {
  const [garages, setGarages] = useState<wb.GarageListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    wb.listGarages()
      .then(setGarages)
      .catch(e => setError(errMsg(e)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="stack">
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
        <h1 className="section-title" style={{ marginBottom: 6 }}>GARAJES</h1>
        <p style={{ margin: 0, color: 'var(--text2)', fontSize: 14 }}>
          Explora los garajes públicos de la comunidad WrenchBuddy
        </p>
      </div>

      {loading && <div className="card">Cargando garajes…</div>}
      {error && <div className="error">{error}</div>}

      {!loading && !error && garages.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--text2)' }}>
          <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.3 }}>🏍</div>
          <p style={{ fontSize: 15, margin: 0 }}>Aún no hay garajes públicos. ¡Sé el primero en hacer público tu vehículo!</p>
        </div>
      )}

      {!loading && !error && garages.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 16,
        }}>
          {garages.map(g => <GarageCard key={g.username} item={g} />)}
        </div>
      )}
    </div>
  )
}
