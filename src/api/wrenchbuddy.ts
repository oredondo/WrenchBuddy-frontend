import { api } from './client'

export type User = {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
  date_joined: string
}

export type Vehicle = {
  id: number
  vehicle_type: 'motorcycle' | 'car'
  brand: string
  model: string
  year: number
  current_km: number
  displacement?: number | null
  usage_type: 'city' | 'mixed' | 'highway'
  notes?: string
  created_at: string
  updated_at: string
}

export type VehicleListItem = Pick<Vehicle, 'id' | 'vehicle_type' | 'brand' | 'model' | 'year' | 'current_km'>

export type TaskCatalog = {
  id: number
  vehicle: number
  task_code: string
  name: string
  description: string
  interval_km: number | null
  interval_months: number | null
  is_safety_critical: boolean
  source: 'ai_generated' | 'user_created'
  created_at: string
}

export type MaintenanceEvent = {
  id: number
  vehicle: number
  task_code: string
  task_name: string
  date: string
  km_at_service: number
  notes: string
  cost: string | null
  created_at: string
  updated_at: string
}

export type EventAttachment = {
  id: number
  event: number
  file: string
  file_type: 'pdf' | 'image'
  original_filename: string
  uploaded_at: string
}

// ---- Auth (sesión) ----
export async function me(): Promise<User> {
  return api<User>('/api/users/me/')
}

export async function registerUser(data: {
  email: string
  username: string
  password: string
  first_name?: string
  last_name?: string
}): Promise<User> {
  return api<User>('/api/users/', { method: 'POST', body: JSON.stringify(data) })
}

/**
 * Login con Django/DRF sesión.
 * Requiere que el backend exponga /api-auth/login/ (ver README del frontend).
 */
export async function login(usernameOrEmail: string, password: string): Promise<void> {
  const body = new URLSearchParams()
  body.set('username', usernameOrEmail)
  body.set('password', password)
  body.set('next', '/api/users/me/')

  await api('/api-auth/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
}

export async function logout(): Promise<void> {
  await api('/api-auth/logout/', { method: 'POST' })
}

// ---- Vehicles ----
export async function listVehicles(): Promise<VehicleListItem[]> {
  return api<VehicleListItem[]>('/api/vehicles/')
}

export async function getVehicle(id: number): Promise<Vehicle> {
  return api<Vehicle>(`/api/vehicles/${id}/`)
}

export async function createVehicle(data: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>): Promise<Vehicle> {
  return api<Vehicle>('/api/vehicles/', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateVehicle(id: number, data: Partial<Vehicle>): Promise<Vehicle> {
  return api<Vehicle>(`/api/vehicles/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function deleteVehicle(id: number): Promise<void> {
  await api(`/api/vehicles/${id}/`, { method: 'DELETE' })
}

export async function downloadVehicleReport(vehicleId: number, filename: string): Promise<void> {
  const res = await fetch(`/api/vehicles/${vehicleId}/report/`, { credentials: 'include' })
  if (!res.ok) throw { status: res.status, message: 'Error al generar el informe' }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ---- Maintenance ----
export async function listVehicleCatalog(vehicleId: number): Promise<TaskCatalog[]> {
  return api<TaskCatalog[]>(`/api/maintenance/catalog/?vehicle=${vehicleId}`)
}

export async function createCatalogEntry(data: {
  vehicle: number
  task_code: string
  name: string
  description?: string
  interval_km?: number | null
  interval_months?: number | null
  is_safety_critical?: boolean
  source?: 'ai_generated' | 'user_created'
}): Promise<TaskCatalog> {
  return api<TaskCatalog>('/api/maintenance/catalog/', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateCatalogEntry(id: number, data: Partial<{
  name: string
  description: string
  interval_km: number | null
  interval_months: number | null
  is_safety_critical: boolean
}>): Promise<TaskCatalog> {
  return api<TaskCatalog>(`/api/maintenance/catalog/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function deleteCatalogEntry(id: number): Promise<void> {
  await api(`/api/maintenance/catalog/${id}/`, { method: 'DELETE' })
}

export async function listEvents(vehicle?: number): Promise<MaintenanceEvent[]> {
  const qs = vehicle ? `?vehicle=${vehicle}` : ''
  return api<MaintenanceEvent[]>(`/api/maintenance/events/${qs}`)
}

export async function createEvent(data: {
  vehicle: number
  task_code: string
  date: string
  km_at_service: number
  notes?: string
  cost?: string
}): Promise<MaintenanceEvent> {
  return api<MaintenanceEvent>('/api/maintenance/events/', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateEvent(id: number, data: Partial<{
  task_code: string
  date: string
  km_at_service: number
  notes: string
  cost: string
}>): Promise<MaintenanceEvent> {
  return api<MaintenanceEvent>(`/api/maintenance/events/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function deleteEvent(id: number): Promise<void> {
  await api(`/api/maintenance/events/${id}/`, { method: 'DELETE' })
}

// ---- Accessories ----
export type Accessory = {
  id: number
  vehicle: number
  name: string
  price: string | null
  notes: string
  created_at: string
  updated_at: string
}

export async function listAccessories(vehicleId: number): Promise<Accessory[]> {
  return api<Accessory[]>(`/api/maintenance/accessories/?vehicle=${vehicleId}`)
}

export async function createAccessory(data: { vehicle: number; name: string; price?: string; notes?: string }): Promise<Accessory> {
  return api<Accessory>('/api/maintenance/accessories/', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateAccessory(id: number, data: Partial<{ name: string; price: string | null; notes: string }>): Promise<Accessory> {
  return api<Accessory>(`/api/maintenance/accessories/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function deleteAccessory(id: number): Promise<void> {
  await api(`/api/maintenance/accessories/${id}/`, { method: 'DELETE' })
}

// ---- AI ----
export type Recommendation = {
  task_code: string
  task_name: string
  priority: 'high' | 'medium' | 'low'
  due_km: number | null
  due_date: string | null
  explanation: string
  estimated_cost: number | null
}

export async function getWhatsDue(vehicleId: number): Promise<Recommendation[]> {
  return api<Recommendation[]>(`/api/ai/whats-due/${vehicleId}/`)
}

// ---- Attachments ----
export async function listAttachments(eventId: number): Promise<EventAttachment[]> {
  return api<EventAttachment[]>(`/api/maintenance/attachments/?event=${eventId}`)
}

export async function uploadAttachment(eventId: number, file: File): Promise<EventAttachment> {
  const fd = new FormData()
  fd.append('event', String(eventId))
  fd.append('file', file)
  return api<EventAttachment>('/api/maintenance/attachments/', { method: 'POST', body: fd })
}

export async function deleteAttachment(id: number): Promise<void> {
  await api(`/api/maintenance/attachments/${id}/`, { method: 'DELETE' })
}
