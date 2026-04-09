// My bookings page
export default async function init() {
  App.renderLayout();
  App.updateBreadcrumb([
    { label: '首页', href: '#/home' },
    { label: '我的预定' },
  ]);

  App.setPageView(`
    <div class="page-header">
      <div class="page-header-toolbar bookings-my-header">
        <div class="page-header-titles">
          <h1 class="page-title">我的预定</h1>
          <p class="page-subtitle">查看和管理您的所有会议预定</p>
        </div>
        <div class="page-header-actions">
          <a href="#/bookings/new" class="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            新建预约
          </a>
        </div>
      </div>
    </div>

    <div class="card bookings-my-card" style="margin-bottom:20px">
      <div class="tabs-wrap tabs-wrap--scroll">
        <div class="tabs tabs--bookings">
        <button type="button" class="tab-item active" data-status="" onclick="BookingsMyPage.filter('')">全部</button>
        <button type="button" class="tab-item" data-status="active" onclick="BookingsMyPage.filter('active')">待开始</button>
        <button type="button" class="tab-item" data-status="FINISHED" onclick="BookingsMyPage.filter('FINISHED')">已结束</button>
        <button type="button" class="tab-item" data-status="CANCELED" onclick="BookingsMyPage.filter('CANCELED')">已取消</button>
        </div>
      </div>
      <div class="card-body" id="bookingsList">
        ${App.renderSkeleton('table', 5)}
      </div>
    </div>
  `);

  window.BookingsMyPage = {
    currentFilter: '',
    async filter(status) {
      document.querySelectorAll('.tabs--bookings .tab-item').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-status') === status);
      });
      this.currentFilter = status;
      await loadBookings(status);
    },
    async refresh() {
      await loadBookings(this.currentFilter);
    },
    async checkIn(id) {
      try {
        await api.checkIn(id);
        Toast.success('签到成功');
        await this.refresh();
      } catch (e) {
        Toast.error(e.message || '签到失败');
      }
    },
    async cancel(id) {
      if (!confirm('确定取消该预定？')) return;
      try {
        await api.cancelBooking(id);
        Toast.success('已取消');
        await this.refresh();
      } catch (e) {
        Toast.error(e.message || '取消失败');
      }
    },
    rebook(roomId) {
      router.navigate(`/bookings/new?roomId=${roomId}`);
    },
  };

  await loadBookings('');
}

async function loadBookings(status) {
  const list = document.getElementById('bookingsList');
  if (!list) return;
  list.innerHTML = App.renderSkeleton('table', 5);

  try {
    const res = await api.getMyBookings({ status });
    const bookings = res.data;

    if (!bookings.length) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div class="empty-state-title">暂无预定记录</div>
          <div class="empty-state-desc">开始预定您的第一个会议室吧</div>
          <a href="#/bookings/new" class="btn btn-primary">立即预定</a>
        </div>
      `;
      return;
    }

    list.innerHTML = `
      <div class="table-wrapper bookings-list-wrap">
        <table class="bookings-my-table">
          <thead>
            <tr>
              <th>预定编号</th>
              <th>会议主题</th>
              <th>会议室</th>
              <th>时间</th>
              <th>状态</th>
              <th>签到状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${bookings.map(b => {
              const isPast = new Date(b.endTime) < new Date();
              const isOngoing = new Date(b.startTime) <= new Date() && new Date(b.endTime) >= new Date();
              const canCancel = ['BOOKED', 'CHECKED_IN'].includes(b.status);
              const canCheckIn = b.status === 'BOOKED' && new Date(b.startTime) <= new Date(new Date().getTime() + 15 * 60000);

              return `
                <tr>
                  <td data-label="预定编号"><code style="font-family:var(--font-mono);font-size:12px;background:var(--color-bg);padding:2px 6px;border-radius:4px">${utils.escapeHtml(b.bookingNo)}</code></td>
                  <td data-label="会议主题">
                    <div style="font-weight:600;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${utils.escapeHtml(b.subject)}">
                      ${utils.escapeHtml(b.subject)}
                    </div>
                    ${b.attendeeCount ? `<div style="font-size:12px;color:var(--color-text-tertiary)">${b.attendeeCount}人参会</div>` : ''}
                  </td>
                  <td data-label="会议室">
                    <div style="font-weight:500">${utils.escapeHtml(b.roomName)}</div>
                  </td>
                  <td data-label="时间">
                    <div style="font-size:13px">${utils.formatDate(b.startTime)}</div>
                    <div style="font-size:12px;color:var(--color-text-tertiary)">${utils.formatTime(b.startTime)} - ${utils.formatTime(b.endTime)}</div>
                  </td>
                  <td data-label="状态"><span class="tag ${utils.statusTag(b.status)}">${utils.statusLabel(b.status)}</span></td>
                  <td data-label="签到">
                    ${b.status === 'BOOKED' && !canCheckIn ? `<span class="tag tag-neutral">待签到</span>` : ''}
                    ${b.checkInStatus === 'CHECKED_IN' || b.status === 'CHECKED_IN' ? `<span class="tag tag-success">已签到</span>` : ''}
                    ${b.status === 'FINISHED' ? `<span class="tag tag-neutral">已完成</span>` : ''}
                    ${b.status === 'CANCELED' ? `<span class="tag tag-danger">已取消</span>` : ''}
                  </td>
                  <td class="actions-cell" data-label="操作">
                    <div class="bookings-actions-row">
                      ${b.status === 'BOOKED' && canCheckIn ? `
                        <button class="btn btn-success btn-sm" onclick="BookingsMyPage.checkIn(${b.id})">签到</button>
                      ` : ''}
                      ${b.status === 'BOOKED' ? `
                        <button class="btn btn-ghost btn-sm" onclick="router.navigate('/rooms/${b.roomId}')">查看会议室</button>
                      ` : ''}
                      ${b.status === 'BOOKED' ? `
                        <button class="btn btn-secondary btn-sm" onclick="BookingsMyPage.rebook(${b.roomId})">再次预定</button>
                      ` : ''}
                      ${canCancel ? `
                        <button class="btn btn-danger btn-sm" onclick="BookingsMyPage.cancel(${b.id})">取消</button>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-state-title">加载失败</div>
      <div class="empty-state-desc">${utils.escapeHtml(e.message || '请稍后重试')}</div>
      <button class="btn btn-secondary" onclick="BookingsMyPage.refresh()">重试</button>
    </div>`;
  }
}
