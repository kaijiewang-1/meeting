<<<<<<< HEAD
// 会议室预定系统 - API 客户端
// - Flask 单端口（:5000）或公网 HTTPS 同源：使用当前 origin + /api
// - 本地 python -m http.server 8080 / Live Server 等：请求发到 127.0.0.1:5000/api（避免 /api 被静态服务器当成文件路径 404）
// - 强制覆盖：localStorage.setItem('MEETING_API_BASE','https://xxx/api')
const API_BASE = (() => {
  try {
    const override = localStorage.getItem('MEETING_API_BASE');
    if (override && override.trim()) return override.replace(/\/$/, '');
  } catch (e) { /* ignore */ }

  const { hostname, port, protocol, origin } = window.location;
  const o = origin.replace(/\/$/, '');

  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isLanIp = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(hostname);

  if (isLocalHost) {
    if (port === '5000') return `${o}/api`;
    if (port && port !== '5000') return 'http://127.0.0.1:5000/api';
    return `${o}/api`;
  }

  if (isLanIp) {
    if (port === '5000') return `${o}/api`;
    if (port && port !== '5000') return `http://${hostname}:5000/api`;
    return `${o}/api`;
  }

  return `${o}/api`;
})();
=======
// Mock data and API client
const API_BASE = 'http://127.0.0.1:5000/api';
>>>>>>> ce761abf795a0e007b9c5b1a4a554422860fa1ed

// Simulated delay (仅用于 Mock 模式，连接真实后端时不需要)
const delay = (ms = 300) => new Promise(r => setTimeout(r, ms));

// Mock data (仅作为备用，连接真实后端后不使用)
const MOCK_ROOMS = [
  { id: 1, name: '星辰厅', building: '总部大楼', floor: '10F', capacity: 20, facilities: ['projector', 'whiteboard', 'video_conf', 'tv'], status: 'AVAILABLE', description: '大型会议室，配有专业投影设备，适合团队会议和培训', openHours: '08:00-20:00', image: '🌟' },
  { id: 2, name: '海洋厅', building: '总部大楼', floor: '9F', capacity: 12, facilities: ['projector', 'whiteboard', 'tv'], status: 'AVAILABLE', description: '中型会议室，适合部门会议和讨论', openHours: '08:00-20:00', image: '🌊' },
  { id: 3, name: '森林厅', building: '总部大楼', floor: '8F', capacity: 8, facilities: ['whiteboard', 'tv'], status: 'BUSY', description: '小型会议室，适合小组讨论和头脑风暴', openHours: '08:00-20:00', image: '🌲' },
  { id: 4, name: '云端阁', building: '总部大楼', floor: '11F', capacity: 30, facilities: ['projector', 'video_conf', 'whiteboard', 'tv', 'audio'], status: 'AVAILABLE', description: '大型多功能厅，配有视频会议系统和专业音响', openHours: '08:00-22:00', image: '☁️' },
  { id: 5, name: '创意坊', building: '总部大楼', floor: '7F', capacity: 6, facilities: ['whiteboard', 'tv'], status: 'MAINTENANCE', description: '小型创意空间，适合小型讨论和快速会议', openHours: '09:00-18:00', image: '💡' },
  { id: 6, name: '未来厅', building: '分部大楼', floor: '5F', capacity: 16, facilities: ['projector', 'video_conf', 'whiteboard'], status: 'AVAILABLE', description: '中型会议室，配备现代化会议设备', openHours: '08:00-19:00', image: '🚀' },
  { id: 7, name: '阳光房', building: '分部大楼', floor: '3F', capacity: 4, facilities: ['tv'], status: 'AVAILABLE', description: '小型会客室，温馨舒适', openHours: '08:00-18:00', image: '☀️' },
  { id: 8, name: '静思室', building: '总部大楼', floor: '10F', capacity: 2, facilities: [], status: 'AVAILABLE', description: '小型独立空间，适合一对一沟通', openHours: '08:00-20:00', image: '🌙' },
];

const MOCK_BOOKINGS = [
  { id: 1, bookingNo: 'BK20260325001', subject: '产品周例会', roomId: 2, roomName: '海洋厅', organizerId: 1, organizerName: '张明', startTime: '2026-03-25T09:00:00', endTime: '2026-03-25T10:00:00', status: 'BOOKED', checkInStatus: 'PENDING', attendeeCount: 10, remark: '' },
  { id: 2, bookingNo: 'BK20260325002', subject: '技术方案评审', roomId: 1, roomName: '星辰厅', organizerId: 2, organizerName: '李华', startTime: '2026-03-25T14:00:00', endTime: '2026-03-25T16:00:00', status: 'BOOKED', checkInStatus: 'PENDING', attendeeCount: 15, remark: '需要提前准备投影' },
  { id: 3, bookingNo: 'BK20260324001', subject: '客户拜访准备', roomId: 6, roomName: '未来厅', organizerId: 1, organizerName: '张明', startTime: '2026-03-24T10:00:00', endTime: '2026-03-24T11:00:00', status: 'FINISHED', checkInStatus: 'CHECKED_IN', attendeeCount: 5, remark: '' },
  { id: 4, bookingNo: 'BK20260326001', subject: '项目启动会', roomId: 4, roomName: '云端阁', organizerId: 1, organizerName: '张明', startTime: '2026-03-26T09:00:00', endTime: '2026-03-26T12:00:00', status: 'BOOKED', checkInStatus: 'PENDING', attendeeCount: 25, remark: '需提前布置场地' },
  { id: 5, bookingNo: 'BK20260325003', subject: '培训课程', roomId: 1, roomName: '星辰厅', organizerId: 3, organizerName: '王芳', startTime: '2026-03-25T13:00:00', endTime: '2026-03-25T15:00:00', status: 'BOOKED', checkInStatus: 'PENDING', attendeeCount: 18, remark: '新员工入职培训' },
];

const MOCK_STATS = {
  totalRooms: 8,
  availableRooms: 5,
  todayBookings: 4,
  utilizationRate: 62.5,
  weeklyData: [
    { day: '周一', bookings: 12, utilization: 75 },
    { day: '周二', bookings: 18, utilization: 90 },
    { day: '周三', bookings: 15, utilization: 80 },
    { day: '周四', bookings: 20, utilization: 95 },
    { day: '周五', bookings: 14, utilization: 70 },
    { day: '周六', bookings: 5, utilization: 25 },
    { day: '周日', bookings: 3, utilization: 15 },
  ],
  buildingData: [
    { building: '总部大楼', bookings: 45, rate: 72 },
    { building: '分部大楼', bookings: 22, rate: 55 },
  ],
};

// API client
const api = {
  // Auth
  async login(username, password) {
<<<<<<< HEAD
    const res = await fetch(`${API_BASE}/auth/login`, {
=======
    const response = await fetch(`${API_BASE}/auth/login`, {
>>>>>>> ce761abf795a0e007b9c5b1a4a554422860fa1ed
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
<<<<<<< HEAD
    const json = await res.json();
    if (json.code !== 0) {
      throw { code: json.code, message: json.message || '登录失败' };
    }
    return json;
=======
    const result = await response.json();
    if (result.code === 0) {
      return result;
    }
    throw result;
>>>>>>> ce761abf795a0e007b9c5b1a4a554422860fa1ed
  },

  // Rooms
  async getRooms(params = {}) {
<<<<<<< HEAD
    const qs = new URLSearchParams();
    if (params.building) qs.set('building', params.building);
    if (params.floor) qs.set('floor', params.floor);
    if (params.capacity) qs.set('capacity', params.capacity);
    if (params.status) qs.set('status', params.status);
    if (params.date) qs.set('date', params.date);
    if (params.startTime) qs.set('startTime', params.startTime);
    if (params.endTime) qs.set('endTime', params.endTime);
    if (params.facilities && params.facilities.length) {
      params.facilities.forEach(f => qs.append('facilities', f));
    }
    const path = `/rooms${qs.toString() ? '?' + qs.toString() : ''}`;
    const json = await request('GET', path);
    return { ...json, data: (json.data || []).map(mapRoom) };
  },

  async getAvailableRooms(params = {}) {
    const qs = new URLSearchParams();
    if (params.date) qs.set('date', params.date);
    if (params.startTime) qs.set('startTime', params.startTime);
    if (params.endTime) qs.set('endTime', params.endTime);
    if (params.capacity) qs.set('capacity', params.capacity);
    if (params.building) qs.set('building', params.building);
    if (params.floor) qs.set('floor', params.floor);
=======
    const queryParams = new URLSearchParams();
    if (params.building) queryParams.append('building', params.building);
    if (params.floor) queryParams.append('floor', params.floor);
    if (params.capacity) queryParams.append('capacity', params.capacity);
    if (params.status) queryParams.append('status', params.status);
    if (params.facilities && params.facilities.length) {
      params.facilities.forEach(f => queryParams.append('facilities', f));
    }
    
    const url = `${API_BASE}/rooms?${queryParams.toString()}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${auth.getToken()}` }
    });
    return response.json();
  },

  async getAvailableRooms(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.date) queryParams.append('date', params.date);
    if (params.startTime) queryParams.append('startTime', params.startTime);
    if (params.endTime) queryParams.append('endTime', params.endTime);
    if (params.capacity) queryParams.append('capacity', params.capacity);
    if (params.building) queryParams.append('building', params.building);
    if (params.floor) queryParams.append('floor', params.floor);
>>>>>>> ce761abf795a0e007b9c5b1a4a554422860fa1ed
    if (params.facilities && params.facilities.length) {
      params.facilities.forEach(f => queryParams.append('facilities', f));
    }
    
    const url = `${API_BASE}/rooms/available?${queryParams.toString()}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${auth.getToken()}` }
    });
    return response.json();
  },

  async getRoom(id) {
    const response = await fetch(`${API_BASE}/rooms/${id}`, {
      headers: { 'Authorization': `Bearer ${auth.getToken()}` }
    });
    return response.json();
  },

  async getRoomSchedule(id, date) {
    const response = await fetch(`${API_BASE}/rooms/${id}/schedule?date=${date}`, {
      headers: { 'Authorization': `Bearer ${auth.getToken()}` }
    });
    return response.json();
  },

  // Bookings
  async getMyBookings(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    
    const url = `${API_BASE}/bookings/my?${queryParams.toString()}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${auth.getToken()}` }
    });
    return response.json();
  },

  async createBooking(data) {
    const response = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.getToken()}`
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async cancelBooking(id) {
    const response = await fetch(`${API_BASE}/bookings/${id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.getToken()}`
      },
    });
    return response.json();
  },

  async checkIn(id) {
    const response = await fetch(`${API_BASE}/bookings/${id}/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.getToken()}`
      },
    });
    return response.json();
  },

  // Stats
  async getStats() {
    const response = await fetch(`${API_BASE}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${auth.getToken()}` }
    });
    return response.json();
  },

  // Admin
  async getAdminRooms() {
    const response = await fetch(`${API_BASE}/admin/rooms`, {
      headers: { 'Authorization': `Bearer ${auth.getToken()}` }
    });
    return response.json();
  },

  async updateRoom(id, data) {
<<<<<<< HEAD
    const body = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.building !== undefined) body.building = data.building;
    if (data.floor !== undefined) body.floor = data.floor;
    if (data.capacity !== undefined) body.capacity = data.capacity;
    if (data.status !== undefined) body.status = data.status;
    if (data.description !== undefined) body.description = data.description;
    if (data.open_hours !== undefined) body.open_hours = data.open_hours;
    if (data.openHours !== undefined) body.open_hours = data.openHours;
    if (data.image !== undefined) body.image = data.image;
    if (data.facilities !== undefined) body.facilities = data.facilities;
    const json = await request('PUT', `/admin/rooms/${id}`, body);
    return { ...json, data: mapRoom(json.data) };
=======
    const response = await fetch(`${API_BASE}/admin/rooms/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.getToken()}`
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async createRoom(data) {
    const response = await fetch(`${API_BASE}/admin/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.getToken()}`
      },
      body: JSON.stringify(data),
    });
    return response.json();
>>>>>>> ce761abf795a0e007b9c5b1a4a554422860fa1ed
  },

  async deleteRoom(id) {
    const response = await fetch(`${API_BASE}/admin/rooms/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${auth.getToken()}`
      },
    });
    return response.json();
  },

  async getAllBookings() {
    const response = await fetch(`${API_BASE}/admin/bookings`, {
      headers: { 'Authorization': `Bearer ${auth.getToken()}` }
    });
    return response.json();
  },
};

window.api = api;
window.MOCK_BOOKINGS = MOCK_BOOKINGS;
window.MOCK_ROOMS = MOCK_ROOMS;