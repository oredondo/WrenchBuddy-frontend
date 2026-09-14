import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as wb from '../api/wrenchbuddy'
import type { ApiError } from '../api/client'

function errMsg(e: unknown) { return (e as ApiError)?.message || 'Error' }

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`
  if (days < 30) return `hace ${Math.floor(days / 7)} sem.`
  if (days < 365) return `hace ${Math.floor(days / 30)} meses`
  return `hace ${Math.floor(days / 365)} años`
}

function VehicleCard({ vehicle, index }: { vehicle: wb.FeedVehicle; index: number }) {
  const [imgError, setImgError] = useState(false)

  return (
    <Link
      to={`/garage/${vehicle.owner}`}
      style={{
        display: 'block',
        textDecoration: 'none',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        animation: `feedReveal .4s ease both`,
        animationDelay: `${index * 60}ms`,
        transition: 'transform .2s, box-shadow .2s, border-color .2s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = 'translateY(-3px)'
        el.style.boxShadow = '0 12px 40px rgba(0,0,0,.5), 0 0 0 1px var(--accent)'
        el.style.borderColor = 'var(--accent)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = ''
        el.style.boxShadow = ''
        el.style.borderColor = 'var(--border)'
      }}
    >
      {/* Foto */}
      <div style={{ position: 'relative', aspectRatio: '16/10', overflow: 'hidden', background: 'var(--panel2)' }}>
        {vehicle.preview_photo && !imgError ? (
          <img
            src={vehicle.preview_photo.image}
            alt={vehicle.preview_photo.caption || `${vehicle.brand} ${vehicle.model}`}
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform .35s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--panel2)',
          }}>
            <span style={{ fontSize: 48, opacity: 0.12 }}>🏍</span>
          </div>
        )}

        {/* Gradiente inferior */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(6,8,16,.92) 0%, rgba(6,8,16,.2) 55%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* Nombre del vehículo sobre la foto */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 14px 10px' }}>
          <div style={{
            fontFamily: "'Bebas Neue', cursive",
            fontSize: 24,
            letterSpacing: '1.5px',
            color: '#fff',
            lineHeight: 1,
            textShadow: '0 2px 12px rgba(0,0,0,.8)',
          }}>
            {vehicle.brand} {vehicle.model}
          </div>
          <div style={{
            fontSize: 11,
            color: 'rgba(255,255,255,.55)',
            marginTop: 2,
            fontFamily: "'Space Mono', monospace",
            letterSpacing: '.5px',
          }}>
            {vehicle.year}
          </div>
        </div>

        {/* Badge likes */}
        {vehicle.preview_photo && vehicle.preview_photo.likes_count > 0 && (
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: 'rgba(6,8,16,.75)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,.1)',
            borderRadius: 20,
            padding: '3px 10px',
            fontSize: 11,
            color: 'rgba(255,255,255,.8)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            ♥ {vehicle.preview_photo.likes_count}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div style={{ padding: '10px 14px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--accent-dim)', border: '1px solid var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            fontSize: 11, fontWeight: 700, color: 'var(--accent)',
            fontFamily: "'Space Mono', monospace",
          }}>
            {vehicle.owner[0].toUpperCase()}
          </div>
          <span style={{
            fontSize: 12, color: 'var(--text2)', fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            @{vehicle.owner}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <span className="data-num" style={{ fontSize: 12 }}>
            {vehicle.current_km.toLocaleString()} km
          </span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            {timeAgo(vehicle.created_at)}
          </span>
        </div>
      </div>
    </Link>
  )
}

function EmptyFeed() {
  return (
    <div style={{
      minHeight: 400,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 24, textAlign: 'center', padding: '40px 20px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Decoración de fondo */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(242,162,0,.04) 0%, transparent 70%)',
      }} />
      <div style={{
        position: 'absolute', top: '10%', left: '-5%', width: '110%', height: 1,
        background: 'linear-gradient(90deg, transparent, var(--border), transparent)',
        transform: 'rotate(-4deg)',
      }} />
      <div style={{
        position: 'absolute', bottom: '15%', left: '-5%', width: '110%', height: 1,
        background: 'linear-gradient(90deg, transparent, var(--border), transparent)',
        transform: 'rotate(3deg)',
      }} />

      <div style={{ position: 'relative' }}>
        <div style={{
          fontFamily: "'Bebas Neue', cursive",
          fontSize: 'clamp(56px, 10vw, 96px)',
          letterSpacing: '4px',
          lineHeight: 1,
          color: 'var(--text)',
          opacity: 0.08,
          userSelect: 'none',
        }}>
          FEED
        </div>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 52,
        }}>
          🏁
        </div>
      </div>

      <div style={{ position: 'relative', maxWidth: 360 }}>
        <p style={{
          fontFamily: "'Bebas Neue', cursive",
          fontSize: 22, letterSpacing: '1.5px',
          color: 'var(--text)', margin: '0 0 8px',
        }}>
          TU FEED ESTÁ VACÍO
        </p>
        <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 24px', lineHeight: 1.6 }}>
          Sigue a otros entusiastas para ver sus vehículos, modificaciones y mantenimientos aquí.
        </p>
        <Link to="/garage" className="btn">
          Explorar garajes
        </Link>
      </div>
    </div>
  )
}

export default function Feed() {
  const [vehicles, setVehicles] = useState<wb.FeedVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    wb.getFeed()
      .then(setVehicles)
      .catch(e => setError(errMsg(e)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="stack" style={{ maxWidth: 860 }}>
      <style>{`
        @keyframes feedReveal {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div>
          <h1 className="section-title" style={{ marginBottom: 2 }}>FEED</h1>
          <p className="muted" style={{ fontSize: 12, margin: 0 }}>
            Vehículos de los garajes que sigues
          </p>
        </div>
        <Link to="/garage" className="btn secondary" style={{ fontSize: 12 }}>
          Descubrir garajes
        </Link>
      </div>

      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              borderRadius: 'var(--radius)', overflow: 'hidden',
              background: 'var(--panel)', border: '1px solid var(--border)',
              animation: 'pulse 1.4s ease infinite',
              animationDelay: `${i * 200}ms`,
            }}>
              <div style={{ aspectRatio: '16/10', background: 'var(--panel2)' }} />
              <div style={{ padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ height: 12, width: '60%', background: 'var(--panel3)', borderRadius: 4 }} />
                <div style={{ height: 10, width: '40%', background: 'var(--panel2)', borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {!loading && !error && vehicles.length === 0 && <EmptyFeed />}

      {!loading && !error && vehicles.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {vehicles.map((v, i) => (
            <VehicleCard key={v.id} vehicle={v} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
