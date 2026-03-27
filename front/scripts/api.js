// Mock data and API client
const API_BASE = '/api';

// Simulated delay
const delay = (ms = 300) => new Promise(r => setTimeout(r, ms));

// Mock data
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
    await delay(400);
    if (username && password) {
      const isAdmin = username === 'admin';
      return {
        code: 0,
        message: '登录成功',
        data: {
          token: 'mock_jwt_token_' + Date.now(),
          user: { id: isAdmin ? 999 : 1, username, name: username === 'admin' ? '系统管理员' : '张明', email: `${username}@company.com`, avatar: null },
          role: isAdmin ? 'admin' : 'user',
        },
      };
    }
    throw { code: 401, message: '用户名或密码错误' };
  },

  // Rooms
  async getRooms(params = {}) {
    await delay(300);
    let rooms = [...MOCK_ROOMS];
    if (params.building) rooms = rooms.filter(r => r.building === params.building);
    if (params.floor) rooms = rooms.filter(r => r.floor === params.floor);
    if (params.capacity) rooms = rooms.filter(r => r.capacity >= parseInt(params.capacity));
    if (params.facilities && params.facilities.length) {
      rooms = rooms.filter(r => params.facilities.every(f => r.facilities.includes(f)));
    }
    if (params.status) rooms = rooms.filter(r => r.status === params.status);
    return { code: 0, message: 'success', data: rooms, total: rooms.length };
  },

  async getAvailableRooms(params = {}) {
    await delay(300);
    const rooms = MOCK_ROOMS.filter(r => r.status === 'AVAILABLE');
    let filtered = [...rooms];
    if (params.capacity) filtered = filtered.filter(r => r.capacity >= parseInt(params.capacity));
    if (params.building) filtered = filtered.filter(r => r.building === params.building);
    if (params.facilities && params.facilities.length) {
      filtered = filtered.filter(r => params.facilities.every(f => r.facilities.includes(f)));
    }
    return { code: 0, message: 'success', data: filtered, total: filtered.length };
  },

  async getRoom(id) {
    await delay(200);
    const room = MOCK_ROOMS.find(r => r.id === parseInt(id));
    if (!room) throw { code: 404, message: '会议室不存在' };
    return { code: 0, message: 'success', data: room };
  },

  async getRoomSchedule(id, date) {
    await delay(300);
    const dayBookings = MOCK_BOOKINGS.filter(b => {
      const bDate = b.startTime.split('T')[0];
      return b.roomId === parseInt(id) && bDate === date && b.status !== 'CANCELED';
    });
    return { code: 0, message: 'success', data: dayBookings };
  },

  // Bookings
  async getMyBookings(params = {}) {
    await delay(300);
    const userId = auth.getUser()?.id || 1;
    let bookings = MOCK_BOOKINGS.filter(b => b.organizerId === userId || auth.isAdmin());
    if (params.status) {
      if (params.status === 'active') {
        bookings = bookings.filter(b => ['BOOKED', 'CHECKED_IN', 'IN_USE'].includes(b.status));
      } else {
        bookings = bookings.filter(b => b.status === params.status);
      }
    }
    return { code: 0, message: 'success', data: bookings, total: bookings.length };
  },

  async createBooking(data) {
    await delay(500);
    const conflict = MOCK_BOOKINGS.find(b =>
      b.roomId === data.roomId &&
      ['BOOKED', 'CHECKED_IN', 'IN_USE'].includes(b.status) &&
      b.startTime < data.endTime && b.endTime > data.startTime
    );
    if (conflict) throw { code: 409, message: '该时间段已被其他会议预定' };
    const newBooking = {
      id: Math.max(...MOCK_BOOKINGS.map(b => b.id)) + 1,
      bookingNo: 'BK' + Date.now(),
      subject: data.subject,
      roomId: data.roomId,
      roomName: MOCK_ROOMS.find(r => r.id === data.roomId)?.name || '',
      organizerId: auth.getUser()?.id || 1,
      organizerName: auth.getUser()?.name || '',
      startTime: data.startTime,
      endTime: data.endTime,
      status: 'BOOKED',
      checkInStatus: 'PENDING',
      attendeeCount: data.attendeeCount || 1,
      remark: data.remark || '',
    };
    MOCK_BOOKINGS.push(newBooking);
    return { code: 0, message: '预定成功', data: newBooking };
  },

  async cancelBooking(id) {
    await delay(400);
    const booking = MOCK_BOOKINGS.find(b => b.id === parseInt(id));
    if (!booking) throw { code: 404, message: '预定记录不存在' };
    booking.status = 'CANCELED';
    return { code: 0, message: '已取消预定' };
  },

  async checkIn(id) {
    await delay(300);
    const booking = MOCK_BOOKINGS.find(b => b.id === parseInt(id));
    if (!booking) throw { code: 404, message: '预定记录不存在' };
    booking.checkInStatus = 'CHECKED_IN';
    booking.status = 'CHECKED_IN';
    return { code: 0, message: '签到成功' };
  },

  // Stats
  async getStats() {
    await delay(400);
    return { code: 0, message: 'success', data: MOCK_STATS };
  },

  // Admin
  async getAdminRooms() {
    await delay(300);
    return { code: 0, message: 'success', data: MOCK_ROOMS };
  },

  async updateRoom(id, data) {
    await delay(400);
    const room = MOCK_ROOMS.find(r => r.id === parseInt(id));
    if (!room) throw { code: 404, message: '会议室不存在' };
    Object.assign(room, data);
    return { code: 0, message: '更新成功', data: room };
  },

  async createRoom(data) {
    await delay(500);
    const newRoom = {
      id: Math.max(...MOCK_ROOMS.map(r => r.id)) + 1,
      ...data,
      status: data.status || 'AVAILABLE',
    };
    MOCK_ROOMS.push(newRoom);
    return { code: 0, message: '创建成功', data: newRoom };
  },

  async deleteRoom(id) {
    await delay(300);
    const idx = MOCK_ROOMS.findIndex(r => r.id === parseInt(id));
    if (idx === -1) throw { code: 404, message: '会议室不存在' };
    MOCK_ROOMS.splice(idx, 1);
    return { code: 0, message: '删除成功' };
  },

  async getAllBookings() {
    await delay(300);
    return { code: 0, message: 'success', data: MOCK_BOOKINGS, total: MOCK_BOOKINGS.length };
  },
};

window.api = api;
window.MOCK_BOOKINGS = MOCK_BOOKINGS;
window.MOCK_ROOMS = MOCK_ROOMS;
