// Meeting room list page
export default async function init() {
  // Parse query params
  const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const defaultDate = params.get('date') || utils.today();
  const defaultStart = params.get('start') || '09:00';
  const defaultEnd = params.get('end') || '10:00';
  const defaultCapacity = params.get('capacity') || '';

  App.renderLayout();
  App.updateBreadcrumb([
    { label: '首页', href: '#/home' },
    { label: '会议室列表' },
  ]);

  App.setPageView(`
    <div class="page-header">
      <h1 class="page-title">会议室列表</h1>
      <p class="page-subtitle">查找并预定适合您的会议室</p>
    </div>

    <div class="filter-bar">
      <div class="filter-item">
        <span class="filter-label">日期</span>
        <input type="date" class="form-input" id="filterDate" value="${defaultDate}" style="min-width:150px">
      </div>
      <div class="filter-item">
        <span class="filter-label">开始时间</span>
        <select class="form-select" id="filterStart" style="min-width:110px">
          ${utils.generateTimeSlots(8, 19, 30).map(t => `<option value="${t}" ${t === defaultStart ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="filter-item">
        <span class="filter-label">结束时间</span>
        <select class="form-select" id="filterEnd" style="min-width:110px">
          ${utils.generateTimeSlots(9, 20, 30).map(t => `<option value="${t}" ${t === defaultEnd ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="filter-item">
        <span class="filter-label">楼宇</span>
        <select class="form-select" id="filterBuilding" style="min-width:130px">
          <option value="">全部楼宇</option>
          <option value="总部大楼">总部大楼</option>
          <option value="分部大楼">分部大楼</option>
        </select>
      </div>
      <div class="filter-item">
        <span class="filter-label">人数</span>
        <select class="form-select" id="filterCapacity" style="min-width:100px">
          <option value="">不限</option>
          ${[2,4,6,8,10,12,15,20,30].map(n => `<option value="${n}" ${defaultCapacity == n ? 'selected' : ''}>${n}+人</option>`).join('')}
        </select>
      </div>
      <div class="filter-item">
        <span class="filter-label">设备</span>
        <select class="form-select" id="filterFacilities" style="min-width:120px">
          <option value="">不限</option>
          <option value="projector">投影仪</option>
          <option value="video_conf">视频会议</option>
          <option value="whiteboard">白板</option>
          <option value="tv">电视</option>
          <option value="audio">音响</option>
        </select>
      </div>
      <div class="filter-item">
        <span class="filter-label">状态</span>
        <select class="form-select" id="filterStatus" style="min-width:110px">
          <option value="">全部状态</option>
          <option value="AVAILABLE">空闲</option>
          <option value="BUSY">使用中</option>
          <option value="MAINTENANCE">维护中</option>
        </select>
      </div>
      <div class="filter-actions">
        <button class="btn btn-ghost btn-sm" onclick="RoomsPage.reset()">重置</button>
        <button class="btn btn-primary" onclick="RoomsPage.search()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          查询
        </button>
      </div>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div style="font-size:14px;color:var(--color-text-secondary)">
        共找到 <strong id="resultCount">-</strong> 个会议室
      </div>
      <div style="display:flex;align-items:center;gap:16px;font-size:13px;color:var(--color-text-secondary)">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="width:8px;height:8px;border-radius:50%;background:var(--color-available);display:inline-block"></span> 空闲
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="width:8px;height:8px;border-radius:50%;background:var(--color-busy);display:inline-block"></span> 使用中
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="width:8px;height:8px;border-radius:50%;background:var(--color-maintenance);display:inline-block"></span> 维护中
        </div>
      </div>
    </div>

    <div class="room-grid" id="roomGrid">
      ${App.renderSkeleton('card', 6)}
    </div>
  `);

  window.RoomsPage = {
    async search() { await loadRooms(); },
    reset() {
      const d = document.getElementById('filterDate');
      if (d) {
        d.value = utils.today();
        document.getElementById('filterStart').value = '09:00';
        document.getElementById('filterEnd').value = '10:00';
        document.getElementById('filterBuilding').value = '';
        document.getElementById('filterCapacity').value = '';
        document.getElementById('filterFacilities').value = '';
        document.getElementById('filterStatus').value = '';
        loadRooms();
      }
    },
    bookRoom(id) {
      router.navigate(`/bookings/new?roomId=${id}`);
    }
  };

  await loadRooms();
}

async function loadRooms() {
  const filters = {
    date: document.getElementById('filterDate')?.value,
    building: document.getElementById('filterBuilding')?.value,
    capacity: document.getElementById('filterCapacity')?.value,
    facilities: document.getElementById('filterFacilities')?.value ? [document.getElementById('filterFacilities').value] : [],
    status: document.getElementById('filterStatus')?.value,
  };

  const grid = document.getElementById('roomGrid');
  const count = document.getElementById('resultCount');
  if (!grid) return;

  grid.innerHTML = App.renderSkeleton('card', 6);

  try {
    const res = await api.getRooms(filters);
    const rooms = res.data;
    if (count) count.textContent = rooms.length;

    if (!rooms.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <div class="empty-state-title">未找到符合条件的会议室</div>
          <div class="empty-state-desc">请尝试调整筛选条件</div>
        </div>
      `;
      return;
    }

    grid.innerHTML = rooms.map(room => {
      const statusBg = {
        AVAILABLE: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        BUSY: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        MAINTENANCE: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
      }[room.status] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

      const statusLabel = {
        AVAILABLE: '空闲',
        BUSY: '使用中',
        MAINTENANCE: '维护中',
      }[room.status] || room.status;

      return `
        <div class="room-card" onclick="router.navigate('/rooms/${room.id}')">
          <div class="room-card-img" style="background:${statusBg}">
            <span class="room-card-img-placeholder">${room.image}</span>
          </div>
          <div class="room-card-body">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:4px">
              <div class="room-card-name">${utils.escapeHtml(room.name)}</div>
              <span class="tag ${utils.roomStatusTag(room.status)}">${statusLabel}</span>
            </div>
            <div class="room-card-location">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              ${utils.escapeHtml(room.building)} · ${utils.escapeHtml(room.floor)}
            </div>
            <div class="room-card-meta">
              <div class="room-card-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                </svg>
                ${room.capacity}人
              </div>
              ${room.facilities.length ? `
              <div class="room-card-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2"/>
                </svg>
                ${room.facilities.length}项设备
              </div>
              ` : ''}
            </div>
            ${room.facilities.length ? `
            <div class="room-card-facilities">
              ${room.facilities.slice(0, 3).map(f => `
                <span class="facility-tag">
                  ${utils.facilityIcon(f)}
                  ${utils.facilityLabel(f)}
                </span>
              `).join('')}
              ${room.facilities.length > 3 ? `<span class="facility-tag">+${room.facilities.length - 3}</span>` : ''}
            </div>
            ` : ''}
            <div class="room-card-actions">
              <button class="btn btn-secondary btn-sm" style="flex:1" onclick="event.stopPropagation();router.navigate('/rooms/${room.id}')">
                查看详情
              </button>
              <button class="btn btn-primary btn-sm" style="flex:1"
                      onclick="event.stopPropagation();RoomsPage.bookRoom(${room.id})"
                      ${room.status !== 'AVAILABLE' ? 'disabled' : ''}>
                立即预定
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-state-title">加载失败</div>
      <div class="empty-state-desc">${utils.escapeHtml(e.message || '请稍后重试')}</div>
    </div>`;
  }
}
