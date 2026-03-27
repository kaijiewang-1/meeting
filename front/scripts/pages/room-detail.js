// Meeting room detail page
let currentRoom = null;

export async function init(id) {
  App.renderLayout();
  App.updateBreadcrumb([
    { label: '首页', href: '#/home' },
    { label: '会议室列表', href: '#/rooms' },
    { label: '会议室详情' },
  ]);

  App.setPageView(`
    <div class="page-header">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <h1 class="page-title" id="roomName">加载中...</h1>
          <p class="page-subtitle" id="roomLocation">-</p>
        </div>
        <div style="display:flex;gap:8px">
          <a href="#/rooms" class="btn btn-secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            返回列表
          </a>
          <button class="btn btn-primary" id="bookNowBtn" onclick="RoomDetailPage.bookNow()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            立即预定
          </button>
        </div>
      </div>
    </div>

    <div class="grid-3" style="gap:20px">
      <!-- Left: Info -->
      <div style="grid-column:span 1">
        <div class="card" style="margin-bottom:16px">
          <div class="room-card-img" id="roomImg" style="height:180px;border-radius:var(--radius-lg) var(--radius-lg) 0 0;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
            <span style="font-size:60px;opacity:0.5" id="roomEmoji"></span>
          </div>
          <div class="card-body">
            <div id="roomStatusTag" style="margin-bottom:12px"></div>

            <div class="info-grid" style="gap:12px">
              <div class="info-item">
                <span class="info-label">会议室名称</span>
                <span class="info-value" id="infoName">-</span>
              </div>
              <div class="info-item">
                <span class="info-label">楼宇</span>
                <span class="info-value" id="infoBuilding">-</span>
              </div>
              <div class="info-item">
                <span class="info-label">楼层</span>
                <span class="info-value" id="infoFloor">-</span>
              </div>
              <div class="info-item">
                <span class="info-label">可容纳人数</span>
                <span class="info-value" id="infoCapacity">-</span>
              </div>
              <div class="info-item">
                <span class="info-label">开放时间</span>
                <span class="info-value" id="infoHours">-</span>
              </div>
            </div>

            <div class="divider"></div>

            <div class="section-title">设备设施</div>
            <div class="room-card-facilities" id="roomFacilities" style="margin-bottom:0"></div>

            <div class="divider"></div>

            <div class="section-title">会议室说明</div>
            <p style="font-size:14px;color:var(--color-text-secondary);line-height:1.6" id="roomDesc">-</p>
          </div>
        </div>
      </div>

      <!-- Right: Timeline -->
      <div style="grid-column:span 2">
        <div class="card">
          <div class="card-header">
            <span class="card-title">
              今日排期
              <span style="font-size:12px;font-weight:400;color:var(--color-text-tertiary);margin-left:8px" id="scheduleDate"></span>
            </span>
            <div style="display:flex;align-items:center;gap:8px">
              <input type="date" class="form-input" id="schedulePicker" value="${utils.today()}" style="width:150px;padding:6px 10px;font-size:13px" onchange="RoomDetailPage.loadSchedule()">
            </div>
          </div>
          <div class="card-body">
            <div id="scheduleLegend" style="display:flex;gap:16px;margin-bottom:16px;font-size:12px">
              <div style="display:flex;align-items:center;gap:6px">
                <span style="width:16px;height:10px;border-radius:3px;background:var(--color-booked);display:inline-block"></span> 已预定
              </div>
              <div style="display:flex;align-items:center;gap:6px">
                <span style="width:16px;height:10px;border-radius:3px;background:var(--color-available);display:inline-block"></span> 可用
              </div>
              <div style="display:flex;align-items:center;gap:6px">
                <span style="width:16px;height:10px;border-radius:3px;background:var(--color-maintenance);display:inline-block"></span> 维护
              </div>
            </div>
            <div id="scheduleContent">
              ${App.renderSkeleton('card', 1)}
            </div>
          </div>
        </div>
      </div>
    </div>
  `);

  try {
    const res = await api.getRoom(id);
    currentRoom = res.data;
    renderRoomInfo(currentRoom);
    renderRoomSchedule(id, utils.today());
  } catch (e) {
    Toast.error('会议室信息加载失败');
  }
}

function renderRoomInfo(room) {
  document.getElementById('roomName').textContent = room.name;
  document.getElementById('roomLocation').textContent = `${room.building} · ${room.floor}`;
  document.getElementById('roomEmoji').textContent = room.image;
  document.getElementById('infoName').textContent = room.name;
  document.getElementById('infoBuilding').textContent = room.building;
  document.getElementById('infoFloor').textContent = room.floor;
  document.getElementById('infoCapacity').textContent = `${room.capacity} 人`;
  document.getElementById('infoHours').textContent = room.openHours;
  document.getElementById('roomDesc').textContent = room.description || '暂无说明';

  const statusTag = document.getElementById('roomStatusTag');
  const statusLabel = { AVAILABLE: '空闲', BUSY: '使用中', MAINTENANCE: '维护中' }[room.status] || room.status;
  statusTag.innerHTML = `<span class="tag ${utils.roomStatusTag(room.status)}" style="font-size:13px;padding:4px 12px">${statusLabel}</span>`;

  const facilities = document.getElementById('roomFacilities');
  if (room.facilities && room.facilities.length) {
    facilities.innerHTML = room.facilities.map(f => `
      <span class="facility-tag">
        ${utils.facilityIcon(f)}
        ${utils.facilityLabel(f)}
      </span>
    `).join('');
  } else {
    facilities.innerHTML = '<span style="font-size:13px;color:var(--color-text-tertiary)">暂无设备</span>';
  }

  const bookBtn = document.getElementById('bookNowBtn');
  if (room.status !== 'AVAILABLE') {
    bookBtn.disabled = true;
    bookBtn.textContent = room.status === 'MAINTENANCE' ? '维护中，不可预定' : '使用中';
  }
}

async function renderRoomSchedule(roomId, date) {
  const content = document.getElementById('scheduleContent');
  const dateLabel = document.getElementById('scheduleDate');
  if (dateLabel) dateLabel.textContent = `${utils.formatDate(date)}（${['周日','周一','周二','周三','周四','周五','周六'][new Date(date).getDay()]}）`;

  content.innerHTML = App.renderSkeleton('card', 1);

  try {
    const res = await api.getRoomSchedule(roomId, date);
    const bookings = res.data;

    const slots = utils.generateTimeSlots(8, 20, 30);
    const startMinutes = (h, m) => h * 60 + m;

    content.innerHTML = `
      <div style="overflow-x:auto">
        <div style="display:grid;grid-template-columns:60px repeat(${slots.length},1fr);min-width:600px;gap:4px">
          <div></div>
          ${slots.map(s => {
            const [sh, sm] = s.split(':').map(Number);
            const isBooked = bookings.some(b => {
              const bs = new Date(b.startTime);
              const be = new Date(b.endTime);
              const slotDate = new Date(`${date}T${s}:00`);
              return slotDate >= bs && slotDate < be;
            });
            const booking = bookings.find(b => {
              const bs = new Date(b.startTime);
              const be = new Date(b.endTime);
              const slotDate = new Date(`${date}T${s}:00`);
              return slotDate >= bs && slotDate < be;
            });
            const isSlotStart = booking && new Date(`${date}T${s}:00`).getTime() === new Date(booking.startTime).getTime();

            return `
              <div style="min-height:44px;border-radius:4px;display:flex;align-items:center;justify-content:center;
                          font-size:11px;color:var(--color-text-tertiary);font-weight:500;writing-mode:horizontal-tb;
                          border:1px solid var(--color-border-light)">
                ${s}
              </div>
            `;
          }).join('')}
        </div>
        <div style="display:grid;grid-template-columns:60px repeat(${slots.length},1fr);min-width:600px;gap:4px;margin-top:4px">
          <div style="font-size:11px;color:var(--color-text-tertiary);display:flex;align-items:center;justify-content:center">${slots.length > 0 ? '状态' : ''}</div>
          ${slots.map(s => {
            const [sh, sm] = s.split(':').map(Number);
            const booking = bookings.find(b => {
              const bs = new Date(b.startTime);
              const be = new Date(b.endTime);
              const slotDate = new Date(`${date}T${s}:00`);
              return slotDate >= bs && slotDate < be;
            });
            const isStart = booking && new Date(`${date}T${s}:00`).getTime() === new Date(booking.startTime).getTime();

            if (!booking) {
              return `<div style="min-height:40px;border-radius:4px;background:var(--color-available-bg);
                             border:1px solid var(--color-available);display:flex;align-items:center;justify-content:center;
                             font-size:11px;color:var(--color-available);cursor:pointer"
                             onclick="RoomDetailPage.quickBook('${s}')">空闲</div>`;
            }

            if (isStart) {
              const durationSlots = Math.ceil((new Date(booking.endTime) - new Date(booking.startTime)) / (30 * 60 * 1000));
              return `<div style="min-height:40px;grid-column:span ${Math.min(durationSlots, slots.length)};border-radius:4px;
                             background:var(--color-booked);border:1px solid var(--color-booked);
                             display:flex;flex-direction:column;align-items:center;justify-content:center;
                             padding:2px 6px;cursor:pointer"
                             title="${utils.escapeHtml(booking.subject)} - ${utils.formatTime(booking.startTime)}~${utils.formatTime(booking.endTime)}"
                             onclick="RoomDetailPage.showBookingDetail(${booking.id})">
                        <span style="font-size:11px;font-weight:600;color:white;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;text-align:center">${utils.escapeHtml(booking.subject)}</span>
                        <span style="font-size:10px;color:rgba(255,255,255,0.8)">${utils.formatTime(booking.startTime)}~${utils.formatTime(booking.endTime)}</span>
                      </div>`;
            }

            return `<div style="min-height:40px"></div>`;
          }).join('')}
        </div>
      </div>

      <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--color-border)">
        <div style="font-size:13px;font-weight:600;margin-bottom:10px">今日预定明细</div>
        ${bookings.length === 0
          ? '<div style="font-size:13px;color:var(--color-text-tertiary);text-align:center;padding:20px">今日暂无预定</div>'
          : `<div style="display:flex;flex-direction:column;gap:8px">
               ${bookings.map(b => `
                 <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:var(--color-bg);border-radius:var(--radius-md)">
                   <div style="width:4px;height:32px;background:var(--color-booked);border-radius:2px;flex-shrink:0"></div>
                   <div style="flex:1;min-width:0">
                     <div style="font-weight:600;font-size:13px;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${utils.escapeHtml(b.subject)}</div>
                     <div style="font-size:12px;color:var(--color-text-secondary)">
                       ${utils.formatTime(b.startTime)} - ${utils.formatTime(b.endTime)}
                       · 预定人：${utils.escapeHtml(b.organizerName)}
                     </div>
                   </div>
                   <span class="tag ${utils.statusTag(b.status)}">${utils.statusLabel(b.status)}</span>
                 </div>
               `).join('')}
             </div>`
        }
      </div>
    `;
  } catch (e) {
    content.innerHTML = `<div style="text-align:center;padding:40px;color:var(--color-text-tertiary)">排期加载失败</div>`;
  }
}

window.RoomDetailPage = {
  loadSchedule() {
    const date = document.getElementById('schedulePicker').value;
    if (currentRoom) {
      renderRoomSchedule(currentRoom.id, date);
    }
  },
  quickBook(timeSlot) {
    const date = document.getElementById('schedulePicker').value;
    router.navigate(`/bookings/new?roomId=${currentRoom.id}&date=${date}&start=${timeSlot}`);
  },
  bookNow() {
    if (!currentRoom) return;
    router.navigate(`/bookings/new?roomId=${currentRoom.id}`);
  },
  showBookingDetail(id) {
    Toast.info(`预定ID: ${id}，详情功能开发中`);
  }
};
