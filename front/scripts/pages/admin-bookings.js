// Admin - Booking records
export default async function init() {
  if (!auth.isAdmin()) {
    Toast.error('无权限访问');
    router.navigate('/home');
    return;
  }

  App.renderLayout();
  App.updateBreadcrumb([
    { label: '首页', href: '#/home' },
    { label: '管理端', href: '#/admin/stats' },
    { label: '预定记录' },
  ]);

  App.setPageView(`
    <div class="page-header">
      <h1 class="page-title">预定记录</h1>
      <p class="page-subtitle">查看和管理所有用户的会议室预定</p>
    </div>

    <div class="filter-bar" style="margin-bottom:20px">
      <div class="filter-item">
        <span class="filter-label">日期范围</span>
        <input type="date" class="form-input" id="filterDateFrom" value="" style="min-width:150px" title="留空则查询全部日期">
      </div>
      <div class="filter-item">
        <span class="filter-label">状态</span>
        <select class="form-select" id="filterStatus" style="min-width:130px">
          <option value="">全部状态</option>
          <option value="BOOKED">已预定</option>
          <option value="CHECKED_IN">已签到</option>
          <option value="FINISHED">已完成</option>
          <option value="CANCELED">已取消</option>
          <option value="EXPIRED">已过期</option>
        </select>
      </div>
      <div class="filter-actions">
        <button class="btn btn-primary" onclick="AdminBookingsPage.search()">查询</button>
      </div>
    </div>

    <div class="card">
      <div class="card-body" id="adminBookingsContent">
        ${App.renderSkeleton('table', 5)}
      </div>
    </div>
  `);

  window.AdminBookingsPage = {
    async search() { await loadAdminBookings(); },
    viewDetail(id) {
      Toast.info(`预定 ID: ${id}，详情功能开发中`);
    },
    async cancel(id) {
      if (!confirm('确定要取消该预定吗？')) return;
      try {
        await api.cancelBooking(id);
        Toast.success('已取消预定');
        await loadAdminBookings();
      } catch (e) {
        Toast.error(e.message || '取消失败');
      }
    }
  };
  await loadAdminBookings();
}

async function loadAdminBookings() {
  const content = document.getElementById('adminBookingsContent');
  if (!content) return;
  content.innerHTML = App.renderSkeleton('table', 5);

  try {
    const dateFrom = document.getElementById('filterDateFrom')?.value;
    const dateTo = document.getElementById('filterDateTo')?.value;
    const status = document.getElementById('filterStatus')?.value;
    const res = await api.getAllBookings({
      date_from: dateFrom || undefined,
      date_to: dateTo || dateFrom || undefined,
      status: status || undefined,
    });
    const bookings = res.data;

    content.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>预定编号</th>
              <th>会议主题</th>
              <th>会议室</th>
              <th>预定人</th>
              <th>时间</th>
              <th>人数</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${bookings.map(b => `
              <tr>
                <td><code style="font-size:12px;background:var(--color-bg);padding:2px 6px;border-radius:4px">${utils.escapeHtml(b.bookingNo)}</code></td>
                <td>
                  <div style="font-weight:600;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${utils.escapeHtml(b.subject)}">
                    ${utils.escapeHtml(b.subject)}
                  </div>
                  ${b.remark ? `<div style="font-size:11px;color:var(--color-text-tertiary);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${utils.escapeHtml(b.remark)}">${utils.escapeHtml(b.remark)}</div>` : ''}
                </td>
                <td>${utils.escapeHtml(b.roomName || '')}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:6px">
                    <div class="sidebar-avatar" style="width:24px;height:24px;font-size:10px;flex-shrink:0">
                      ${(b.organizerName || 'U').charAt(0).toUpperCase()}
                    </div>
                    ${utils.escapeHtml(b.organizerName || '-')}
                  </div>
                </td>
                <td>
                  <div style="font-size:12px">${utils.formatDate(b.startTime)}</div>
                  <div style="font-size:12px;color:var(--color-text-tertiary)">${utils.formatTime(b.startTime)} - ${utils.formatTime(b.endTime)}</div>
                </td>
                <td>${b.attendeeCount || 1}人</td>
                <td><span class="tag ${utils.statusTag(b.status)}">${utils.statusLabel(b.status)}</span></td>
                <td>
                  <div style="display:flex;gap:6px">
                    <button class="btn btn-secondary btn-sm" onclick="AdminBookingsPage.viewDetail(${b.id})">查看</button>
                    ${b.status !== 'CANCELED' && b.status !== 'FINISHED' ? `
                      <button class="btn btn-danger btn-sm" onclick="AdminBookingsPage.cancel(${b.id})">取消</button>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div style="padding:12px 16px;border-top:1px solid var(--color-border);font-size:13px;color:var(--color-text-secondary)">
        共 ${bookings.length} 条记录
      </div>
    `;
  } catch (e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-state-title">加载失败</div></div>`;
  }
}
