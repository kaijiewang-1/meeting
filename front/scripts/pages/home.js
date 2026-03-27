// Home / Dashboard page
export default async function init() {
  App.renderLayout();
  App.updateBreadcrumb([{ label: '首页' }]);

  App.setPageView(`
    <div class="page-header">
      <h1 class="page-title">工作台</h1>
      <p class="page-subtitle">欢迎回来，${utils.escapeHtml(auth.getUser()?.name || '')}！今天需要预定会议室吗？</p>
    </div>

    <!-- Quick filter -->
    <div class="filter-bar" style="margin-bottom:24px">
      <div class="filter-item">
        <span class="filter-label">日期</span>
        <input type="date" class="form-input" id="filterDate" value="${utils.today()}" style="min-width:160px">
      </div>
      <div class="filter-item">
        <span class="filter-label">开始时间</span>
        <select class="form-select" id="filterStartTime" style="min-width:120px">
          ${utils.generateTimeSlots(8, 19, 60).map(t => `<option value="${t}">${t}</option>`).join('')}
        </select>
      </div>
      <div class="filter-item">
        <span class="filter-label">结束时间</span>
        <select class="form-select" id="filterEndTime" style="min-width:120px">
          ${utils.generateTimeSlots(9, 20, 60).map(t => `<option value="${t}">${t}</option>`).join('')}
        </select>
      </div>
      <div class="filter-item">
        <span class="filter-label">参会人数</span>
        <select class="form-select" id="filterCapacity" style="min-width:100px">
          <option value="">不限</option>
          ${[2,4,6,8,10,12,15,20,30].map(n => `<option value="${n}">${n}人+</option>`).join('')}
        </select>
      </div>
      <div class="filter-actions">
        <button class="btn btn-primary" onclick="HomePage.searchRooms()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          查找空闲会议室
        </button>
      </div>
    </div>

    <!-- Stats row -->
    <div class="grid-4" style="margin-bottom:24px" id="statsRow">
      ${App.renderSkeleton('card', 4)}
    </div>

    <!-- Today's meetings + recommended rooms -->
    <div class="grid-2" style="margin-bottom:24px">
      <div class="card">
        <div class="card-header">
          <span class="card-title">今日我的会议</span>
          <a href="#/bookings/my" class="btn btn-ghost btn-sm">查看全部</a>
        </div>
        <div class="card-body" id="todayMeetings">
          ${App.renderSkeleton('table', 3)}
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">当前空闲会议室</span>
          <a href="#/rooms" class="btn btn-ghost btn-sm">查看全部</a>
        </div>
        <div class="card-body" id="availableRooms">
          ${App.renderSkeleton('card', 3)}
        </div>
      </div>
    </div>

    <!-- Announcements -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">系统公告</span>
      </div>
      <div class="card-body">
        <div style="display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--color-warning-bg);border-radius:var(--radius-md);border-left:3px solid var(--color-warning)">
            <span class="badge badge-warning">维护</span>
            <div>
              <div style="font-weight:600;font-size:13px;margin-bottom:2px">森林厅临时维护通知</div>
              <div style="font-size:12px;color:var(--color-text-secondary)">森林厅将于3月27日（周五）14:00-18:00进行设备维护，届时不可预定。</div>
            </div>
            <span style="font-size:11px;color:var(--color-text-tertiary);margin-left:auto;white-space:nowrap">2026-03-25</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--color-primary-light);border-radius:var(--radius-md);border-left:3px solid var(--color-primary)">
            <span class="badge badge-primary">通知</span>
            <div>
              <div style="font-weight:600;font-size:13px;margin-bottom:2px">会议室预定系统全新上线</div>
              <div style="font-size:12px;color:var(--color-text-secondary)">新版会议室预定系统支持实时冲突检测、日历视图和移动端适配，欢迎使用！</div>
            </div>
            <span style="font-size:11px;color:var(--color-text-tertiary);margin-left:auto;white-space:nowrap">2026-03-20</span>
          </div>
        </div>
      </div>
    </div>
  `);

  // Load data
  loadStats();
  loadTodayMeetings();
  loadAvailableRooms();

  window.HomePage = {
    searchRooms() {
      const date = document.getElementById('filterDate').value;
      const startTime = document.getElementById('filterStartTime').value;
      const endTime = document.getElementById('filterEndTime').value;
      const capacity = document.getElementById('filterCapacity').value;
      router.navigate(`/rooms?date=${date}&start=${startTime}&end=${endTime}&capacity=${capacity}`);
    }
  };
}

async function loadStats() {
  try {
    const res = await api.getStats();
    const s = res.data;
    const el = document.getElementById('statsRow');
    if (!el) return;
    el.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--color-primary-light);color:var(--color-primary)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <div class="stat-card-value">${s.totalRooms}</div>
        <div class="stat-card-label">会议室总数</div>
        <div class="stat-card-trend up">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
          全楼分布
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--color-available-bg);color:var(--color-available)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div class="stat-card-value">${s.availableRooms}</div>
        <div class="stat-card-label">当前空闲</div>
        <div class="stat-card-trend up" style="color:var(--color-available)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
          可立即预定
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--color-booked-bg);color:var(--color-booked)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <div class="stat-card-value">${s.todayBookings}</div>
        <div class="stat-card-label">今日预定</div>
        <div class="stat-card-trend" style="color:var(--color-booked)">
          会议进行中
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--color-busy-bg);color:var(--color-busy)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </div>
        <div class="stat-card-value">${s.utilizationRate}%</div>
        <div class="stat-card-label">今日利用率</div>
        <div class="stat-card-trend up">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
          近7日平均
        </div>
      </div>
    `;
  } catch (e) {
    console.error('Failed to load stats', e);
  }
}

async function loadTodayMeetings() {
  try {
    const res = await api.getMyBookings({ status: 'active' });
    const bookings = res.data;
    const el = document.getElementById('todayMeetings');
    if (!el) return;
    if (!bookings.length) {
      el.innerHTML = `
        <div class="empty-state" style="padding:32px 16px">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div class="empty-state-desc">今日暂无预定会议</div>
          <a href="#/bookings/new" class="btn btn-primary btn-sm">立即预定</a>
        </div>
      `;
      return;
    }
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px">
        ${bookings.map(b => `
          <div style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--color-bg);border-radius:var(--radius-md)">
            <div style="width:4px;height:40px;background:var(--color-primary);border-radius:2px;flex-shrink:0"></div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:13px;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${utils.escapeHtml(b.subject)}</div>
              <div style="font-size:12px;color:var(--color-text-secondary)">
                ${utils.formatTime(b.startTime)} - ${utils.formatTime(b.endTime)} · ${utils.escapeHtml(b.roomName)}
              </div>
            </div>
            <span class="tag ${utils.statusTag(b.status)}">${utils.statusLabel(b.status)}</span>
          </div>
        `).join('')}
      </div>
    `;
  } catch (e) {
    console.error('Failed to load today meetings', e);
  }
}

async function loadAvailableRooms() {
  try {
    const res = await api.getAvailableRooms({});
    const rooms = res.data.slice(0, 3);
    const el = document.getElementById('availableRooms');
    if (!el) return;
    if (!rooms.length) {
      el.innerHTML = `
        <div class="empty-state" style="padding:32px 16px">
          <div class="empty-state-desc">暂无空闲会议室</div>
        </div>
      `;
      return;
    }
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px">
        ${rooms.map(r => `
          <div style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--color-bg);border-radius:var(--radius-md);cursor:pointer"
               onclick="router.navigate('/rooms/${r.id}')">
            <div style="width:40px;height:40px;border-radius:var(--radius-md);background:var(--color-primary-light);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">
              ${r.image}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:13px;margin-bottom:2px">${utils.escapeHtml(r.name)}</div>
              <div style="font-size:12px;color:var(--color-text-secondary)">${utils.escapeHtml(r.building)} · ${utils.escapeHtml(r.floor)} · ${r.capacity}人</div>
            </div>
            <span class="tag tag-available">空闲</span>
          </div>
        `).join('')}
      </div>
    `;
  } catch (e) {
    console.error('Failed to load available rooms', e);
  }
}
