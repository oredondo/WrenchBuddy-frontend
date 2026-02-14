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
  task_code: string
  vehicle_type: 'motorcycle' | 'car'
  name: string
  description: string
  default_interval_km: number | null
  default_interval_months: number | null
  is_safety_critical: boolean
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
  created_from_task: number | null
  created_at: string
  updated_at: string
}

export type MaintenanceTask = {
  id: number
  vehicle: number
  task_code: string
  task_name: string
  priority: 'high' | 'medium' | 'low'
  due_km: number | null
  due_date: string | null
  explanation: string
  estimated_cost: string | null
  status: 'pending' | 'completed' | 'dismissed'
  completed_event: number | null
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

// ---- Maintenance ----
export async function listCatalog(vehicle_type?: 'motorcycle' | 'car'): Promise<TaskCatalog[]> {
  const qs = vehicle_type ? `?vehicle_type=${vehicle_type}` : ''
  return api<TaskCatalog[]>(`/api/maintenance/catalog/${qs}`)
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

export async function listTasks(params?: { vehicle?: number; status?: string }): Promise<MaintenanceTask[]> {
  const qs = new URLSearchParams()
  if (params?.vehicle) qs.set('vehicle', String(params.vehicle))
  if (params?.status) qs.set('status', params.status)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return api<MaintenanceTask[]>(`/api/maintenance/tasks/${suffix}`)
}

export async function completeTask(id: number, data: {
  date: string
  km_at_service: number
  notes?: string
  cost?: string
}): Promise<MaintenanceTask> {
  return api<MaintenanceTask>(`/api/maintenance/tasks/${id}/complete/`, { method: 'POST', body: JSON.stringify(data) })
}

export async function dismissTask(id: number): Promise<MaintenanceTask> {
  return api<MaintenanceTask>(`/api/maintenance/tasks/${id}/dismiss/`, { method: 'POST' })
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
