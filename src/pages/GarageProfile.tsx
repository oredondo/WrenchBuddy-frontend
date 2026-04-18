import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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
    setBusy(true)
    setError(null)
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
          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
                background: preview ? `url(${preview}) center/cover` : 'var(--panel2)',
                border: '2px solid var(--border)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {!preview && <span style={{ fontSize: 28, opacity: 0.3 }}>👤</span>}
            </div>
            <div>
              <button type="button" className="btn secondary" style={{ fontSize: 12 }}
                onClick={() => fileRef.current?.click()}>
                Cambiar foto
              </button>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--muted)' }}>PNG, JPG o WebP</p>
            </div>
            <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.webp" style={{ display: 'none' }} onChange={onFileChange} />
          </div>

          <label>
            Nombre visible (opcional)
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="ej: Óscar Redondo" maxLength={100} />
          </label>

          <label>
            Ubicación (opcional)
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Ej: Madrid, Barcelona, Sevilla…"
              maxLength={100}
            />
          </label>

          <label>
            Bio (opcional)
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Cuéntanos algo sobre ti y tu garaje…" />
          </label>

          {error && <div className="error">{error}</div>}
          <button className="btn" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
        </form>
      </div>
    </div>
  )
}

// ─── Historial resumido ───────────────────────────────────────────────────────

function MaintenanceHistory({ events, showSpending }: { events: wb.PublicMaintenanceEvent[]; showSpending: boolean }) {
  const [expanded, setExpanded] = useState(false)

  if (events.length === 0) return null

  const lastDate = new Date(events[0].date).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
  const totalCost = events.reduce((s, e) => s + (e.cost ? parseFloat(e.cost) : 0), 0)
  const visible = expanded ? events : events.slice(0, 3)

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
      {/* Cabecera resumen */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--muted)' }}>
            Historial
          </span>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>
            <strong style={{ color: 'var(--text)' }}>{events.length}</strong> servicios
          </span>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>
            último <strong style={{ color: 'var(--text)' }}>{lastDate}</strong>
          </span>
          {showSpending && totalCost > 0 && (
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: 'var(--accent)' }}>
              {totalCost.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € documentados
            </span>
          )}
        </div>
        {events.length > 3 && (
          <button
            className="linklike"
            onClick={() => setExpanded(o => !o)}
            style={{ fontSize: 12, color: 'var(--text2)', flexShrink: 0 }}
          >
            {expanded ? 'Ver menos ↑' : `Ver todos (${events.length}) ↓`}
          </button>
        )}
      </div>

      {/* Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {visible.map((ev, i) => (
          <div key={ev.id} style={{ display: 'flex', gap: 12, position: 'relative' }}>
            {/* Línea vertical */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16, flexShrink: 0 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 6,
                background: i === 0 ? 'var(--accent)' : 'var(--borderB)',
                border: `2px solid ${i === 0 ? 'var(--accent)' : 'var(--border)'}`,
              }} />
              {i < visible.length - 1 && (
                <div style={{ width: 1, flex: 1, minHeight: 12, background: 'var(--border)', marginTop: 2 }} />
              )}
            </div>

            {/* Contenido */}
            <div style={{ paddingBottom: 14, flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize' }}>
                  {ev.task_code.replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text2)' }}>
                  {new Date(ev.date).toLocaleDateString('es-ES')}
                </span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--muted)' }}>
                  {ev.km_at_service.toLocaleString()} km
                </span>
                {showSpending && ev.cost && (
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--accent)' }}>
                    {parseFloat(ev.cost).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </span>
                )}
              </div>
              {ev.notes && (
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>
                  {ev.notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Fotos ────────────────────────────────────────────────────────────────────

function PhotoCard({ photo }: { photo: wb.PublicGaragePhoto }) {
  const { user } = useAuth()
  const [likes, setLikes] = useState(photo.likes_count)
  const [liked, setLiked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<wb.GaragePhotoComment[]>([])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  async function toggleLike() {
    if (!user || busy) return
    setBusy(true)
    try {
      const r = liked ? await wb.unlikePhoto(photo.id) : await wb.likePhoto(photo.id)
      setLikes(r.likes); setLiked(l => !l)
    } catch { /* ignore */ } finally { setBusy(false) }
  }

  async function loadComments() {
    setComments(await wb.listPhotoComments(photo.id))
  }

  useEffect(() => { if (showComments) loadComments() }, [showComments])

  async function submitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setSending(true)
    try { await wb.createPhotoComment(photo.id, body.trim()); setBody(''); await loadComments() }
    catch { /* ignore */ } finally { setSending(false) }
  }

  return (
    <div style={{ background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 10px 10px' }}>
        {photo.caption && <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{photo.caption}</p>}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="linklike" onClick={toggleLike} disabled={!user || busy}
            style={{ fontSize: 12, color: liked ? 'var(--accent)' : 'var(--text2)' }}>
            {liked ? '♥' : '♡'} {likes}
          </button>
          <button className="linklike" onClick={() => setShowComments(o => !o)}
            style={{ fontSize: 12, color: 'var(--text2)' }}>
            💬 {comments.length > 0 ? comments.length : ''}
          </button>
        </div>
        {showComments && (
          <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            {comments.map(c => (
              <div key={c.id} style={{ fontSize: 12, marginBottom: 4, lineHeight: 1.4 }}>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{c.username} </span>
                <span style={{ color: 'var(--text)' }}>{c.body}</span>
              </div>
            ))}
            {user && (
              <form onSubmit={submitComment} style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <input value={body} onChange={e => setBody(e.target.value)} placeholder="Comentar…" style={{ flex: 1, fontSize: 12 }} />
                <button className="btn" type="submit" disabled={sending || !body.trim()} style={{ padding: '0 10px', fontSize: 11 }}>
                  {sending ? '…' : 'OK'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function AccessoriesSection({ accessories, showSpending }: { accessories: wb.PublicAccessory[]; showSpending: boolean }) {
  if (accessories.length === 0) return null
  const totalCost = accessories.reduce((s, a) => s + (a.price ? parseFloat(a.price) : 0), 0)

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--muted)' }}>
            Accesorios
          </span>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>
            <strong style={{ color: 'var(--text)' }}>{accessories.length}</strong> instalados
          </span>
          {showSpending && totalCost > 0 && (
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: 'var(--accent)' }}>
              {totalCost.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € en mods
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {accessories.map(a => (
          <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{a.name}</span>
              {a.notes && (
                <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>{a.notes}</span>
              )}
            </div>
            {showSpending && a.price && (
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: 'var(--accent)', flexShrink: 0 }}>
                {parseFloat(a.price).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function PhotoGallery({ photos }: { photos: wb.PublicGaragePhoto[] }) {
  const [selected, setSelected] = useState(0)
  if (photos.length === 0) return null

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
      <p style={{ margin: '0 0 10px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--muted)' }}>
        Fotos · {photos.length}
      </p>
      {/* Hero */}
      <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: 8 }}>
        <img
          src={photos[selected].image}
          alt={photos[selected].caption || 'Foto'}
          style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
        />
      </div>
      {/* Miniaturas */}
      {photos.length > 1 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 10 }}>
          {photos.map((p, i) => (
            <img
              key={p.id}
              src={p.image}
              alt={p.caption || ''}
              onClick={() => setSelected(i)}
              style={{
                width: 64, height: 48, objectFit: 'cover', borderRadius: 4, flexShrink: 0,
                cursor: 'pointer', opacity: i === selected ? 1 : 0.5,
                border: i === selected ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'opacity .15s, border-color .15s',
              }}
            />
          ))}
        </div>
      )}
      {/* Interacciones de la foto seleccionada (sin imagen) */}
      <PhotoCard photo={photos[selected]} />
    </div>
  )
}

// ─── Comentarios de vehículo ──────────────────────────────────────────────────

function VehicleComments({ vehicleId }: { vehicleId: number }) {
  const { user } = useAuth()
  const [comments, setComments] = useState<wb.VehicleComment[]>([])
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() { setComments(await wb.listVehicleComments(vehicleId)) }
  useEffect(() => { if (open) load() }, [open])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setBusy(true)
    try { await wb.createVehicleComment(vehicleId, body.trim()); setBody(''); await load() }
    catch { /* ignore */ } finally { setBusy(false) }
  }

  async function remove(id: number) {
    if (!confirm('¿Eliminar comentario?')) return
    await wb.deleteVehicleComment(id)
    setComments(c => c.filter(x => x.id !== id))
  }

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
      <button className="linklike" onClick={() => setOpen(o => !o)}
        style={{ fontSize: 13, color: 'var(--text2)' }}>
        💬 {open ? 'Ocultar comentarios' : `Comentarios${comments.length > 0 ? ` (${comments.length})` : ''}`}
      </button>
      {open && (
        <div style={{ marginTop: 12 }}>
          {comments.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 10px' }}>Sin comentarios aún</p>}
          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ flex: 1, fontSize: 13, lineHeight: 1.4 }}>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{c.username} </span>
                <span style={{ color: 'var(--text)' }}>{c.body}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6 }}>
                  {new Date(c.created_at).toLocaleDateString('es-ES')}
                </span>
              </div>
              {user?.username === c.username && (
                <button className="linklike" style={{ color: 'var(--danger)', fontSize: 12 }} onClick={() => remove(c.id)}>✕</button>
              )}
            </div>
          ))}
          {user && (
            <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input value={body} onChange={e => setBody(e.target.value)} placeholder="Escribe un comentario…"
                style={{ flex: 1, fontSize: 13 }} maxLength={500} />
              <button className="btn" type="submit" disabled={busy || !body.trim()} style={{ padding: '0 16px', fontSize: 12 }}>
                {busy ? '…' : 'Enviar'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Tarjeta de vehículo público ──────────────────────────────────────────────

function PublicVehicleCard({ vehicle, onLike, showSpending }: {
  vehicle: wb.PublicVehicle
  onLike: (id: number, delta: number) => void
  showSpending: boolean
}) {
  const { user } = useAuth()
  const [liked, setLiked] = useState(false)
  const [busy, setBusy] = useState(false)
  const usageLabel = { city: 'Ciudad', mixed: 'Mixto', highway: 'Carretera' }[vehicle.usage_type] ?? vehicle.usage_type

  async function toggleLike() {
    if (!user || busy) return
    setBusy(true)
    try {
      if (liked) { await wb.unlikeVehicle(vehicle.id); setLiked(false); onLike(vehicle.id, -1) }
      else { await wb.likeVehicle(vehicle.id); setLiked(true); onLike(vehicle.id, 1) }
    } catch { /* ignore */ } finally { setBusy(false) }
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: '0 0 6px', fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: .5, lineHeight: 1 }}>
            {vehicle.brand} {vehicle.model}
          </h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: 'var(--accent)' }}>{vehicle.year}</span>
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>·</span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: 'var(--text2)' }}>
              {vehicle.current_km.toLocaleString()} km
            </span>
            {vehicle.displacement && (
              <>
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>·</span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: 'var(--text2)' }}>
                  {vehicle.displacement} cc
                </span>
              </>
            )}
            <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--panel2)', padding: '2px 6px', borderRadius: 4 }}>
              {usageLabel}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
          <button
            className="linklike"
            onClick={toggleLike}
            disabled={!user || busy}
            style={{ fontSize: 14, color: liked ? 'var(--accent)' : 'var(--text2)' }}
            title={user ? undefined : 'Inicia sesión para dar like'}
          >
            {liked ? '♥' : '♡'} {vehicle.likes_count}
          </button>
        </div>
      </div>

      {vehicle.notes && (
        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{vehicle.notes}</p>
      )}

      {/* Fotos con hero + miniaturas */}
      <PhotoGallery photos={vehicle.garage_photos} />

      {/* Historial resumido */}
      <MaintenanceHistory events={vehicle.maintenance_events} showSpending={showSpending} />

      <AccessoriesSection accessories={vehicle.accessories} showSpending={showSpending} />

      {/* Comentarios */}
      <VehicleComments vehicleId={vehicle.id} />
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function GarageProfile() {
  const { username } = useParams<{ username: string }>()
  const { user } = useAuth()

  const [profile, setProfile] = useState<wb.PublicProfile | null>(null)
  const [followers, setFollowers] = useState<string[]>([])
  const [following, setFollowing] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [followBusy, setFollowBusy] = useState(false)
  const [vehicles, setVehicles] = useState<wb.PublicVehicle[]>([])

  const isFollowing = user ? followers.includes(user.username) : false
  const isOwnGarage = user?.username === username

  async function load() {
    if (!username) return
    try {
      const [g, frs, fng] = await Promise.all([
        wb.getGarageProfile(username),
        wb.getFollowers(username),
        wb.getFollowing(username),
      ])
      setProfile(g.profile)
      setVehicles(g.vehicles)
      setFollowers(frs)
      setFollowing(fng)
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [username])

  async function toggleFollow() {
    if (!username || followBusy) return
    setFollowBusy(true)
    try {
      if (isFollowing) {
        await wb.unfollowUser(username)
        setFollowers(f => f.filter(u => u !== user!.username))
      } else {
        await wb.followUser(username)
        setFollowers(f => [...f, user!.username])
      }
    } catch { /* ignore */ } finally { setFollowBusy(false) }
  }

  function handleLike(vehicleId: number, delta: number) {
    setVehicles(vs => vs.map(v => v.id === vehicleId ? { ...v, likes_count: v.likes_count + delta } : v))
  }

  if (loading) return <div className="card">Cargando garaje…</div>
  if (error) return <div className="error">{error}</div>
  if (!profile) return null

  const totalServices = vehicles.reduce((s, v) => s + v.maintenance_events.length, 0)
  const displayName = profile.display_name || username

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
            background: profile.avatar ? `url(${profile.avatar}) center/cover` : 'var(--panel2)',
            border: '2px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {!profile.avatar && <span style={{ fontSize: 32, opacity: 0.25 }}>👤</span>}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, margin: '0 0 2px', letterSpacing: 1, lineHeight: 1 }}>
                  {displayName}
                </h1>
                {profile.display_name && (
                  <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--muted)' }}>@{username}</p>
                )}
                {profile.location && (
                  <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--text2)' }}>📍 {profile.location}</p>
                )}
                {profile.bio && (
                  <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text2)', lineHeight: 1.5, maxWidth: 480 }}>
                    {profile.bio}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {[
                    { val: vehicles.length, label: 'vehículos' },
                    { val: totalServices, label: 'servicios' },
                    { val: followers.length, label: 'seguidores' },
                    { val: following.length, label: 'siguiendo' },
                  ].map(({ val, label }) => (
                    <span key={label} style={{ fontSize: 13, color: 'var(--text2)' }}>
                      <strong style={{ color: 'var(--text)', fontFamily: "'Space Mono', monospace" }}>{val}</strong> {label}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {isOwnGarage ? (
                  <Link to={`/migaraje/${username}`} className="btn secondary" style={{ fontSize: 12 }}>
                    Gestionar mi garaje →
                  </Link>
                ) : user && (
                  <button
                    className={`btn${isFollowing ? ' secondary' : ''}`}
                    onClick={toggleFollow}
                    disabled={followBusy}
                  >
                    {followBusy ? '…' : isFollowing ? 'Dejar de seguir' : 'Seguir'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text2)', padding: 56 }}>
          <div style={{ fontSize: 44, marginBottom: 14, opacity: 0.25 }}>🏍</div>
          <p style={{ margin: 0, fontSize: 14 }}>Este garaje no tiene vehículos públicos</p>
        </div>
      ) : (
        <div className="stack">
          {vehicles.map(v => <PublicVehicleCard key={v.id} vehicle={v} onLike={handleLike} showSpending={profile.show_spending} />)}
        </div>
      )}
    </div>
  )
}
