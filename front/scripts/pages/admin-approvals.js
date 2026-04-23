// Admin - Approval management page
export default async function init() {
  if (!auth.isStaff()) {
    Toast.error('无权限访问');
    router.navigate('/login');
    return;
  }

  const adminRoot = auth.isAdmin() ? '#/admin/rooms' : '#/admin/bookings';
  App.renderLayout();
  App.updateBreadcrumb([
    { label: '管理端', href: adminRoot },
    { label: '审批管理' },
  ]);

  App.setPageView(`
    <div class="page-header">
      <h1 class="page-title">审批管理</h1>
      <p class="page-subtitle">审批会议室预定申请</p>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">待审批列表</span>
        <span class="badge badge-warning" id="pendingCount">0</span>
      </div>
      <div class="card-body" id="approvalsContent">
        ${App.renderSkeleton('table', 3)}
      </div>
    </div>
  `);

  window.AdminApprovalsPage = {
    async approve(id) {
      if (!confirm('确定通过该预定申请吗？')) return;
      try {
        const res = await fetch(`http://127.0.0.1:5000/api/approvals/${id}/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.getToken()}`
          }
        });
        const data = await res.json();
        if (data.code === 0) {
          Toast.success('审批通过');
          await loadPendingApprovals();
        } else {
          Toast.error(data.message);
        }
      } catch (e) {
        Toast.error('操作失败');
      }
    },
    
    async reject(id) {
      const reason = prompt('请输入拒绝原因：');
      if (reason === null) return;
      try {
        const res = await fetch(`http://127.0.0.1:5000/api/approvals/${id}/reject`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.getToken()}`
          },
          body: JSON.stringify({ reason })
        });
        const data = await res.json();
        if (data.code === 0) {
          Toast.success('已拒绝');
          await loadPendingApprovals();
        } else {
          Toast.error(data.message);
        }
      } catch (e) {
        Toast.error('操作失败');
      }
    },
    
    viewDetail(roomId) {
      router.navigate(`/rooms/${roomId}`);
    }
  };
  
  await loadPendingApprovals();
}

async function loadPendingApprovals() {
  const content = document.getElementById('approvalsContent');
  if (!content) return;
  
  try {
    const res = await fetch('http://127.0.0.1:5000/api/approvals/pending', {
      headers: {
        'Authorization': `Bearer ${auth.getToken()}`
      }
    });
    const data = await res.json();
    const bookings = data.data || [];
    
    document.getElementById('pendingCount').textContent = bookings.length;
    
    if (bookings.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="empty-state-title">暂无待审批申请</div>
          <div class="empty-state-desc">所有预定申请已处理完毕</div>
        </div>
      `;
      return;
    }
    
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
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${bookings.map(b => `
              <tr>
                <td><code>${utils.escapeHtml(b.booking_no)}</code></td>
                <td><strong>${utils.escapeHtml(b.subject)}</strong></td>
                <td>${utils.escapeHtml(b.room_name)}</td>
                <td>${utils.escapeHtml(b.organizer_name)}</td>
                <td>
                  <div>${utils.formatDate(b.start_time)}</div>
                  <div class="text-xs text-tertiary">${utils.formatTime(b.start_time)} - ${utils.formatTime(b.end_time)}</div>
                </td>
                <td>${b.attendee_count}人</td>
                <td>
                  <div style="display:flex;gap:6px;flex-wrap:wrap">
                    <button class="btn btn-success btn-sm" onclick="AdminApprovalsPage.approve(${b.id})">通过</button>
                    <button class="btn btn-danger btn-sm" onclick="AdminApprovalsPage.reject(${b.id})">拒绝</button>
                    <button class="btn btn-secondary btn-sm" onclick="AdminApprovalsPage.viewDetail(${b.room_id})">查看</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    console.error('加载失败', e);
    content.innerHTML = `<div class="empty-state"><div class="empty-state-title">加载失败</div></div>`;
  }
}