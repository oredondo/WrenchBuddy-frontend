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
  const [tasks, setTasks] = useState<wb.MaintenanceTask[]>([])
  const [attachmentsByEvent, setAttachmentsByEvent] = useState<Record<number, wb.EventAttachment[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setError(null)
    setLoading(true)
    try {
      const [v, e, t] = await Promise.all([
        wb.getVehicle(vehicleId),
        wb.listEvents(vehicleId),
        wb.listTasks({ vehicle: vehicleId })
      ])
      setVehicle(v)
      setEvents(e)
      setTasks(t)

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

  const pendingTasks = useMemo(() => tasks.filter(t => t.status === 'pending'), [tasks])

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

          <div className="card">
            <h3>Tareas pendientes</h3>
            {pendingTasks.length === 0 ? (
              <p className="muted">No hay tareas pendientes.</p>
            ) : (
              <ul className="list">
                {pendingTasks.slice(0, 5).map(t => (
                  <li key={t.id}>
                    <b>{t.task_name}</b>
                    <div className="muted">Prioridad: {t.priority} · Vence: {t.due_km ?? '—'} km · {t.due_date ?? '—'}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      <div className="grid">
        <div className="card">
          <h2>Registrar mantenimiento</h2>
          <NewEventForm vehicleId={vehicleId} onCreated={refresh} />
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

      <div className="card">
        <h2>Tareas (AI / sugerencias)</h2>
        {tasks.length === 0 ? <p className="muted">Sin tareas.</p> : (
          <ul className="list">
            {tasks.map(t => (
              <li key={t.id}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <b>{t.task_name}</b>
                    <div className="muted">Estado: {t.status} · Prioridad: {t.priority}</div>
                    {t.explanation ? <div className="muted">{t.explanation}</div> : null}
                  </div>
                  {t.status === 'pending' ? (
                    <div className="row">
                      <TaskCompleteButton task={t} onDone={refresh} />
                      <button className="btn secondary" onClick={async () => { await wb.dismissTask(t.id); await refresh() }}>Descartar</button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
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

function NewEventForm({ vehicleId, onCreated }: { vehicleId: number; onCreated: () => Promise<void> }) {
  const [taskCode, setTaskCode] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [km, setKm] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [cost, setCost] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => taskCode.trim() && date && km >= 0, [taskCode, date, km])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const event = await wb.createEvent({
        vehicle: vehicleId,
        task_code: taskCode,
        date,
        km_at_service: km,
        notes: notes || undefined,
        cost: cost || undefined,
      })
      if (file) {
        await wb.uploadAttachment(event.id, file)
      }
      setTaskCode('')
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
        Código de tarea (task_code)
        <input value={taskCode} onChange={(e) => setTaskCode(e.target.value)} placeholder="ej: oil_change" required />
      </label>

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

function TaskCompleteButton({ task, onDone }: { task: wb.MaintenanceTask; onDone: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="btn" onClick={() => setOpen(true)}>Completar</button>
      {open ? <CompleteDialog task={task} onClose={() => setOpen(false)} onDone={async () => { setOpen(false); await onDone() }} /> : null}
    </>
  )
}

function CompleteDialog({ task, onClose, onDone }: { task: wb.MaintenanceTask; onClose: () => void; onDone: () => Promise<void> }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [km, setKm] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [cost, setCost] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await wb.completeTask(task.id, {
        date,
        km_at_service: km,
        notes: notes || undefined,
        cost: cost || undefined,
      })
      await onDone()
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
          <h2>Completar: {task.task_name}</h2>
          <button className="linklike" onClick={onClose}>Cerrar</button>
        </div>
        <form className="form" onSubmit={onSubmit}>
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

          {error ? <div className="error">{error}</div> : null}
          <button className="btn" disabled={busy}>{busy ? 'Guardando…' : 'Marcar completada'}</button>
        </form>
      </div>
    </div>
  )
}
