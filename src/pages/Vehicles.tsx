import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as wb from '../api/wrenchbuddy'
import type { ApiError } from '../api/client'

function errMsg(e: unknown) {
  const a = e as ApiError
  return a?.message || 'Error'
}

export default function Vehicles() {
  const [items, setItems] = useState<wb.VehicleListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [show, setShow] = useState(false)

  async function refresh() {
    setError(null)
    setLoading(true)
    try {
      setItems(await wb.listVehicles())
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  return (
    <div className="stack">
      <div className="row">
        <h1>Vehículos</h1>
        <button className="btn" onClick={() => setShow(true)}>Añadir</button>
      </div>

      {error ? <div className="error">{error}</div> : null}
      {loading ? <div className="card">Cargando…</div> : null}

      {(!loading && items.length === 0) ? (
        <div className="card">
          <p>No tienes vehículos registrados.</p>
          <button className="btn" onClick={() => setShow(true)}>Crear el primero</button>
        </div>
      ) : null}

      <div className="grid">
        {items.map(v => (
          <Link key={v.id} to={`/vehicles/${v.id}`} className="card linkcard">
            <h3>{v.brand} {v.model}</h3>
            <p className="muted">{v.vehicle_type === 'motorcycle' ? 'Motocicleta' : 'Coche'} · {v.year}</p>
            <p><b>{v.current_km.toLocaleString()}</b> km</p>
          </Link>
        ))}
      </div>

      {show ? <VehicleCreateDialog onClose={() => setShow(false)} onCreated={async () => { setShow(false); await refresh() }} /> : null}
    </div>
  )
}

function VehicleCreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [vehicleType, setVehicleType] = useState<'motorcycle'|'car'>('motorcycle')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [currentKm, setCurrentKm] = useState<number>(0)
  const [displacement, setDisplacement] = useState<number | ''>('')
  const [usageType, setUsageType] = useState<'city'|'mixed'|'highway'>('mixed')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => brand.trim() && model.trim() && year > 1900, [brand, model, year])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await wb.createVehicle({
        vehicle_type: vehicleType,
        brand,
        model,
        year,
        current_km: currentKm,
        displacement: displacement === '' ? null : displacement,
        usage_type: usageType,
        notes,
      } as any)
      await onCreated()
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
          <h2>Añadir vehículo</h2>
          <button className="linklike" onClick={onClose}>Cerrar</button>
        </div>
        <form className="form" onSubmit={onSubmit}>
          <div className="grid2">
            <label>
              Tipo
              <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value as any)}>
                <option value="motorcycle">Motocicleta</option>
                <option value="car">Coche</option>
              </select>
            </label>
            <label>
              Uso
              <select value={usageType} onChange={(e) => setUsageType(e.target.value as any)}>
                <option value="city">Ciudad</option>
                <option value="mixed">Mixto</option>
                <option value="highway">Carretera</option>
              </select>
            </label>
          </div>

          <div className="grid2">
            <label>
              Marca
              <input value={brand} onChange={(e) => setBrand(e.target.value)} required />
            </label>
            <label>
              Modelo
              <input value={model} onChange={(e) => setModel(e.target.value)} required />
            </label>
          </div>

          <div className="grid2">
            <label>
              Año
              <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} min={1900} required />
            </label>
            <label>
              Km actuales
              <input type="number" value={currentKm} onChange={(e) => setCurrentKm(Number(e.target.value))} min={0} required />
            </label>
          </div>

          <label>
            Cilindrada (cc) (opcional)
            <input type="number" value={displacement} onChange={(e) => setDisplacement(e.target.value ? Number(e.target.value) : '')} min={0} />
          </label>

          <label>
            Notas
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </label>

          {error ? <div className="error">{error}</div> : null}

          <button className="btn" disabled={!canSubmit || busy}>
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
        </form>
      </div>
    </div>
  )
}
