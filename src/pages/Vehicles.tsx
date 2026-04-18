import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as wb from '../api/wrenchbuddy'
import type { ApiError } from '../api/client'

function errMsg(e: unknown) {
  const a = e as ApiError
  return a?.message || 'Error'
}

function VehicleTypeIcon({ type }: { type: string }) {
  return <span>{type === 'motorcycle' ? '🏍️' : '🚗'}</span>
}

export default function Vehicles() {
  const [items, setItems]   = useState<wb.VehicleListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)
  const [show, setShow]     = useState(false)

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
        <h1>VEHÍCULOS</h1>
        <button className="btn" onClick={() => setShow(true)}>+ Añadir</button>
      </div>

      {error && <div className="error">{error}</div>}

      {loading && (
        <div className="card" style={{ color: 'var(--muted)', fontSize: 14 }}>
          Cargando vehículos…
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <p style={{ fontSize: 36, margin: '0 0 12px' }}>🏍️</p>
          <h3 style={{ marginBottom: 8, color: 'var(--text)' }}>Sin vehículos aún</h3>
          <p style={{ color: 'var(--muted)', marginBottom: 20 }}>
            Añade tu moto y la IA generará su catálogo de mantenimiento.
          </p>
          <button className="btn" onClick={() => setShow(true)}>Añadir mi primer vehículo</button>
        </div>
      )}

      <div className="grid">
        {items.map(v => (
          <Link key={v.id} to={`/vehicles/${v.id}`} className="card linkcard">
            <div className="vehicle-card-type">
              <VehicleTypeIcon type={v.vehicle_type} />
              {v.vehicle_type === 'motorcycle' ? 'Motocicleta' : 'Coche'}
              <span style={{ marginLeft: 'auto', fontFamily: "'Space Mono', monospace", fontSize: 11 }}>
                {v.year}
              </span>
            </div>

            <div className="vehicle-card-name">
              {v.brand} {v.model}
            </div>

            <div
              style={{
                height: 1,
                background: 'var(--border)',
                margin: '12px 0',
              }}
            />

            <div className="vehicle-card-km">
              {v.current_km.toLocaleString('es-ES')}
              <span className="vehicle-card-km-label">km</span>
            </div>
          </Link>
        ))}
      </div>

      {show && (
        <VehicleCreateDialog
          onClose={() => setShow(false)}
          onCreated={async () => { setShow(false); await refresh() }}
        />
      )}
    </div>
  )
}

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

  const canSubmit = useMemo(
    () => brand.trim() && model.trim() && year > 1900,
    [brand, model, year],
  )

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const payload: Omit<wb.Vehicle, 'id' | 'created_at' | 'updated_at'> = {
        vehicle_type: vehicleType,
        brand,
        model,
        year,
        current_km: currentKm,
        displacement: displacement === '' ? null : displacement,
        usage_type: usageType,
        notes: notes || undefined,
        is_public: false,
      }
      await wb.createVehicle(payload)
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
        <div className="row" style={{ marginBottom: 18 }}>
          <h2>Añadir vehículo</h2>
          <button className="linklike" onClick={onClose}>Cerrar</button>
        </div>

        <form className="form" onSubmit={onSubmit}>
          <div className="grid2">
            <label>
              Tipo
              <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value as 'motorcycle' | 'car')}>
                <option value="motorcycle">🏍️ Motocicleta</option>
                <option value="car">🚗 Coche</option>
              </select>
            </label>
            <label>
              Uso habitual
              <select value={usageType} onChange={(e) => setUsageType(e.target.value as 'city' | 'mixed' | 'highway')}>
                <option value="city">Ciudad</option>
                <option value="mixed">Mixto</option>
                <option value="highway">Carretera</option>
              </select>
            </label>
          </div>

          <div className="grid2">
            <label>
              Marca
              <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Honda, Yamaha…" required />
            </label>
            <label>
              Modelo
              <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="CBR, MT-07…" required />
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
            Cilindrada (cc) — opcional
            <input
              type="number"
              value={displacement}
              onChange={(e) => setDisplacement(e.target.value ? Number(e.target.value) : '')}
              min={0}
              placeholder="650"
            />
          </label>

          <label>
            Notas
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Modificaciones, estado general…" />
          </label>

          {error && <div className="error">{error}</div>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn secondary" onClick={onClose}>Cancelar</button>
            <button className="btn" disabled={!canSubmit || busy}>
              {busy ? 'Guardando…' : 'Añadir vehículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
