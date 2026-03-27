// 会议室预定系统 - API 客户端
// 所有接口调用通过此模块，发往后端 Flask 服务
const API_BASE = 'http://127.0.0.1:5000/api';

// 统一请求头
function headers() {
  const h = { 'Content-Type': 'application/json' };
  const token = auth.getToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

// 统一错误处理
async function request(method, path, body = null) {
  const options = { method, headers: headers() };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, options);
  const json = await res.json();

  // Token 失效，跳转登录
  if (json.code === 40101) {
    auth.logout();
    throw { code: 40101, message: json.message || '登录已过期，请重新登录' };
  }

  if (json.code !== 0 && json.code !== undefined) {
    throw { code: json.code, message: json.message || '请求失败' };
  }

  return json;
}

// 字段名映射：snake_case (后端) → camelCase (前端)
function mapRoom(r) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    building: r.building,
    floor: r.floor,
    capacity: r.capacity,
    facilities: r.facilities || [],
    status: r.status,
    description: r.description || '',
    openHours: r.open_hours || r.openHours || '08:00-22:00',
    image: r.image || '🏢',
  };
}

function mapBooking(b) {
  if (!b) return null;
  return {
    id: b.id,
    bookingNo: b.booking_no || b.bookingNo,
    subject: b.subject,
    roomId: b.room_id || b.roomId,
    roomName: b.room_name || b.roomName,
    organizerId: b.organizer_id || b.organizerId,
    organizerName: b.organizer_name || b.organizerName,
    startTime: b.start_time || b.startTime,
    endTime: b.end_time || b.endTime,
    attendeeCount: b.attendee_count || b.attendeeCount,
    status: b.status,
    checkInStatus: b.check_in_status || b.checkInStatus || 'PENDING',
    remark: b.remark || '',
    canceledAt: b.canceled_at || b.canceledAt,
    finishedAt: b.finished_at || b.finishedAt,
    createdAt: b.created_at || b.createdAt,
    updatedAt: b.updated_at || b.updatedAt,
  };
}

function mapStats(s) {
  if (!s) return null;
  return {
    totalRooms: s.totalRooms,
    availableRooms: s.availableRooms,
    todayBookings: s.todayBookings,
    utilizationRate: s.utilizationRate,
    weeklyData: s.weeklyData || [],
    buildingData: s.buildingData || [],
    roomsUsage: s.roomsUsage || [],
  };
}

const api = {
  // ── 认证 ──────────────────────────────────────────────

  async login(username, password) {
    const json = await request('POST', '/auth/login', { username, password });
    // 登录成功后 auth 状态由 login.js 写入 store
    return json;
  },

  // ── 会议室 ──────────────────────────────────────────────

  async getRooms(params = {}) {
    const qs = new URLSearchParams();
    if (params.building) qs.set('building', params.building);
    if (params.floor) qs.set('floor', params.floor);
    if (params.capacity) qs.set('capacity', params.capacity);
    if (params.status) qs.set('status', params.status);
    if (params.date) qs.set('date', params.date);
    const path = `/rooms${qs.toString() ? '?' + qs.toString() : ''}`;
    const json = await request('GET', path);
    return { ...json, data: (json.data || []).map(mapRoom) };
  },

  async getAvailableRooms(params = {}) {
    const qs = new URLSearchParams();
    if (params.date) qs.set('date', params.date);
    if (params.startTime) qs.set('startTime', params.start);
    if (params.endTime) qs.set('endTime', params.end);
    if (params.capacity) qs.set('capacity', params.capacity);
    if (params.building) qs.set('building', params.building);
    if (params.floor) qs.set('floor', params.floor);
    if (params.facilities && params.facilities.length) {
      params.facilities.forEach(f => qs.append('facilities', f));
    }
    const path = `/rooms/available${qs.toString() ? '?' + qs.toString() : ''}`;
    const json = await request('GET', path);
    return { ...json, data: (json.data || []).map(mapRoom) };
  },

  async getRoom(id) {
    const json = await request('GET', `/rooms/${id}`);
    return { ...json, data: mapRoom(json.data) };
  },

  async getRoomSchedule(id, date) {
    const json = await request('GET', `/rooms/${id}/schedule?date=${date}`);
    return { ...json, data: (json.data || []).map(mapBooking) };
  },

  // ── 预定 ──────────────────────────────────────────────

  async getMyBookings(params = {}) {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    const path = `/bookings/my${qs.toString() ? '?' + qs.toString() : ''}`;
    const json = await request('GET', path);
    return { ...json, data: (json.data || []).map(mapBooking) };
  },

  async createBooking(data) {
    const body = {
      subject: data.subject,
      roomId: data.roomId,
      startTime: data.startTime,
      endTime: data.endTime,
      attendeeCount: data.attendeeCount || 1,
      remark: data.remark || '',
    };
    const json = await request('POST', '/bookings', body);
    return { ...json, data: mapBooking(json.data) };
  },

  async cancelBooking(id) {
    const json = await request('POST', `/bookings/${id}/cancel`);
    return { ...json, data: mapBooking(json.data) };
  },

  async checkIn(id) {
    const json = await request('POST', `/bookings/${id}/check-in`);
    return { ...json, data: mapBooking(json.data) };
  },

  // ── 统计 ──────────────────────────────────────────────

  async getStats() {
    const json = await request('GET', '/admin/stats');
    return { ...json, data: mapStats(json.data) };
  },

  // ── 管理 ──────────────────────────────────────────────

  async getAdminRooms() {
    const json = await request('GET', '/admin/rooms');
    return { ...json, data: (json.data || []).map(mapRoom) };
  },

  async createRoom(data) {
    const json = await request('POST', '/admin/rooms', {
      name: data.name,
      building: data.building,
      floor: data.floor,
      capacity: data.capacity,
      description: data.description || '',
      open_hours: data.openHours || data.open_hours || '08:00-22:00',
      image: data.image || '🏢',
      facilities: data.facilities || [],
      status: data.status || 'AVAILABLE',
    });
    return { ...json, data: mapRoom(json.data) };
  },

  async updateRoom(id, data) {
    const body = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.building !== undefined) body.building = data.building;
    if (data.floor !== undefined) body.floor = data.floor;
    if (data.capacity !== undefined) body.capacity = data.capacity;
    if (data.status !== undefined) body.status = data.status;
    if (data.description !== undefined) body.description = data.description;
    if (data.open_hours !== undefined) body.open_hours = data.open_hours;
    if (data.image !== undefined) body.image = data.image;
    if (data.facilities !== undefined) body.facilities = data.facilities;
    const json = await request('PUT', `/admin/rooms/${id}`, body);
    return { ...json, data: mapRoom(json.data) };
  },

  async deleteRoom(id) {
    return request('DELETE', `/admin/rooms/${id}`);
  },

  async getAllBookings(params = {}) {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.date_from) qs.set('date_from', params.date_from);
    if (params.date_to) qs.set('date_to', params.date_to);
    if (params.room_id) qs.set('room_id', params.room_id);
    const path = `/admin/bookings${qs.toString() ? '?' + qs.toString() : ''}`;
    const json = await request('GET', path);
    return { ...json, data: (json.data || []).map(mapBooking) };
  },
};

window.api = api;
