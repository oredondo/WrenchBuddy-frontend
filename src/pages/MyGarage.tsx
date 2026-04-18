import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as wb from '../api/wrenchbuddy'
import { useAuth } from '../state/auth'
import type { ApiError } from '../api/client'

function errMsg(e: unknown) { return (e as ApiError)?.message || 'Error' }

// ─── Modal edición de perfil ──────────────────────────────────────────────────

function EditProfileModal({ user, onClose, onSaved }: {
  user: wb.User
  onClose: () => void
  onSaved: (u: wb.User) => void
}) {
  const [displayName, setDisplayName] = useState(user.display_name)
  const [bio, setBio] = useState(user.bio)
  const [location, setLocation] = useState(user.location)
  const [avatar, setAvatar] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(user.avatar)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null
    setAvatar(f)
    setPreview(f ? URL.createObjectURL(f) : user.avatar)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      const updated = await wb.updateProfile({ display_name: displayName, bio, location, avatar: avatar || undefined })
      onSaved(updated)
    } catch (e2) { setError(errMsg(e2)) } finally { setBusy(false) }
  }

  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={e => e.stopPropagation()}>
        <div className="row">
          <h2>Editar perfil</h2>
          <button className="linklike" onClick={onClose}>Cerrar</button>
        </div>
        <form className="form" onSubmit={onSubmit}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
                background: preview ? `url(${preview}) center/cover` : 'var(--panel2)',
                border: '2px solid var(--border)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {!preview && <span style={{ fontSize: 28, opacity: 0.3 }}>👤</span>}
            </div>
            <div>
              <button type="button" className="btn secondary" style={{ fontSize: 12 }}
                onClick={() => fileRef.current?.click()}>Cambiar foto</button>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--muted)' }}>PNG, JPG o WebP</p>
            </div>
            <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.webp" style={{ display: 'none' }} onChange={onFileChange} />
          </div>
          <label>Nombre visible (opcional)
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="ej: Óscar Redondo" maxLength={100} />
          </label>
          <label>Ubicación (opcional)
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              placeholder="Ej: Madrid, Barcelona…" maxLength={100} />
          </label>
          <label>Bio (opcional)
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
              placeholder="Cuéntanos algo sobre ti y tu garaje…" />
          </label>
          {error && <div className="error">{error}</div>}
          <button className="btn" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
        </form>
      </div>
    </div>
  )
}

// ─── Crear vehículo ───────────────────────────────────────────────────────────

function VehicleCreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [vehicleType, setVehicleType] = useState<'motorcycle' | 'car'>('motorcycle')
  const [brand, setBrand]             = useState('')
  const [model, setModel]             = useState('')
  const [year, setYear]               = useState<number>(new Date().getFullYear())
  const [currentKm, setCurrentKm]     = useState<number>(0)
  const [displacement, setDisplacement] = useState<number | ''>('')
  const [usageType, setUsageType]     = useState<'city' | 'mixed' | 'highway'>('mixed')
  const [notes, setNotes]             = useState('')
  const [busy, setBusy]               = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const canSubmit = useMemo(() => brand.trim() && model.trim() && year > 1900, [brand, model, year])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null); setBusy(true)
    try {
      await wb.createVehicle({
        vehicle_type: vehicleType, brand, model, year,
        current_km: currentKm,
        displacement: displacement === '' ? null : displacement,
        usage_type: usageType,
        notes: notes || undefined,
        is_public: false,
      })
      await onCreated()
    } catch (e2) { setError(errMsg(e2)) } finally { setBusy(false) }
  }

  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={e => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 18 }}>
          <h2>Añadir vehículo</h2>
          <button className="linklike" onClick={onClose}>Cerrar</button>
        </div>
        <form className="form" onSubmit={onSubmit}>
          <div className="grid2">
            <label>Tipo
              <select value={vehicleType} onChange={e => setVehicleType(e.target.value as 'motorcycle' | 'car')}>
                <option value="motorcycle">🏍️ Motocicleta</option>
                <option value="car">🚗 Coche</option>
              </select>
            </label>
            <label>Uso habitual
              <select value={usageType} onChange={e => setUsageType(e.target.value as 'city' | 'mixed' | 'highway')}>
                <option value="city">Ciudad</option>
                <option value="mixed">Mixto</option>
                <option value="highway">Carretera</option>
              </select>
            </label>
          </div>
          <div className="grid2">
            <label>Marca
              <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Honda, Yamaha…" required />
            </label>
            <label>Modelo
              <input value={model} onChange={e => setModel(e.target.value)} placeholder="CBR, MT-07…" required />
            </label>
          </div>
          <div className="grid2">
            <label>Año
              <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} min={1900} required />
            </label>
            <label>Km actuales
              <input type="number" value={currentKm} onChange={e => setCurrentKm(Number(e.target.value))} min={0} required />
            </label>
          </div>
          <label>Cilindrada (cc) — opcional
            <input type="number" value={displacement}
              onChange={e => setDisplacement(e.target.value ? Number(e.target.value) : '')} min={0} placeholder="650" />
          </label>
          <label>Notas
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Modificaciones, estado general…" />
          </label>
          {error && <div className="error">{error}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn secondary" onClick={onClose}>Cancelar</button>
            <button className="btn" disabled={!canSubmit || busy}>{busy ? 'Guardando…' : 'Añadir vehículo'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Tarjeta de vehículo propio ───────────────────────────────────────────────

function OwnVehicleCard({ vehicle }: { vehicle: wb.VehicleListItem }) {
  const typeIcon = vehicle.vehicle_type === 'motorcycle' ? '🏍️' : '🚗'

  return (
    <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 18 }}>{typeIcon}</span>
          <h3 style={{ margin: 0, fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: .5, lineHeight: 1 }}>
            {vehicle.brand} {vehicle.model}
          </h3>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: 'var(--accent)' }}>{vehicle.year}</span>
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>·</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: 'var(--text2)' }}>
            {vehicle.current_km.toLocaleString('es-ES')} km
          </span>
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 4,
            background: vehicle.is_public ? 'rgba(46,204,113,.1)' : 'var(--panel2)',
            color: vehicle.is_public ? 'var(--success)' : 'var(--muted)',
            border: `1px solid ${vehicle.is_public ? 'rgba(46,204,113,.3)' : 'var(--border)'}`,
          }}>
            {vehicle.is_public ? '🌐 Público' : '🔒 Privado'}
          </span>
        </div>
      </div>
      <Link to={`/vehicles/${vehicle.id}`} className="btn secondary" style={{ fontSize: 12, flexShrink: 0 }}>
        Gestionar →
      </Link>
    </div>
  )
}

// ─── Página Mi Garaje ─────────────────────────────────────────────────────────

export default function MyGarage() {
  const { username } = useParams<{ username: string }>()
  const { user, setUser } = useAuth()
  const navigate = useNavigate()

  const [vehicles, setVehicles] = useState<wb.VehicleListItem[]>([])
  const [followers, setFollowers] = useState<string[]>([])
  const [following, setFollowing] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)

  // Redirigir si intentan acceder al garaje de otro usuario
  useEffect(() => {
    if (user && username && user.username !== username) {
      navigate(`/garage/${username}`, { replace: true })
    }
  }, [user, username])

  async function loadVehicles() {
    try { setVehicles(await wb.listVehicles()) } catch { /* ignore */ }
  }

  async function load() {
    if (!username) return
    try {
      const [frs, fng] = await Promise.all([
        wb.getFollowers(username),
        wb.getFollowing(username),
      ])
      setFollowers(frs)
      setFollowing(fng)
      await loadVehicles()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) load()
  }, [user, username])

  function handleProfileSaved(updated: wb.User) {
    setUser(updated)
    setEditingProfile(false)
  }

  if (loading) return <div className="card">Cargando…</div>
  if (!user) return null

  const displayName = user.display_name || username

  return (
    <div className="stack">
      {/* Header */}
      <div style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderTop: '3px solid var(--accent)',
        borderRadius: 'var(--radius)',
        padding: '24px 28px',
      }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', flexShrink: 0,
            background: user.avatar ? `url(${user.avatar}) center/cover` : 'var(--panel2)',
            border: '2px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {!user.avatar && <span style={{ fontSize: 32, opacity: 0.25 }}>👤</span>}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, margin: '0 0 2px', letterSpacing: 1, lineHeight: 1 }}>
                  {displayName}
                </h1>
                {user.display_name && (
                  <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--muted)' }}>@{username}</p>
                )}
                {user.location && (
                  <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--text2)' }}>📍 {user.location}</p>
                )}
                {user.bio && (
                  <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text2)', lineHeight: 1.5, maxWidth: 480 }}>
                    {user.bio}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {[
                    { val: vehicles.length, label: 'vehículos' },
                    { val: followers.length, label: 'seguidores' },
                    { val: following.length, label: 'siguiendo' },
                  ].map(({ val, label }) => (
                    <span key={label} style={{ fontSize: 13, color: 'var(--text2)' }}>
                      <strong style={{ color: 'var(--text)', fontFamily: "'Space Mono', monospace" }}>{val}</strong> {label}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                <button className="btn secondary" style={{ fontSize: 12 }} onClick={() => setEditingProfile(true)}>
                  Editar perfil
                </button>
                <Link to={`/garage/${username}`} className="btn secondary" style={{ fontSize: 12 }}>
                  Ver como público →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vehículos */}
      <div className="stack">
        <div className="row">
          <h2 className="section-title" style={{ margin: 0 }}>MIS VEHÍCULOS</h2>
          <button className="btn" style={{ fontSize: 13 }} onClick={() => setShowAddVehicle(true)}>
            + Añadir vehículo
          </button>
        </div>

        {vehicles.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <p style={{ fontSize: 36, margin: '0 0 12px' }}>🏍️</p>
            <h3 style={{ marginBottom: 8, color: 'var(--text)' }}>Sin vehículos aún</h3>
            <p style={{ color: 'var(--muted)', marginBottom: 20 }}>
              Añade tu moto y la IA generará su catálogo de mantenimiento.
            </p>
            <button className="btn" onClick={() => setShowAddVehicle(true)}>Añadir mi primer vehículo</button>
          </div>
        ) : (
          <div className="stack">
            {vehicles.map(v => <OwnVehicleCard key={v.id} vehicle={v} />)}
          </div>
        )}
      </div>

      {editingProfile && (
        <EditProfileModal
          user={user}
          onClose={() => setEditingProfile(false)}
          onSaved={handleProfileSaved}
        />
      )}

      {showAddVehicle && (
        <VehicleCreateDialog
          onClose={() => setShowAddVehicle(false)}
          onCreated={async () => { setShowAddVehicle(false); await loadVehicles() }}
        />
      )}
    </div>
  )
}
