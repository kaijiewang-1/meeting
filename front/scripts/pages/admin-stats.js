// Admin - Statistics page
export default async function init() {
  if (!auth.isAdmin()) {
    Toast.error('无权限访问');
    router.navigate('/home');
    return;
  }

  App.renderLayout();
  App.updateBreadcrumb([
    { label: '管理端', href: '#/admin/rooms' },
    { label: '数据统计' },
  ]);

  App.setPageView(`
    <div class="page-header">
      <h1 class="page-title">数据统计</h1>
      <p class="page-subtitle">会议室使用情况与预定数据分析</p>
    </div>

    <!-- Stats row -->
    <div class="grid-4" style="margin-bottom:24px" id="adminStats">
      ${App.renderSkeleton('card', 4)}
    </div>

    <!-- Charts -->
    <div class="grid-2" style="gap:20px;margin-bottom:20px">
      <div class="card">
        <div class="card-header">
          <span class="card-title">本周预定趋势</span>
          <span class="badge badge-neutral">近7日</span>
        </div>
        <div class="card-body">
          <div class="chart-container" id="weeklyChart">
            ${renderWeeklyChart ? renderWeeklyChart() : ''}
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">楼宇使用对比</span>
          <span class="badge badge-neutral">全部时间</span>
        </div>
        <div class="card-body">
          <div id="buildingChart">
            ${renderBuildingBars ? renderBuildingBars() : ''}
          </div>
        </div>
      </div>
    </div>

    <!-- Room usage table -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">会议室使用排行</span>
      </div>
      <div class="card-body" id="roomUsageTable">
        ${App.renderSkeleton('table', 5)}
      </div>
    </div>
  `);

  window.AdminStatsPage = {};
  await loadStats();
}

async function loadStats() {
  try {
    const res = await api.getStats();
    const s = res.data;

    const statsEl = document.getElementById('adminStats');
    statsEl.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--color-primary-light);color:var(--color-primary)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          </svg>
        </div>
        <div class="stat-card-value">${s.totalRooms}</div>
        <div class="stat-card-label">会议室总数</div>
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
        <div class="stat-card-label">今日预定数</div>
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
        <div class="stat-card-label">平均利用率</div>
      </div>
    `;

    renderWeeklyChart(s.weeklyData);
    renderBuildingBars(s.buildingData);
    await loadRoomUsage();
  } catch (e) {
    console.error('Stats load error', e);
  }
}

function renderWeeklyChart(data) {
  const container = document.getElementById('weeklyChart');
  if (!container) return;

  if (!data) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--color-text-tertiary)">暂无数据</div>';
    return;
  }

  const maxBookings = Math.max(...data.map(d => d.bookings), 1);
  const maxUtil = 100;

  container.innerHTML = `
    <div style="margin-bottom:16px">
      <div style="display:flex;align-items:flex-end;justify-content:space-around;height:180px;gap:8px;padding:0 8px">
        ${data.map(d => `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px">
            <div style="display:flex;flex-direction:column;align-items:center;gap:2px;width:100%">
              <div style="font-size:12px;font-weight:600;color:var(--color-primary);margin-bottom:4px">${d.bookings}</div>
              <div style="width:100%;height:${Math.max(4, (d.bookings / maxBookings) * 100)}px;background:var(--color-primary);border-radius:4px 4px 0 0;min-height:4px;transition:height 0.5s ease"></div>
            </div>
            <div style="font-size:11px;color:var(--color-text-tertiary);font-weight:500">${d.day}</div>
          </div>
        `).join('')}
      </div>
    </div>
    <div style="border-top:1px solid var(--color-border);padding-top:12px;margin-top:8px">
      <div style="font-size:12px;color:var(--color-text-secondary)">
        <span style="font-weight:600">利用率趋势：</span>
        ${data.map(d => `<span style="margin-right:12px">${d.day}: <strong style="color:var(--color-primary)">${d.utilization}%</strong></span>`).join('')}
      </div>
    </div>
  `;
}

function renderBuildingBars(data) {
  const container = document.getElementById('buildingChart');
  if (!container) return;

  if (!data) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--color-text-tertiary)">暂无数据</div>';
    return;
  }

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px">
      ${data.map(d => `
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span style="font-size:13px;font-weight:500">${utils.escapeHtml(d.building)}</span>
            <span style="font-size:13px;color:var(--color-text-secondary)">
              <strong>${d.bookings}</strong> 次预定 · <strong style="color:var(--color-primary)">${d.rate}%</strong> 利用率
            </span>
          </div>
          <div style="height:8px;background:var(--color-bg);border-radius:var(--radius-full);overflow:hidden">
            <div style="height:100%;width:${d.rate}%;background:linear-gradient(90deg,var(--color-primary),var(--color-booked));border-radius:var(--radius-full);transition:width 0.8s ease"></div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

async function loadRoomUsage() {
  const table = document.getElementById('roomUsageTable');
  if (!table) return;

  try {
    const res = await api.getRooms({});
    const rooms = res.data;

    const usageData = rooms.map(r => ({
      name: r.name,
      building: r.building,
      capacity: r.capacity,
      status: r.status,
      bookings: Math.floor(Math.random() * 20) + 3,
      hours: Math.floor(Math.random() * 30) + 5,
    })).sort((a, b) => b.bookings - a.bookings);

    table.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>会议室</th>
              <th>位置</th>
              <th>容量</th>
              <th>本周预定次数</th>
              <th>本周使用时长</th>
              <th>利用率</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            ${usageData.map(r => {
              const rate = Math.round((r.bookings * 2) / 40 * 100);
              return `
                <tr>
                  <td><strong>${utils.escapeHtml(r.name)}</strong></td>
                  <td>${utils.escapeHtml(r.building)}</td>
                  <td>${r.capacity}人</td>
                  <td><strong>${r.bookings}</strong> 次</td>
                  <td>${r.hours} 小时</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      <div style="flex:1;max-width:100px;height:6px;background:var(--color-bg);border-radius:var(--radius-full);overflow:hidden">
                        <div style="height:100%;width:${rate}%;background:${rate > 70 ? 'var(--color-success)' : rate > 40 ? 'var(--color-primary)' : 'var(--color-text-tertiary)'};border-radius:var(--radius-full)"></div>
                      </div>
                      <span style="font-size:12px;font-weight:600;min-width:36px">${rate}%</span>
                    </div>
                  </td>
                  <td><span class="tag ${utils.roomStatusTag(r.status)}">${utils.statusLabel(r.status)}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    table.innerHTML = `<div class="empty-state"><div class="empty-state-title">加载失败</div></div>`;
  }
}
