import { api } from './client'

export type User = {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
  display_name: string
  bio: string
  location: string
  avatar: string | null
  show_spending: boolean
  date_joined: string
}

export type PublicProfile = {
  username: string
  display_name: string
  bio: string
  location: string
  avatar: string | null
  show_spending: boolean
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
  is_public: boolean
  created_at: string
  updated_at: string
}

export type VehicleListItem = Pick<Vehicle, 'id' | 'vehicle_type' | 'brand' | 'model' | 'year' | 'current_km' | 'is_public'>

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
  is_public: boolean
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
  analysis_status: 'pending' | 'processing' | 'completed' | 'failed'
  analysis_result: string | null
}

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

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

export async function updateProfile(data: {
  display_name?: string
  bio?: string
  location?: string
  show_spending?: boolean
  avatar?: File
}): Promise<User> {
  const fd = new FormData()
  if (data.display_name !== undefined) fd.append('display_name', data.display_name)
  if (data.bio !== undefined) fd.append('bio', data.bio)
  if (data.location !== undefined) fd.append('location', data.location)
  if (data.show_spending !== undefined) fd.append('show_spending', String(data.show_spending))
  if (data.avatar) fd.append('avatar', data.avatar)
  return api<User>('/api/users/update_profile/', { method: 'PATCH', body: fd })
}

export async function changePassword(data: { current_password: string; new_password: string }): Promise<void> {
  await api<void>('/api/users/change_password/', { method: 'POST', body: JSON.stringify(data) })
}

export async function deleteAccount(password: string): Promise<void> {
  await api<void>('/api/users/delete_account/', { method: 'DELETE', body: JSON.stringify({ password }) })
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
  task_code?: string
  date?: string
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
  is_public: boolean
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

// ---- AI Chat ----
export async function chatWithAI(
  vehicleId: number,
  message: string,
  history: ChatMessage[],
): Promise<string> {
  const data = await api<{ response: string }>(`/api/ai/chat/${vehicleId}/`, {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  })
  return data.response
}

// ---- Vehicle Documents ----
export type VehicleDocument = {
  id: number
  vehicle: number
  file: string
  file_type: 'pdf' | 'image'
  original_filename: string
  description: string
  extraction_status: 'pending' | 'processing' | 'completed' | 'failed'
  uploaded_at: string
}

export async function listVehicleDocuments(vehicleId: number): Promise<VehicleDocument[]> {
  return api<VehicleDocument[]>(`/api/vehicles/documents/?vehicle=${vehicleId}`)
}

export async function uploadVehicleDocument(
  vehicleId: number,
  file: File,
  description?: string,
): Promise<VehicleDocument> {
  const fd = new FormData()
  fd.append('vehicle', String(vehicleId))
  fd.append('file', file)
  if (description) fd.append('description', description)
  return api<VehicleDocument>('/api/vehicles/documents/', { method: 'POST', body: fd })
}

export async function deleteVehicleDocument(id: number): Promise<void> {
  await api(`/api/vehicles/documents/${id}/`, { method: 'DELETE' })
}

// ---- Garage Photos ----
export type GaragePhoto = {
  id: number
  vehicle: number
  image: string
  caption: string
  description: string
  is_public: boolean
  is_cover: boolean
  uploaded_at: string
}

export async function listGaragePhotos(vehicleId?: number): Promise<GaragePhoto[]> {
  const qs = vehicleId ? `?vehicle=${vehicleId}` : ''
  return api<GaragePhoto[]>(`/api/social/photos/${qs}`)
}

export async function uploadGaragePhoto(
  vehicleId: number,
  file: File,
  caption?: string,
  description?: string,
  isPublic = true,
): Promise<GaragePhoto> {
  const fd = new FormData()
  fd.append('vehicle', String(vehicleId))
  fd.append('image', file)
  fd.append('is_public', String(isPublic))
  if (caption) fd.append('caption', caption)
  if (description) fd.append('description', description)
  return api<GaragePhoto>('/api/social/photos/', { method: 'POST', body: fd })
}

export async function updateGaragePhoto(
  id: number,
  data: Partial<Pick<GaragePhoto, 'caption' | 'description' | 'is_public' | 'is_cover'>>,
): Promise<GaragePhoto> {
  return api<GaragePhoto>(`/api/social/photos/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function deleteGaragePhoto(id: number): Promise<void> {
  await api(`/api/social/photos/${id}/`, { method: 'DELETE' })
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

// ---- Social — Tipos públicos ----

export type PublicGaragePhoto = {
  id: number
  image: string
  caption: string
  description: string
  is_cover: boolean
  uploaded_at: string
  likes_count: number
}

export type PublicMaintenanceEvent = {
  id: number
  task_code: string
  date: string
  km_at_service: number
  notes: string
  cost: string | null
}

export type PublicAccessory = {
  id: number
  name: string
  price: string | null
  notes: string
}

export type PublicVehicle = {
  id: number
  vehicle_type: 'motorcycle' | 'car'
  brand: string
  model: string
  year: number
  current_km: number
  displacement?: number | null
  usage_type: string
  notes: string
  likes_count: number
  comments_count: number
  garage_photos: PublicGaragePhoto[]
  maintenance_events: PublicMaintenanceEvent[]
  accessories: PublicAccessory[]
}

export type GarageListItem = {
  username: string
  vehicle_count: number
  preview_photo: PublicGaragePhoto | null
}

export type GarageProfile = {
  username: string
  profile: PublicProfile
  vehicles: PublicVehicle[]
}

export type VehicleComment = {
  id: number
  username: string
  vehicle: number
  body: string
  created_at: string
  updated_at: string
}

export type GaragePhotoComment = {
  id: number
  username: string
  photo: number
  body: string
  created_at: string
  updated_at: string
}

// ---- Social — Garage público ----

export async function listGarages(): Promise<GarageListItem[]> {
  return api<GarageListItem[]>('/api/garage/')
}

export async function getGarageProfile(username: string): Promise<GarageProfile> {
  return api<GarageProfile>(`/api/garage/${username}/`)
}

// ---- Social — Follow ----

export async function followUser(username: string): Promise<void> {
  await api(`/api/social/follow/${username}/`, { method: 'POST' })
}

export async function unfollowUser(username: string): Promise<void> {
  await api(`/api/social/follow/${username}/`, { method: 'DELETE' })
}

export async function getFollowers(username: string): Promise<string[]> {
  return api<string[]>(`/api/social/followers/${username}/`)
}

export async function getFollowing(username: string): Promise<string[]> {
  return api<string[]>(`/api/social/following/${username}/`)
}

// ---- Social — Feed ----

export type FeedVehicle = {
  id: number
  owner: string
  brand: string
  model: string
  year: number
  current_km: number
  preview_photo: PublicGaragePhoto | null
  created_at: string
}

export async function getFeed(): Promise<FeedVehicle[]> {
  return api<FeedVehicle[]>('/api/social/feed/')
}

// ---- Social — Likes ----

export async function likeVehicle(vehicleId: number): Promise<{ likes: number }> {
  return api<{ likes: number }>(`/api/social/vehicles/${vehicleId}/like/`, { method: 'POST' })
}

export async function unlikeVehicle(vehicleId: number): Promise<{ likes: number }> {
  return api<{ likes: number }>(`/api/social/vehicles/${vehicleId}/like/`, { method: 'DELETE' })
}

export async function likePhoto(photoId: number): Promise<{ likes: number }> {
  return api<{ likes: number }>(`/api/social/photos/${photoId}/like/`, { method: 'POST' })
}

export async function unlikePhoto(photoId: number): Promise<{ likes: number }> {
  return api<{ likes: number }>(`/api/social/photos/${photoId}/like/`, { method: 'DELETE' })
}

// ---- Social — Comentarios ----

export async function listVehicleComments(vehicleId: number): Promise<VehicleComment[]> {
  return api<VehicleComment[]>(`/api/social/vehicle-comments/?vehicle=${vehicleId}`)
}

export async function createVehicleComment(vehicleId: number, body: string): Promise<VehicleComment> {
  return api<VehicleComment>('/api/social/vehicle-comments/', {
    method: 'POST',
    body: JSON.stringify({ vehicle: vehicleId, body }),
  })
}

export async function deleteVehicleComment(id: number): Promise<void> {
  await api(`/api/social/vehicle-comments/${id}/`, { method: 'DELETE' })
}

export async function listPhotoComments(photoId: number): Promise<GaragePhotoComment[]> {
  return api<GaragePhotoComment[]>(`/api/social/photo-comments/?photo=${photoId}`)
}

export async function createPhotoComment(photoId: number, body: string): Promise<GaragePhotoComment> {
  return api<GaragePhotoComment>('/api/social/photo-comments/', {
    method: 'POST',
    body: JSON.stringify({ photo: photoId, body }),
  })
}

export async function deletePhotoComment(id: number): Promise<void> {
  await api(`/api/social/photo-comments/${id}/`, { method: 'DELETE' })
}
