import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as wb from '../api/wrenchbuddy'
import { useAuth } from '../state/auth'
import type { ApiError } from '../api/client'

function errMsg(e: unknown) { return (e as ApiError)?.message || 'Error' }


export default function Profile() {
  const { user, setUser, logout } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [location, setLocation] = useState(user?.location ?? '')
  const [showSpending, setShowSpending] = useState(user?.show_spending ?? false)
  const [preferredLanguage, setPreferredLanguage] = useState<'es' | 'en'>(user?.preferred_language ?? 'es')
  const [avatar, setAvatar] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(user?.avatar ?? null)
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)


  // Cambiar contraseña
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdBusy, setPwdBusy] = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [pwdError, setPwdError] = useState<string | null>(null)

  // Borrar cuenta
  const [deletePwd, setDeletePwd] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!user) return null

  async function onChangePwd(e: React.FormEvent) {
    e.preventDefault()
    if (newPwd !== confirmPwd) { setPwdError('Las contraseñas no coinciden.'); return }
    setPwdBusy(true); setPwdError(null); setPwdSuccess(false)
    try {
      await wb.changePassword({ current_password: currentPwd, new_password: newPwd })
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
      setPwdSuccess(true)
    } catch (e2) { setPwdError(errMsg(e2)) }
    finally { setPwdBusy(false) }
  }

  async function onDeleteAccount(e: React.FormEvent) {
    e.preventDefault()
    setDeleteBusy(true); setDeleteError(null)
    try {
      await wb.deleteAccount(deletePwd)
      await logout()
      navigate('/')
    } catch (e2) { setDeleteError(errMsg(e2)) }
    finally { setDeleteBusy(false) }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null
    setAvatar(f)
    setPreview(f ? URL.createObjectURL(f) : user!.avatar)
    setSuccess(false)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setSuccess(false)
    try {
      const updated = await wb.updateProfile({
        display_name: displayName,
        bio,
        location,
        show_spending: showSpending,
        preferred_language: preferredLanguage,
        avatar: avatar || undefined,
      })
      setUser(updated)
      setAvatar(null)
      setSuccess(true)
    } catch (e2) {
      setError(errMsg(e2))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <div>
        <p className="muted"><Link to={`/migaraje/${user.username}`}>← Mi garaje</Link></p>
        <h1 className="section-title">MI PERFIL</h1>
      </div>

      <div className="card">
        <form className="form" onSubmit={onSubmit}>

          {/* Avatar */}
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--muted)' }}>
              Foto de perfil
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  width: 90, height: 90, borderRadius: '50%', flexShrink: 0,
                  background: preview ? `url(${preview}) center/cover` : 'var(--panel2)',
                  border: '2px solid var(--border)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'border-color .2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                {!preview && <span style={{ fontSize: 36, opacity: 0.2 }}>👤</span>}
              </div>
              <div className="stack" style={{ gap: 6 }}>
                <button type="button" className="btn secondary" style={{ fontSize: 12 }}
                  onClick={() => fileRef.current?.click()}>
                  Subir foto
                </button>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>PNG, JPG o WebP · máx 10MB</p>
                {avatar && (
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--success)' }}>
                    ✓ {avatar.name}
                  </p>
                )}
              </div>
            </div>
            <input
              ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.webp"
              style={{ display: 'none' }} onChange={onFileChange}
            />
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }} />

          {/* Campos */}
          <label>
            Nombre visible
            <input
              value={displayName}
              onChange={e => { setDisplayName(e.target.value); setSuccess(false) }}
              placeholder={`@${user.username}`}
              maxLength={100}
            />
          </label>

          <label>
            Ubicación (opcional)
            <input
              type="text"
              value={location}
              onChange={e => { setLocation(e.target.value); setSuccess(false) }}
              placeholder="Ej: Madrid, Barcelona, Sevilla…"
              maxLength={100}
            />
          </label>

          <label>
            Bio (opcional)
            <textarea
              value={bio}
              onChange={e => { setBio(e.target.value); setSuccess(false) }}
              rows={4}
              placeholder="Cuéntanos sobre ti y tu garaje…"
            />
          </label>

          <label>
            Idioma para la IA
            <select
              value={preferredLanguage}
              onChange={e => { setPreferredLanguage(e.target.value as 'es' | 'en'); setSuccess(false) }}
            >
              <option value="es">Español</option>
              <option value="en">English (Inglés)</option>
            </select>
          </label>


          {/* Toggle gastos */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--border)' }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Mostrar gastos públicamente</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                Muestra el total invertido en mantenimiento y accesorios en tu garaje público
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setShowSpending(s => !s); setSuccess(false) }}
              style={{
                flexShrink: 0,
                width: 44, height: 24,
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                background: showSpending ? 'var(--accent)' : 'var(--panel3)',
                position: 'relative',
                transition: 'background .2s',
              }}
            >
              <span style={{
                position: 'absolute',
                top: 3, left: showSpending ? 22 : 3,
                width: 18, height: 18,
                borderRadius: '50%',
                background: showSpending ? '#060810' : 'var(--muted)',
                transition: 'left .2s',
              }} />
            </button>
          </div>

          {error && <div className="error">{error}</div>}
          {success && (
            <div style={{ color: 'var(--success)', fontSize: 13 }}>
              ✓ Perfil actualizado correctamente
            </div>
          )}

          <div className="row" style={{ gap: 12 }}>
            <button className="btn" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <Link to={`/migaraje/${user.username}`} className="linklike" style={{ fontSize: 13 }}>
              Ver mi garaje →
            </Link>
          </div>
        </form>
      </div>

      {/* Info de cuenta (solo lectura) */}
      <div className="card">
        <h2>Cuenta</h2>
        <div className="stack" style={{ gap: 10 }}>
          {[
            { label: 'Usuario', val: `@${user.username}` },
            { label: 'Email', val: user.email },
            { label: 'Miembro desde', val: new Date(user.date_joined).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' }) },
          ].map(({ label, val }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px' }}>{label}</span>
              <span style={{ fontSize: 13, color: 'var(--text2)', fontFamily: label === 'Usuario' ? "'Space Mono', monospace" : undefined }}>
                {val}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Cambiar contraseña */}
      <div className="card">
        <h2>Cambiar contraseña</h2>
        <form className="form" onSubmit={onChangePwd}>
          <label>
            Contraseña actual
            <input type="password" value={currentPwd} onChange={e => { setCurrentPwd(e.target.value); setPwdSuccess(false) }} required />
          </label>
          <label>
            Nueva contraseña
            <input type="password" value={newPwd} onChange={e => { setNewPwd(e.target.value); setPwdSuccess(false) }} required minLength={8} />
          </label>
          <label>
            Confirmar nueva contraseña
            <input type="password" value={confirmPwd} onChange={e => { setConfirmPwd(e.target.value); setPwdSuccess(false) }} required />
          </label>
          {pwdError && <div className="error">{pwdError}</div>}
          {pwdSuccess && <div style={{ color: 'var(--success)', fontSize: 13 }}>✓ Contraseña actualizada correctamente</div>}
          <div>
            <button className="btn" disabled={pwdBusy}>
              {pwdBusy ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
          </div>
        </form>
      </div>

      {/* Zona peligrosa */}
      <div className="card" style={{ borderColor: 'var(--danger)' }}>
        <h2 style={{ color: 'var(--danger)' }}>Zona peligrosa</h2>
        {!showDeleteConfirm ? (
          <div className="stack" style={{ gap: 10 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text2)' }}>
              Eliminar tu cuenta borrará permanentemente todos tus vehículos, mantenimientos, fotos y datos asociados. Esta acción no se puede deshacer.
            </p>
            <div>
              <button className="btn danger" onClick={() => setShowDeleteConfirm(true)}>
                Eliminar mi cuenta
              </button>
            </div>
          </div>
        ) : (
          <form className="form" onSubmit={onDeleteAccount}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text2)' }}>
              Confirma tu contraseña para eliminar la cuenta definitivamente.
            </p>
            <label>
              Contraseña
              <input type="password" value={deletePwd} onChange={e => setDeletePwd(e.target.value)} required autoFocus />
            </label>
            {deleteError && <div className="error">{deleteError}</div>}
            <div className="row" style={{ gap: 12 }}>
              <button className="btn danger" disabled={deleteBusy}>
                {deleteBusy ? 'Eliminando…' : 'Confirmar y eliminar cuenta'}
              </button>
              <button type="button" className="linklike" onClick={() => { setShowDeleteConfirm(false); setDeletePwd(''); setDeleteError(null) }}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
