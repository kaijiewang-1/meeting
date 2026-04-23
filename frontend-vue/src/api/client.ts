import { useAuthStore } from '@/stores/auth'

function getApiBase() {
  try {
    const override = localStorage.getItem('MEETING_API_BASE')
    if (override?.trim()) return override.replace(/\/$/, '')
  } catch {
    // ignore
  }

  const { hostname, port, origin } = window.location
  const normalized = origin.replace(/\/$/, '')
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1'
  const isLanIp = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(hostname)

  if (isLocalHost) {
    if (port === '5000' || !port) return `${normalized}/api`
    return 'http://127.0.0.1:5000/api'
  }
  if (isLanIp) {
    if (port === '5000' || !port) return `${normalized}/api`
    return `http://${hostname}:5000/api`
  }
  return `${normalized}/api`
}

export const API_BASE = getApiBase()

function authHeaders() {
  const auth = useAuthStore()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`
  return headers
}

async function parseJson(res: Response) {
  const json = await res.json()
  if (json.code === 40101) {
    useAuthStore().logout()
    throw new Error(json.message || '登录已过期，请重新登录')
  }
  if (json.code !== 0 && json.code !== undefined) {
    throw new Error(json.message || '请求失败')
  }
  return json
}

async function request(method: string, path: string, body?: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: authHeaders(),
    body: body == null ? undefined : JSON.stringify(body),
  })
  return parseJson(res)
}

function mapRoom(room: any) {
  if (!room) return null
  const requiresApproval = room.requires_approval ?? room.requiresApproval
  return {
    id: room.id,
    name: room.name,
    building: room.building,
    floor: room.floor,
    capacity: room.capacity,
    facilities: room.facilities || [],
    status: room.status,
    description: room.description || '',
    openHours: room.open_hours || room.openHours || room.weekday_open_hours || '08:00-18:00',
    weekdayOpenHours: room.weekday_open_hours || room.weekdayOpenHours || room.openHours || '08:00-18:00',
    weekendOpenHours: room.weekend_open_hours || room.weekendOpenHours || '09:00-17:00',
    image: room.image || '🏢',
    requiresApproval: requiresApproval === true || requiresApproval === 1 || requiresApproval === '1',
    approverUserId: room.approver_user_id ?? room.approverUserId ?? null,
    approverName: room.approver_name || room.approverName || '',
    visibilityScope: room.visibility_scope || room.visibilityScope || 'ALL',
    visibleColleges: room.visible_colleges || room.visibleColleges || [],
  }
}

function mapBooking(booking: any) {
  if (!booking) return null
  return {
    id: booking.id,
    bookingNo: booking.booking_no || booking.bookingNo,
    subject: booking.subject,
    roomId: booking.room_id || booking.roomId,
    roomName: booking.room_name || booking.roomName,
    organizerId: booking.organizer_id || booking.organizerId,
    organizerName: booking.organizer_name || booking.organizerName,
    startTime: booking.start_time || booking.startTime,
    endTime: booking.end_time || booking.endTime,
    attendeeCount: booking.attendee_count || booking.attendeeCount,
    status: booking.status,
    checkInStatus: booking.check_in_status || booking.checkInStatus || 'PENDING',
    remark: booking.remark || '',
    approvalRemark: booking.approval_remark || booking.approvalRemark || '',
    approverName: booking.approver_name || booking.approverName || '',
    approvedAt: booking.approved_at || booking.approvedAt,
    canceledAt: booking.canceled_at || booking.canceledAt,
    finishedAt: booking.finished_at || booking.finishedAt,
    createdAt: booking.created_at || booking.createdAt,
    updatedAt: booking.updated_at || booking.updatedAt,
  }
}

function mapStats(stats: any) {
  if (!stats) return null
  return {
    totalRooms: stats.totalRooms,
    availableRooms: stats.availableRooms,
    todayBookings: stats.todayBookings,
    utilizationRate: stats.utilizationRate,
    weeklyData: stats.weeklyData || [],
    buildingData: stats.buildingData || [],
    roomsUsage: stats.roomsUsage || [],
  }
}

export const api = {
  async login(username: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    return parseJson(res)
  },

  async getRooms(params: Record<string, any> = {}) {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value == null || value === '') return
      if (Array.isArray(value)) {
        value.forEach((item) => qs.append(key, String(item)))
      } else {
        qs.set(key, String(value))
      }
    })
    const json = await request('GET', `/rooms${qs.toString() ? `?${qs.toString()}` : ''}`)
    return { ...json, data: (json.data || []).map(mapRoom) }
  },

  async getAvailableRooms(params: Record<string, any> = {}) {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value == null || value === '') return
      if (Array.isArray(value)) {
        value.forEach((item) => qs.append(key, String(item)))
      } else {
        qs.set(key, String(value))
      }
    })
    const json = await request('GET', `/rooms/available${qs.toString() ? `?${qs.toString()}` : ''}`)
    return { ...json, data: (json.data || []).map(mapRoom) }
  },

  async getRoom(id: number | string) {
    const json = await request('GET', `/rooms/${id}`)
    return { ...json, data: mapRoom(json.data) }
  },

  async getRoomSchedule(id: number | string, date: string) {
    const json = await request('GET', `/rooms/${id}/schedule?date=${date}`)
    return { ...json, data: (json.data || []).map(mapBooking) }
  },

  async createBooking(data: Record<string, any>) {
    const json = await request('POST', '/bookings', data)
    return { ...json, data: mapBooking(json.data) }
  },

  async getMyBookings(params: Record<string, any> = {}) {
    const qs = new URLSearchParams()
    if (params.status) qs.set('status', params.status)
    const json = await request('GET', `/bookings/my${qs.toString() ? `?${qs.toString()}` : ''}`)
    return { ...json, data: (json.data || []).map(mapBooking) }
  },

  async cancelBooking(id: number | string) {
    const json = await request('POST', `/bookings/${id}/cancel`)
    return { ...json, data: mapBooking(json.data) }
  },

  async checkIn(id: number | string) {
    const json = await request('POST', `/bookings/${id}/check-in`)
    return { ...json, data: mapBooking(json.data) }
  },

  async getStats() {
    const json = await request('GET', '/admin/stats')
    return { ...json, data: mapStats(json.data) }
  },

  async getAdminApprovers() {
    return request('GET', '/admin/approvers')
  },

  async getAdminUsers() {
    return request('GET', '/admin/users')
  },

  async updateAdminUserRole(id: number | string, role: string) {
    return request('PUT', `/admin/users/${id}/role`, { role })
  },

  async getAdminRooms() {
    const json = await request('GET', '/admin/rooms')
    return { ...json, data: (json.data || []).map(mapRoom) }
  },

  async createRoom(data: Record<string, any>) {
    const body = {
      name: data.name,
      building: data.building,
      floor: data.floor,
      capacity: data.capacity,
      description: data.description || '',
      open_hours: data.openHours || data.open_hours || data.weekday_open_hours || '08:00-22:00',
      weekday_open_hours: data.weekday_open_hours || data.weekdayOpenHours || '08:00-18:00',
      weekend_open_hours: data.weekend_open_hours || data.weekendOpenHours || '09:00-17:00',
      image: data.image || '🏢',
      facilities: data.facilities || [],
      status: data.status || 'AVAILABLE',
      requires_approval: data.requiresApproval ? 1 : 0,
      approver_user_id:
        data.requiresApproval && data.approverUserId != null && data.approverUserId !== ''
          ? Number.parseInt(String(data.approverUserId), 10)
          : null,
      visibility_scope: data.visibilityScope || data.visibility_scope || 'ALL',
      visible_colleges: data.visibleColleges || data.visible_colleges || [],
    }
    const json = await request('POST', '/admin/rooms', body)
    return { ...json, data: mapRoom(json.data) }
  },

  async updateRoom(id: number | string, data: Record<string, any>) {
    const body: Record<string, any> = {}
    ;[
      'name',
      'building',
      'floor',
      'capacity',
      'status',
      'description',
      'open_hours',
      'image',
      'facilities',
      'visibility_scope',
      'visible_colleges',
    ].forEach((key) => {
      if (data[key] !== undefined) body[key] = data[key]
    })
    if (data.openHours !== undefined) body.open_hours = data.openHours
    if (data.weekday_open_hours !== undefined) body.weekday_open_hours = data.weekday_open_hours
    if (data.weekdayOpenHours !== undefined) body.weekday_open_hours = data.weekdayOpenHours
    if (data.weekend_open_hours !== undefined) body.weekend_open_hours = data.weekend_open_hours
    if (data.weekendOpenHours !== undefined) body.weekend_open_hours = data.weekendOpenHours
    if (data.requiresApproval !== undefined) body.requires_approval = data.requiresApproval ? 1 : 0
    if (data.approverUserId !== undefined) {
      body.approver_user_id =
        data.approverUserId === '' || data.approverUserId == null
          ? null
          : Number.parseInt(String(data.approverUserId), 10)
    }
    if (data.visibilityScope !== undefined) body.visibility_scope = data.visibilityScope
    if (data.visibleColleges !== undefined) body.visible_colleges = data.visibleColleges
    const json = await request('PUT', `/admin/rooms/${id}`, body)
    return { ...json, data: mapRoom(json.data) }
  },

  async deleteRoom(id: number | string) {
    return request('DELETE', `/admin/rooms/${id}`)
  },

  async getAllBookings(params: Record<string, any> = {}) {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value != null && value !== '') qs.set(key, String(value))
    })
    const json = await request('GET', `/admin/bookings${qs.toString() ? `?${qs.toString()}` : ''}`)
    return { ...json, data: (json.data || []).map(mapBooking) }
  },

  async approveBooking(id: number | string) {
    const json = await request('POST', `/admin/bookings/${id}/approve`)
    return { ...json, data: mapBooking(json.data) }
  },

  async rejectBooking(id: number | string, reason = '') {
    const json = await request('POST', `/admin/bookings/${id}/reject`, { reason })
    return { ...json, data: mapBooking(json.data) }
  },

  async getPendingApprovals() {
    const json = await request('GET', '/approvals/pending')
    return { ...json, data: (json.data || []).map(mapBooking) }
  },

  async approvePending(id: number | string) {
    return request('POST', `/approvals/${id}/approve`)
  },

  async rejectPending(id: number | string, reason = '') {
    return request('POST', `/approvals/${id}/reject`, { reason })
  },

  async getNotifications() {
    return request('GET', '/notifications')
  },

  async getUnreadCount() {
    return request('GET', '/notifications/unread-count')
  },

  async markNotificationRead(id: number | string) {
    return request('POST', `/notifications/${id}/read`)
  },

  async markAllNotificationsRead() {
    return request('POST', '/notifications/read-all')
  },

  async deleteNotification(id: number | string) {
    return request('DELETE', `/notifications/${id}`)
  },
}
