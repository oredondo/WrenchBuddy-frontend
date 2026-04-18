import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as wb from '../api/wrenchbuddy'
import type { ChatMessage } from '../api/wrenchbuddy'
import type { ApiError } from '../api/client'
import { useAuth } from '../state/auth'

function errMsg(e: unknown) {
  const a = e as ApiError
  return a?.message || 'Error'
}

export default function VehicleDetail() {
  const { id } = useParams()
  const vehicleId = Number(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const garageUrl = user ? `/migaraje/${user.username}` : '/'

  const [vehicle, setVehicle] = useState<wb.Vehicle | null>(null)
  const [events, setEvents] = useState<wb.MaintenanceEvent[]>([])
  const [catalog, setCatalog] = useState<wb.TaskCatalog[]>([])
  const [attachmentsByEvent, setAttachmentsByEvent] = useState<Record<number, wb.EventAttachment[]>>({})
  const [accessories, setAccessories] = useState<wb.Accessory[]>([])
  const [documents, setDocuments] = useState<wb.VehicleDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editingKm, setEditingKm] = useState(false)
  const [kmValue, setKmValue] = useState(0)
  const [kmBusy, setKmBusy] = useState(false)
  const [kmError, setKmError] = useState<string | null>(null)
  const [reportBusy, setReportBusy] = useState(false)

  const [editingEvent, setEditingEvent] = useState<wb.MaintenanceEvent | null>(null)

  async function refresh() {
    setError(null)
    setLoading(true)
    try {
      const [v, e, cat, acc, docs] = await Promise.all([
        wb.getVehicle(vehicleId),
        wb.listEvents(vehicleId),
        wb.listVehicleCatalog(vehicleId),
        wb.listAccessories(vehicleId),
        wb.listVehicleDocuments(vehicleId),
      ])
      setVehicle(v)
      setEvents(e)
      setCatalog(cat)
      setAccessories(acc)
      setDocuments(docs)

      // Load attachments for all events
      const attResults = await Promise.all(e.map(ev => wb.listAttachments(ev.id)))
      const byEvent: Record<number, wb.EventAttachment[]> = {}
      e.forEach((ev, i) => { byEvent[ev.id] = attResults[i] })
      setAttachmentsByEvent(byEvent)
    } catch (e2) {
      setError(errMsg(e2))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!Number.isFinite(vehicleId)) return
    void refresh()
  }, [vehicleId])

  async function onDelete() {
    if (!confirm('¿Eliminar este vehículo?')) return
    await wb.deleteVehicle(vehicleId)
    navigate(garageUrl)
  }

  return (
    <div className="stack">
      <div className="row">
        <div>
          <p className="muted"><Link to={garageUrl}>← Mi garaje</Link></p>
          <h1>{vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Vehículo'}</h1>
        </div>
        {vehicle ? (
          <div className="row">
            <button
              className="btn secondary"
              disabled={reportBusy}
              onClick={async () => {
                setReportBusy(true)
                try {
                  const filename = `wrenchbuddy_${vehicle.brand}_${vehicle.model}_${vehicle.year}.pdf`.replace(/ /g, '_')
                  await wb.downloadVehicleReport(vehicleId, filename)
                } catch (e) {
                  setError(errMsg(e))
                } finally {
                  setReportBusy(false)
                }
              }}
            >
              {reportBusy ? 'Generando…' : 'Descargar informe PDF'}
            </button>
            <button className="btn danger" onClick={onDelete}>Eliminar</button>
          </div>
        ) : null}
      </div>

      {error ? <div className="error">{error}</div> : null}
      {loading ? <div className="card">Cargando…</div> : null}

      {vehicle ? (
        <div className="grid">
          <div className="card">
            <h3>Datos</h3>
            <p className="muted">{vehicle.vehicle_type === 'motorcycle' ? 'Motocicleta' : 'Coche'} · {vehicle.year}</p>
            {editingKm ? (
              <div className="row" style={{ alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <input
                  type="number"
                  value={kmValue}
                  onChange={(e) => setKmValue(Number(e.target.value))}
                  min={0}
                  style={{ width: 120 }}
                  autoFocus
                />
                <span className="muted">km</span>
                <button
                  className="btn"
                  disabled={kmBusy}
                  onClick={async () => {
                    setKmBusy(true)
                    setKmError(null)
                    try {
                      await wb.updateVehicle(vehicleId, { current_km: kmValue })
                      setEditingKm(false)
                      await refresh()
                    } catch (e) {
                      setKmError(errMsg(e))
                    } finally {
                      setKmBusy(false)
                    }
                  }}
                >
                  {kmBusy ? 'Guardando…' : 'Guardar'}
                </button>
                <button className="linklike" onClick={() => { setEditingKm(false); setKmError(null) }}>Cancelar</button>
                {kmError ? <span className="error" style={{ fontSize: 13 }}>{kmError}</span> : null}
              </div>
            ) : (
              <div className="row" style={{ alignItems: 'center', gap: 10 }}>
                <p style={{ margin: 0 }}><b>{vehicle.current_km.toLocaleString()}</b> km</p>
                <button
                  className="linklike"
                  onClick={() => { setKmValue(vehicle.current_km); setEditingKm(true) }}
                >
                  Editar km
                </button>
              </div>
            )}
            {vehicle.displacement ? <p>{vehicle.displacement} cc</p> : null}
            {vehicle.notes ? <p className="muted">{vehicle.notes}</p> : null}
            <PublicToggle
              isPublic={vehicle.is_public}
              label="vehículo"
              onToggle={async () => {
                await wb.updateVehicle(vehicleId, { is_public: !vehicle.is_public })
                await refresh()
              }}
            />
          </div>

          <GaragePhotoSection vehicleId={vehicleId} />

        </div>
      ) : null}

      <AIChatSection vehicleId={vehicleId} />

      {editingEvent ? (
        <EventEditModal
          event={editingEvent}
          catalog={catalog}
          onClose={() => setEditingEvent(null)}
          onSaved={async () => { setEditingEvent(null); await refresh() }}
        />
      ) : null}

      <TaskCatalogSection vehicleId={vehicleId} catalog={catalog} onChanged={refresh} />

      <div className="card">
        <h2>Registrar mantenimiento</h2>
        <NewEventForm vehicleId={vehicleId} catalog={catalog} onCreated={refresh} />
      </div>

      <div className="card">
        <div className="row" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Historial</h2>
          {events.length > 0 && events.some(ev => !ev.is_public) && (
            <button
              className="btn secondary"
              style={{ fontSize: 12 }}
              onClick={async () => {
                const privados = events.filter(ev => !ev.is_public)
                await Promise.all(privados.map(ev => wb.updateEvent(ev.id, { is_public: true })))
                await refresh()
              }}
            >
              🌐 Hacer todo público
            </button>
          )}
        </div>
        {events.length === 0 ? <p className="muted">Sin eventos.</p> : (
          <ul className="list">
            {events.map(ev => (
              <li key={ev.id}>
                <div className="row" style={{ alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <b>{ev.task_name}</b>
                    <div className="muted">{ev.date} · {ev.km_at_service.toLocaleString()} km · {ev.cost ? `${ev.cost} €` : '—'}</div>
                    {ev.notes ? <div className="muted">{ev.notes}</div> : null}
                    <EventAttachments
                      eventId={ev.id}
                      attachments={attachmentsByEvent[ev.id] || []}
                      onChanged={refresh}
                    />
                  </div>
                  <div className="row" style={{ gap: 8, flexShrink: 0, alignItems: 'center' }}>
                    <PublicToggle
                      isPublic={ev.is_public}
                      label="evento"
                      onToggle={async () => {
                        await wb.updateEvent(ev.id, { is_public: !ev.is_public })
                        await refresh()
                      }}
                    />
                    <button className="linklike" onClick={() => setEditingEvent(ev)}>Editar</button>
                    <button
                      className="linklike"
                      style={{ color: 'var(--danger)' }}
                      onClick={async () => {
                        if (!confirm('¿Eliminar este registro?')) return
                        try {
                          await wb.deleteEvent(ev.id)
                          await refresh()
                        } catch (e) {
                          alert(errMsg(e))
                        }
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AccessorySection vehicleId={vehicleId} accessories={accessories} onChanged={refresh} />

      <VehicleDocumentSection vehicleId={vehicleId} documents={documents} onChanged={refresh} />

    </div>
  )
}

function GaragePhotoSection({ vehicleId }: { vehicleId: number }) {
  const [photos, setPhotos] = useState<wb.GaragePhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  async function refresh() {
    const data = await wb.listGaragePhotos(vehicleId)
    setPhotos(data)
    setLoading(false)
  }

  useEffect(() => { void refresh() }, [vehicleId])

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar esta foto?')) return
    try { await wb.deleteGaragePhoto(id); await refresh() } catch (e) { alert(errMsg(e)) }
  }

  async function togglePublic(photo: wb.GaragePhoto) {
    try {
      await wb.updateGaragePhoto(photo.id, { is_public: !photo.is_public })
      await refresh()
    } catch { /* ignore */ }
  }

  async function setCover(photo: wb.GaragePhoto) {
    if (photo.is_cover) return
    try {
      await wb.updateGaragePhoto(photo.id, { is_cover: true })
      await refresh()
    } catch (e) { alert(errMsg(e)) }
  }

  return (
    <div className="card">
      <div className="row">
        <h2>Fotos</h2>
        <button className="btn secondary" onClick={() => setShowModal(true)}>+ Añadir</button>
      </div>

      {loading && <p className="muted">Cargando…</p>}

      {!loading && photos.length === 0 && (
        <p className="muted" style={{ fontSize: 13 }}>Sin fotos aún.</p>
      )}

      {photos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {photos.map(p => (
            <div key={p.id} style={{
              background: 'var(--panel2)',
              border: `1px solid ${p.is_cover ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
            }}>
              <div style={{ position: 'relative' }}>
                <img
                  src={p.image}
                  alt={p.caption || 'Foto'}
                  style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
                />
                {p.is_cover && (
                  <span style={{
                    position: 'absolute', top: 8, left: 8,
                    background: 'var(--accent)', color: '#060810',
                    fontSize: 10, fontWeight: 700, letterSpacing: '.6px',
                    padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase',
                  }}>
                    Portada
                  </span>
                )}
              </div>
              <div style={{ padding: '8px 10px' }}>
                {p.caption && (
                  <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                    {p.caption}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  {!p.is_cover && (
                    <button
                      className="linklike"
                      onClick={() => setCover(p)}
                      style={{ fontSize: 11, color: 'var(--accent)' }}
                    >
                      ★ Portada
                    </button>
                  )}
                  <button
                    className="linklike"
                    onClick={() => togglePublic(p)}
                    style={{ fontSize: 11, color: p.is_public ? 'var(--success)' : 'var(--muted)' }}
                  >
                    {p.is_public ? '🌐 Pública' : '🔒 Privada'}
                  </button>
                  <button
                    className="linklike"
                    onClick={() => handleDelete(p.id)}
                    style={{ fontSize: 11, color: 'var(--danger)' }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <GaragePhotoModal
          vehicleId={vehicleId}
          onClose={() => setShowModal(false)}
          onSaved={async () => { setShowModal(false); await refresh() }}
        />
      )}
    </div>
  )
}

function GaragePhotoModal({ vehicleId, onClose, onSaved }: {
  vehicleId: number
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [caption, setCaption] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null
    setFile(f)
    setPreview(f ? URL.createObjectURL(f) : null)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      await wb.uploadGaragePhoto(vehicleId, file, caption || undefined, description || undefined, isPublic)
      await onSaved()
    } catch (e2) { setError(errMsg(e2)) } finally { setBusy(false) }
  }

  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={e => e.stopPropagation()}>
        <div className="row">
          <h2>Nueva foto</h2>
          <button className="linklike" onClick={onClose}>Cerrar</button>
        </div>
        <form className="form" onSubmit={onSubmit}>
          <label>
            Imagen
            <input type="file" accept=".png,.jpg,.jpeg,.webp" required onChange={onFileChange} />
          </label>

          {preview && (
            <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
          )}

          <label>
            Título (opcional)
            <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="ej: Recién lavada" maxLength={200} />
          </label>

          <label>
            Descripción (opcional)
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Contexto, evento…" />
          </label>

          <label style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
            Visible en el garaje público
          </label>

          {error && <div className="error">{error}</div>}
          <button className="btn" disabled={!file || busy}>{busy ? 'Subiendo…' : 'Subir foto'}</button>
        </form>
      </div>
    </div>
  )
}

function PublicToggle({ isPublic, label, onToggle }: {
  isPublic: boolean
  label: string
  onToggle: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)

  async function handle() {
    setBusy(true)
    try { await onToggle() } catch { /* ignore */ } finally { setBusy(false) }
  }

  return (
    <button
      className="linklike"
      onClick={handle}
      disabled={busy}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 12,
        color: isPublic ? 'var(--success)' : 'var(--muted)',
        marginTop: 4,
      }}
      title={isPublic ? `Hacer ${label} privado` : `Hacer ${label} público`}
    >
      {isPublic ? '🌐 Público' : '🔒 Privado'}
    </button>
  )
}

function AIChatSection({ vehicleId }: { vehicleId: number }) {
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, busy])

  async function send(e: FormEvent) {
    e.preventDefault()
    const msg = input.trim()
    if (!msg || busy) return

    const userMsg: ChatMessage = { role: 'user', content: msg }
    setHistory(h => [...h, userMsg])
    setInput('')
    setBusy(true)
    setError(null)

    try {
      const reply = await wb.chatWithAI(vehicleId, msg, [...history, userMsg])
      setHistory(h => [...h, { role: 'assistant', content: reply }])
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  function clear() {
    setHistory([])
    setError(null)
  }

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 14 }}>
        <h2>Chat con IA</h2>
        {history.length > 0 && (
          <button className="linklike" onClick={clear}>Limpiar</button>
        )}
      </div>

      {history.length === 0 && (
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Pregunta sobre tu vehículo: historial, gastos, próximos mantenimientos…
          La IA consultará tu base de datos en tiempo real.
        </p>
      )}

      {history.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginBottom: 14,
          maxHeight: 420,
          overflowY: 'auto',
          paddingRight: 4,
        }}>
          {history.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div style={{
                maxWidth: '82%',
                padding: '9px 13px',
                borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                background: msg.role === 'user'
                  ? 'var(--accent-dim)'
                  : 'var(--panel2)',
                border: `1px solid ${msg.role === 'user' ? 'rgba(242,162,0,.25)' : 'var(--border)'}`,
                fontSize: 14,
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
                color: msg.role === 'user' ? 'var(--accent)' : 'var(--text)',
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {busy && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                padding: '9px 13px',
                borderRadius: '12px 12px 12px 4px',
                background: 'var(--panel2)',
                border: '1px solid var(--border)',
                color: 'var(--muted)',
                fontSize: 13,
              }}>
                Consultando base de datos…
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}

      {error && <div className="error" style={{ marginBottom: 10 }}>{error}</div>}

      <form onSubmit={send} style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="¿Cuánto he gastado este año? ¿Cuándo toca cambiar el aceite?"
          disabled={busy}
          style={{ flex: 1 }}
          autoComplete="off"
        />
        <button className="btn" disabled={!input.trim() || busy}>
          {busy ? '…' : 'Enviar'}
        </button>
      </form>
    </div>
  )
}

function AccessorySection({ vehicleId, accessories, onChanged }: {
  vehicleId: number
  accessories: wb.Accessory[]
  onChanged: () => Promise<void>
}) {
  const [editing, setEditing] = useState<wb.Accessory | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [addPrice, setAddPrice] = useState('')
  const [addNotes, setAddNotes] = useState('')
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este accesorio?')) return
    try {
      await wb.deleteAccessory(id)
      await onChanged()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setAddBusy(true)
    setAddError(null)
    try {
      await wb.createAccessory({
        vehicle: vehicleId,
        name: addName,
        price: addPrice || undefined,
        notes: addNotes || undefined,
      })
      setAddName('')
      setAddPrice('')
      setAddNotes('')
      setShowAdd(false)
      await onChanged()
    } catch (e2) {
      setAddError(errMsg(e2))
    } finally {
      setAddBusy(false)
    }
  }

  const total = accessories.reduce((sum, a) => sum + (a.price ? parseFloat(a.price) : 0), 0)

  return (
    <div className="card">
      <div className="row">
        <h2>Accesorios instalados</h2>
        {!showAdd && (
          <button className="btn secondary" onClick={() => setShowAdd(true)}>+ Añadir</button>
        )}
      </div>

      {accessories.length === 0 && !showAdd ? (
        <p className="muted">Sin accesorios registrados.</p>
      ) : null}

      {accessories.length > 0 ? (
        <>
          <ul className="list" style={{ overflow: 'visible' }}>
            {accessories.map(a => (
              <li key={a.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ wordBreak: 'break-word' }}>{a.name}</b>
                    {a.price ? <span className="muted"> · {parseFloat(a.price).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span> : null}
                    {a.notes ? <div className="muted" style={{ fontSize: 13, marginTop: 2, wordBreak: 'break-word' }}>{a.notes}</div> : null}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button className="linklike" onClick={() => setEditing(a)}>Editar</button>
                    <button className="linklike" style={{ color: 'var(--accent2)' }} onClick={() => handleDelete(a.id)}>Eliminar</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {total > 0 ? (
            <p className="muted" style={{ marginTop: 8, textAlign: 'right' }}>
              Total invertido: <b>{total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</b>
            </p>
          ) : null}
        </>
      ) : null}

      {showAdd ? (
        <form className="form" onSubmit={handleAdd} style={{ borderTop: accessories.length > 0 ? '1px solid var(--border)' : 'none', marginTop: accessories.length > 0 ? 12 : 0, paddingTop: accessories.length > 0 ? 12 : 0 }}>
          <h3 style={{ margin: 0 }}>Nuevo accesorio</h3>
          <label>
            Nombre
            <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="ej: Escape Akrapovic" required autoFocus />
          </label>
          <div className="grid2">
            <label>
              Precio (€) (opcional)
              <input type="number" value={addPrice} onChange={e => setAddPrice(e.target.value)} placeholder="ej: 349.99" min={0} step="0.01" />
            </label>
            <label>
              Notas (opcional)
              <input value={addNotes} onChange={e => setAddNotes(e.target.value)} placeholder="Marca, referencia…" />
            </label>
          </div>
          {addError ? <div className="error">{addError}</div> : null}
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" disabled={!addName.trim() || addBusy}>{addBusy ? 'Guardando…' : 'Añadir accesorio'}</button>
            <button type="button" className="linklike" onClick={() => { setShowAdd(false); setAddError(null) }}>Cancelar</button>
          </div>
        </form>
      ) : null}

      {editing ? (
        <AccessoryModal
          vehicleId={vehicleId}
          accessory={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await onChanged() }}
        />
      ) : null}
    </div>
  )
}

function AccessoryModal({ vehicleId, accessory, onClose, onSaved }: {
  vehicleId: number
  accessory: wb.Accessory
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [name, setName] = useState(accessory.name)
  const [price, setPrice] = useState(accessory.price ?? '')
  const [notes, setNotes] = useState(accessory.notes)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await wb.updateAccessory(accessory.id, {
        name,
        price: price || null,
        notes,
      })
      await onSaved()
    } catch (e2) {
      setError(errMsg(e2))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="row">
          <h2>Editar accesorio</h2>
          <button className="linklike" onClick={onClose}>Cerrar</button>
        </div>
        <form className="form" onSubmit={onSubmit}>
          <label>
            Nombre
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ej: Escape Akrapovic" required autoFocus />
          </label>
          <label>
            Precio (€) (opcional)
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="ej: 349.99"
              min={0}
              step="0.01"
            />
          </label>
          <label>
            Notas (opcional)
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Marca, referencia, dónde lo compraste…" />
          </label>
          {error ? <div className="error">{error}</div> : null}
          <button className="btn" disabled={!name.trim() || busy}>
            {busy ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  )
}


function EventEditModal({ event, catalog, onClose, onSaved }: {
  event: wb.MaintenanceEvent
  catalog: wb.TaskCatalog[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const inCatalog = catalog.some(c => c.task_code === event.task_code)
  const [isCustom, setIsCustom] = useState(!inCatalog)
  const [taskCode, setTaskCode] = useState(inCatalog ? event.task_code : '')
  const [customCode, setCustomCode] = useState(!inCatalog ? event.task_code : '')
  const [date, setDate] = useState(event.date)
  const [km, setKm] = useState(event.km_at_service)
  const [notes, setNotes] = useState(event.notes || '')
  const [cost, setCost] = useState(event.cost || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectiveCode = isCustom ? customCode : taskCode

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await wb.updateEvent(event.id, {
        task_code: effectiveCode,
        date,
        km_at_service: km,
        notes: notes || undefined,
        cost: cost || undefined,
      })
      await onSaved()
    } catch (e2) {
      setError(errMsg(e2))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="row">
          <h2>Editar registro</h2>
          <button className="linklike" onClick={onClose}>Cerrar</button>
        </div>
        <form className="form" onSubmit={onSubmit}>
          <label>
            Tarea
            {catalog.length > 0 ? (
              <select
                value={isCustom ? '__custom__' : taskCode}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setIsCustom(true)
                  } else {
                    setIsCustom(false)
                    setTaskCode(e.target.value)
                  }
                }}
                required={!isCustom}
              >
                <option value="">— Seleccionar —</option>
                {catalog.map(c => (
                  <option key={c.id} value={c.task_code}>{c.name}</option>
                ))}
                <option value="__custom__">Otra (escribir nombre)</option>
              </select>
            ) : null}
          </label>

          {(isCustom || catalog.length === 0) ? (
            <label>
              Nombre / código de tarea
              <input
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                placeholder="ej: suspension_check"
                required
                autoFocus={isCustom}
              />
            </label>
          ) : null}

          <div className="grid2">
            <label>
              Fecha
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>
            <label>
              Km al servicio
              <input type="number" value={km} onChange={(e) => setKm(Number(e.target.value))} min={0} required />
            </label>
          </div>

          <label>
            Coste (€) (opcional)
            <input value={cost} onChange={(e) => setCost(e.target.value)} placeholder="ej: 49.90" />
          </label>

          <label>
            Notas
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} style={{ resize: 'vertical' }} />
          </label>

          {error ? <div className="error">{error}</div> : null}
          <button className="btn" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
        </form>
      </div>
    </div>
  )
}

const ANALYSIS_STATUS_LABEL: Record<wb.EventAttachment['analysis_status'], string> = {
  pending: 'Pendiente',
  processing: 'Analizando…',
  completed: 'Analizado',
  failed: 'Error IA',
}
const ANALYSIS_STATUS_COLOR: Record<wb.EventAttachment['analysis_status'], string> = {
  pending: 'var(--muted)',
  processing: 'var(--accent)',
  completed: 'var(--success)',
  failed: 'var(--danger)',
}

function parseAnalysisResult(raw: string): Record<string, unknown> | null {
  try { return JSON.parse(raw) } catch { return null }
}

function AnalysisResult({ att }: { att: wb.EventAttachment }) {
  const [open, setOpen] = useState(false)
  if (att.analysis_status !== 'completed' || !att.analysis_result) return null

  const parsed = parseAnalysisResult(att.analysis_result)
  const fields: { label: string; key: string }[] = [
    { label: 'Tipo', key: 'tipo_servicio' },
    { label: 'Taller', key: 'taller' },
    { label: 'Fecha', key: 'fecha' },
    { label: 'Km', key: 'km' },
    { label: 'Coste', key: 'coste_total' },
    { label: 'Piezas', key: 'piezas' },
    { label: 'Observaciones', key: 'observaciones' },
  ]

  return (
    <div style={{ marginTop: 4 }}>
      <button
        className="linklike"
        onClick={() => setOpen(o => !o)}
        style={{ fontSize: 11, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}
      >
        🤖 {open ? 'Ocultar análisis IA' : 'Ver análisis IA'}
      </button>
      {open && (
        <div style={{
          marginTop: 6,
          background: 'var(--panel2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 10px',
          fontSize: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}>
          {parsed ? (
            fields.map(({ label, key }) => {
              const val = parsed[key]
              if (!val) return null
              const display = Array.isArray(val) ? (val as string[]).join(', ') : String(val)
              return (
                <div key={key} style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: 'var(--muted)', minWidth: 90, flexShrink: 0 }}>{label}</span>
                  <span style={{ color: 'var(--text2)' }}>{display}</span>
                </div>
              )
            })
          ) : (
            <p style={{ margin: 0, color: 'var(--text2)', whiteSpace: 'pre-wrap' }}>{att.analysis_result}</p>
          )}
        </div>
      )}
    </div>
  )
}

function EventAttachments({ eventId, attachments, onChanged }: {
  eventId: number
  attachments: wb.EventAttachment[]
  onChanged: () => Promise<void>
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpload(file: File) {
    setUploading(true)
    setError(null)
    try {
      await wb.uploadAttachment(eventId, file)
      await onChanged()
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(attId: number) {
    if (!confirm('¿Eliminar adjunto?')) return
    try {
      await wb.deleteAttachment(attId)
      await onChanged()
    } catch (e) {
      setError(errMsg(e))
    }
  }

  return (
    <div className="attachments">
      {attachments.length > 0 ? (
        attachments.map(att => (
          <div key={att.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div className="attachment-item">
              <span>{att.file_type === 'pdf' ? '📄' : '🖼️'}</span>
              <a href={att.file} target="_blank" rel="noopener noreferrer">{att.original_filename}</a>
              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 600,
                background: 'transparent',
                color: ANALYSIS_STATUS_COLOR[att.analysis_status],
                border: `1px solid ${ANALYSIS_STATUS_COLOR[att.analysis_status]}`,
                flexShrink: 0,
              }}>
                {ANALYSIS_STATUS_LABEL[att.analysis_status]}
              </span>
              <button className="linklike" onClick={() => handleDelete(att.id)}>Eliminar</button>
            </div>
            <AnalysisResult att={att} />
          </div>
        ))
      ) : null}
      {error ? <div className="error" style={{ fontSize: 13, padding: '6px 10px' }}>{error}</div> : null}
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleUpload(f)
          e.target.value = ''
        }}
      />
      <label className="file-input-label" onClick={() => fileRef.current?.click()}>
        {uploading ? 'Subiendo…' : '+ Adjuntar factura'}
      </label>
    </div>
  )
}

// ---- Task Catalog CRUD ----

function TaskCatalogSection({ vehicleId, catalog, onChanged }: {
  vehicleId: number
  catalog: wb.TaskCatalog[]
  onChanged: () => Promise<void>
}) {
  const [editingTask, setEditingTask] = useState<wb.TaskCatalog | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar esta tarea?')) return
    try {
      await wb.deleteCatalogEntry(id)
      await onChanged()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  return (
    <div className="card">
      <div className="row">
        <h2>Tareas de mantenimiento</h2>
        <button className="btn secondary" onClick={() => setShowAdd(true)}>+ Añadir tarea</button>
      </div>

      {catalog.length === 0 ? (
        <p className="muted">Generando tareas IA… (puede tardar unos segundos)</p>
      ) : (
        <ul className="list">
          {catalog.map(c => (
            <li key={c.id}>
              <div className="row" style={{ alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <b>{c.name}</b>
                  {c.is_safety_critical ? <span className="pill" style={{ marginLeft: 6 }}>Seguridad</span> : null}
                  <div className="muted">
                    {c.task_code}
                    {c.interval_km ? ` · ${c.interval_km.toLocaleString()} km` : ''}
                    {c.interval_months ? ` · ${c.interval_months} meses` : ''}
                    {c.source === 'user_created' ? ' · manual' : ' · IA'}
                  </div>
                  {c.description ? <div className="muted" style={{ fontSize: 13 }}>{c.description}</div> : null}
                </div>
                <div className="row" style={{ gap: 8, flexShrink: 0 }}>
                  <button className="linklike" onClick={() => setEditingTask(c)}>Editar</button>
                  <button className="linklike" style={{ color: 'var(--accent2)' }} onClick={() => handleDelete(c.id)}>Eliminar</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showAdd ? (
        <TaskModal
          vehicleId={vehicleId}
          onClose={() => setShowAdd(false)}
          onSaved={async () => { setShowAdd(false); await onChanged() }}
        />
      ) : null}

      {editingTask ? (
        <TaskModal
          vehicleId={vehicleId}
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSaved={async () => { setEditingTask(null); await onChanged() }}
        />
      ) : null}
    </div>
  )
}

function TaskModal({ vehicleId, task, onClose, onSaved }: {
  vehicleId: number
  task?: wb.TaskCatalog
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const isEdit = !!task
  const [name, setName] = useState(task?.name ?? '')
  const [taskCode, setTaskCode] = useState(task?.task_code ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [intervalKm, setIntervalKm] = useState<number | ''>(task?.interval_km ?? '')
  const [intervalMonths, setIntervalMonths] = useState<number | ''>(task?.interval_months ?? '')
  const [isSafety, setIsSafety] = useState(task?.is_safety_critical ?? false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => name.trim() && taskCode.trim(), [name, taskCode])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (isEdit) {
        await wb.updateCatalogEntry(task.id, {
          name,
          description,
          interval_km: intervalKm === '' ? null : intervalKm,
          interval_months: intervalMonths === '' ? null : intervalMonths,
          is_safety_critical: isSafety,
        })
      } else {
        await wb.createCatalogEntry({
          vehicle: vehicleId,
          task_code: taskCode,
          name,
          description,
          interval_km: intervalKm === '' ? null : intervalKm,
          interval_months: intervalMonths === '' ? null : intervalMonths,
          is_safety_critical: isSafety,
          source: 'user_created',
        })
      }
      await onSaved()
    } catch (e2) {
      setError(errMsg(e2))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="row">
          <h2>{isEdit ? 'Editar tarea' : 'Nueva tarea'}</h2>
          <button className="linklike" onClick={onClose}>Cerrar</button>
        </div>
        <form className="form" onSubmit={onSubmit}>
          <div className="grid2">
            <label>
              Nombre
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              Código (task_code)
              <input
                value={taskCode}
                onChange={(e) => setTaskCode(e.target.value)}
                placeholder="ej: oil_change"
                disabled={isEdit}
                required
              />
            </label>
          </div>

          <label>
            Descripción (opcional)
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </label>

          <div className="grid2">
            <label>
              Intervalo km (opcional)
              <input
                type="number"
                value={intervalKm}
                onChange={(e) => setIntervalKm(e.target.value ? Number(e.target.value) : '')}
                min={0}
                placeholder="ej: 5000"
              />
            </label>
            <label>
              Intervalo meses (opcional)
              <input
                type="number"
                value={intervalMonths}
                onChange={(e) => setIntervalMonths(e.target.value ? Number(e.target.value) : '')}
                min={0}
                placeholder="ej: 12"
              />
            </label>
          </div>

          <label style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" checked={isSafety} onChange={(e) => setIsSafety(e.target.checked)} />
            Crítica para la seguridad
          </label>

          {error ? <div className="error">{error}</div> : null}
          <button className="btn" disabled={!canSubmit || busy}>
            {busy ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear tarea'}
          </button>
        </form>
      </div>
    </div>
  )
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  processing: 'Procesando…',
  completed: 'Listo',
  failed: 'Error',
}
const STATUS_COLOR: Record<string, string> = {
  pending: '#94a3b8',
  processing: '#d97706',
  completed: '#16a34a',
  failed: 'var(--accent2)',
}

function VehicleDocumentSection({ vehicleId, documents, onChanged }: {
  vehicleId: number
  documents: wb.VehicleDocument[]
  onChanged: () => Promise<void>
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [description, setDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function handleUpload(e: FormEvent) {
    e.preventDefault()
    if (!selectedFile) return
    setUploading(true)
    setUploadError(null)
    try {
      await wb.uploadVehicleDocument(vehicleId, selectedFile, description || undefined)
      setDescription('')
      setSelectedFile(null)
      setShowAdd(false)
      await onChanged()
    } catch (err) {
      setUploadError(errMsg(err))
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este documento?')) return
    try {
      await wb.deleteVehicleDocument(id)
      await onChanged()
    } catch (err) {
      alert(errMsg(err))
    }
  }

  return (
    <div className="card">
      <div className="row">
        <div>
          <h2>Documentos del vehículo</h2>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Manuales, fichas técnicas… La IA los usará para generar tareas de mantenimiento más precisas.
          </p>
        </div>
        {!showAdd && (
          <button className="btn secondary" onClick={() => setShowAdd(true)}>+ Subir</button>
        )}
      </div>

      {documents.length === 0 && !showAdd ? (
        <p className="muted">Sin documentos subidos.</p>
      ) : null}

      {documents.length > 0 ? (
        <ul className="list">
          {documents.map(doc => (
            <li key={doc.id}>
              <div className="row" style={{ alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <b>{doc.description || doc.original_filename}</b>
                  {doc.description ? <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>{doc.original_filename}</span> : null}
                  <span
                    className="pill"
                    style={{ marginLeft: 8, background: STATUS_COLOR[doc.extraction_status], color: '#fff' }}
                  >
                    {STATUS_LABEL[doc.extraction_status] ?? doc.extraction_status}
                  </span>
                </div>
                <button
                  className="linklike"
                  style={{ color: 'var(--accent2)', flexShrink: 0 }}
                  onClick={() => handleDelete(doc.id)}
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {showAdd ? (
        <form
          className="form"
          onSubmit={handleUpload}
          style={{ borderTop: documents.length > 0 ? '1px solid var(--border)' : 'none', marginTop: documents.length > 0 ? 12 : 0, paddingTop: documents.length > 0 ? 12 : 0 }}
        >
          <h3 style={{ margin: 0 }}>Subir documento</h3>
          <label>
            Archivo (PDF o imagen)
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              required
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
          </label>
          <label>
            Descripción (opcional)
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ej: Manual de usuario, Ficha técnica"
            />
          </label>
          {uploadError ? <div className="error">{uploadError}</div> : null}
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" disabled={!selectedFile || uploading}>
              {uploading ? 'Subiendo…' : 'Subir documento'}
            </button>
            <button type="button" className="linklike" onClick={() => { setShowAdd(false); setUploadError(null); setSelectedFile(null) }}>
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
    </div>
  )
}

function NewEventForm({ vehicleId, catalog, onCreated }: {
  vehicleId: number
  catalog: wb.TaskCatalog[]
  onCreated: () => Promise<void>
}) {
  const [taskCode, setTaskCode] = useState('')
  const [customCode, setCustomCode] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [km, setKm] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [cost, setCost] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectiveCode = isCustom ? customCode : taskCode
  const canSubmit = useMemo(
    () => !!file || (!!effectiveCode.trim() && !!date && km >= 0),
    [file, effectiveCode, date, km]
  )

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const event = await wb.createEvent({
        vehicle: vehicleId,
        task_code: effectiveCode.trim() || undefined,
        date: date || undefined,
        km_at_service: km,
        notes: notes || undefined,
        cost: cost || undefined,
      })
      if (file) {
        await wb.uploadAttachment(event.id, file)
      }
      setTaskCode('')
      setCustomCode('')
      setIsCustom(false)
      setNotes('')
      setCost('')
      setFile(null)
      await onCreated()
    } catch (e2) {
      setError(errMsg(e2))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="form">
      <label>
        Tarea
        {catalog.length > 0 ? (
          <select
            value={isCustom ? '__custom__' : taskCode}
            onChange={(e) => {
              if (e.target.value === '__custom__') {
                setIsCustom(true)
              } else {
                setIsCustom(false)
                setTaskCode(e.target.value)
              }
            }}
            required={!isCustom && !file}
          >
            <option value="">— Seleccionar —</option>
            {catalog.map(c => (
              <option key={c.id} value={c.task_code}>{c.name}</option>
            ))}
            <option value="__custom__">Otra (escribir código)</option>
          </select>
        ) : null}
      </label>

      {(isCustom || catalog.length === 0) ? (
        <label>
          Código de tarea
          <input
            value={isCustom ? customCode : taskCode}
            onChange={(e) => isCustom ? setCustomCode(e.target.value) : setTaskCode(e.target.value)}
            placeholder="ej: oil_change"
            required={!file}
            autoFocus={isCustom}
          />
        </label>
      ) : null}

      <div className="grid2">
        <label>
          Fecha
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required={!file} />
        </label>
        <label>
          Km al servicio
          <input type="number" value={km} onChange={(e) => setKm(Number(e.target.value))} min={0} required={!file} />
        </label>
      </div>

      <div className="grid2">
        <label>
          Coste (€) (opcional)
          <input value={cost} onChange={(e) => setCost(e.target.value)} placeholder="ej: 49.90" />
        </label>
        <label>
          Notas
          <input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>

      <label>
        Factura / foto del servicio
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        {file ? (
          <span className="muted" style={{ fontSize: 12 }}>
            La IA extraerá los datos del documento. Puedes dejar los campos anteriores vacíos.
          </span>
        ) : null}
      </label>

      {error ? <div className="error">{error}</div> : null}
      <button className="btn" disabled={!canSubmit || busy}>{busy ? 'Guardando…' : 'Registrar'}</button>
    </form>
  )
}

