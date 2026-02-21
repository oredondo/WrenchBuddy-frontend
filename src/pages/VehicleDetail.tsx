import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as wb from '../api/wrenchbuddy'
import type { ApiError } from '../api/client'

function errMsg(e: unknown) {
  const a = e as ApiError
  return a?.message || 'Error'
}

export default function VehicleDetail() {
  const { id } = useParams()
  const vehicleId = Number(id)
  const navigate = useNavigate()

  const [vehicle, setVehicle] = useState<wb.Vehicle | null>(null)
  const [events, setEvents] = useState<wb.MaintenanceEvent[]>([])
  const [catalog, setCatalog] = useState<wb.TaskCatalog[]>([])
  const [attachmentsByEvent, setAttachmentsByEvent] = useState<Record<number, wb.EventAttachment[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setError(null)
    setLoading(true)
    try {
      const [v, e, cat] = await Promise.all([
        wb.getVehicle(vehicleId),
        wb.listEvents(vehicleId),
        wb.listVehicleCatalog(vehicleId),
      ])
      setVehicle(v)
      setEvents(e)
      setCatalog(cat)

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
    navigate('/vehicles')
  }

  return (
    <div className="stack">
      <div className="row">
        <div>
          <p className="muted"><Link to="/vehicles">← Volver</Link></p>
          <h1>{vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Vehículo'}</h1>
        </div>
        {vehicle ? (
          <div className="row">
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
            <p><b>{vehicle.current_km.toLocaleString()}</b> km</p>
            {vehicle.displacement ? <p>{vehicle.displacement} cc</p> : null}
            {vehicle.notes ? <p className="muted">{vehicle.notes}</p> : null}
          </div>

        </div>
      ) : null}

      <TaskCatalogSection vehicleId={vehicleId} catalog={catalog} onChanged={refresh} />

      <div className="grid">
        <div className="card">
          <h2>Registrar mantenimiento</h2>
          <NewEventForm vehicleId={vehicleId} catalog={catalog} onCreated={refresh} />
        </div>

        <div className="card">
          <h2>Historial</h2>
          {events.length === 0 ? <p className="muted">Sin eventos.</p> : (
            <ul className="list">
              {events.map(ev => (
                <li key={ev.id}>
                  <b>{ev.task_name}</b>
                  <div className="muted">{ev.date} · {ev.km_at_service.toLocaleString()} km · {ev.cost ? `${ev.cost} €` : '—'}</div>
                  {ev.notes ? <div className="muted">{ev.notes}</div> : null}
                  <EventAttachments
                    eventId={ev.id}
                    attachments={attachmentsByEvent[ev.id] || []}
                    onChanged={refresh}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

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
          <div key={att.id} className="attachment-item">
            <span>{att.file_type === 'pdf' ? '📄' : '🖼️'}</span>
            <a href={att.file} target="_blank" rel="noopener noreferrer">{att.original_filename}</a>
            <span className="muted" style={{ fontSize: 12 }}>{new Date(att.uploaded_at).toLocaleDateString()}</span>
            <button className="linklike" onClick={() => handleDelete(att.id)}>Eliminar</button>
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
  const canSubmit = useMemo(() => effectiveCode.trim() && date && km >= 0, [effectiveCode, date, km])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const event = await wb.createEvent({
        vehicle: vehicleId,
        task_code: effectiveCode,
        date,
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
            required={!isCustom}
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
        Factura (opcional)
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </label>

      {error ? <div className="error">{error}</div> : null}
      <button className="btn" disabled={!canSubmit || busy}>{busy ? 'Guardando…' : 'Registrar'}</button>
    </form>
  )
}

