import { useEffect, useMemo, useState } from 'react'
import * as wb from '../api/wrenchbuddy'
import type { ApiError } from '../api/client'

function errMsg(e: unknown) {
  const a = e as ApiError
  return a?.message || 'Error'
}

export default function Maintenance() {
  const [vehicles, setVehicles] = useState<wb.VehicleListItem[]>([])
  const [tasks, setTasks] = useState<wb.MaintenanceTask[]>([])
  const [catalog, setCatalog] = useState<wb.TaskCatalog[]>([])
  const [vehicleType, setVehicleType] = useState<'motorcycle' | 'car' | ''>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setError(null)
    setLoading(true)
    try {
      const [v, t] = await Promise.all([
        wb.listVehicles(),
        wb.listTasks(),
      ])
      setVehicles(v)
      setTasks(t)
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  useEffect(() => {
    ;(async () => {
      try {
        setCatalog(await wb.listCatalog(vehicleType || undefined))
      } catch {
        setCatalog([])
      }
    })()
  }, [vehicleType])

  const pending = useMemo(() => tasks.filter(t => t.status === 'pending'), [tasks])
  const vehicleById = useMemo(() => new Map(vehicles.map(v => [v.id, v])), [vehicles])

  return (
    <div className="stack">
      <div className="row">
        <h1>Mantenimiento</h1>
        <button className="btn secondary" onClick={() => refresh()}>Refrescar</button>
      </div>

      {error ? <div className="error">{error}</div> : null}
      {loading ? <div className="card">Cargando…</div> : null}

      <div className="grid">
        <div className="card">
          <h2>Tareas pendientes</h2>
          {pending.length === 0 ? <p className="muted">No hay tareas pendientes.</p> : (
            <ul className="list">
              {pending.map(t => {
                const v = vehicleById.get(t.vehicle)
                return (
                  <li key={t.id}>
                    <b>{t.task_name}</b>
                    <div className="muted">
                      {v ? `${v.brand} ${v.model}` : `Vehículo #${t.vehicle}`} · prioridad: {t.priority} · vence: {t.due_km ?? '—'} km / {t.due_date ?? '—'}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="card">
          <h2>Catálogo</h2>
          <label className="muted">
            Filtrar por tipo
            <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value as any)}>
              <option value="">(todos)</option>
              <option value="motorcycle">Motocicleta</option>
              <option value="car">Coche</option>
            </select>
          </label>

          {catalog.length === 0 ? <p className="muted">(sin elementos)</p> : (
            <ul className="list">
              {catalog.slice(0, 12).map(c => (
                <li key={c.task_code}>
                  <b>{c.name}</b> {c.is_safety_critical ? <span className="pill">Seguridad</span> : null}
                  <div className="muted">{c.task_code} · {c.default_interval_km ? `${c.default_interval_km} km` : '—'} · {c.default_interval_months ? `${c.default_interval_months} meses` : '—'}</div>
                </li>
              ))}
            </ul>
          )}
          <p className="muted">Mostrando hasta 12 elementos (puedes ampliar en el código).</p>
        </div>
      </div>
    </div>
  )
}
