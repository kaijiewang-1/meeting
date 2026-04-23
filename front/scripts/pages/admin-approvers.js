// Admin - Approver management
export default async function init() {
  if (!auth.isAdmin()) {
    Toast.error('无权限访问');
    router.navigate('/admin/bookings');
    return;
  }

  App.renderLayout();
  App.updateBreadcrumb([
    { label: '管理端', href: '#/admin/rooms' },
    { label: '审批员管理' },
  ]);

  App.setPageView(`
    <div class="page-header">
      <div class="page-header-toolbar">
        <div class="page-header-titles">
          <h1 class="page-title">审批员管理</h1>
          <p class="page-subtitle">管理员可将普通用户设为审批员，或取消审批员身份。管理员账号本身不可在此修改。</p>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-body">
        <div id="approverUsersTable">${App.renderSkeleton('table', 1)}</div>
      </div>
    </div>
  `);

  await loadUsers();

  window.AdminApproversPage = {
    updateRole,
  };
}

async function loadUsers() {
  const root = document.getElementById('approverUsersTable');
  if (!root) return;

  try {
    const res = await api.getAdminUsers();
    const users = Array.isArray(res.data) ? res.data : [];
    if (!users.length) {
      root.innerHTML = '<div class="empty-state">暂无可管理账号</div>';
      return;
    }

    root.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>姓名</th>
              <th>用户名</th>
              <th>邮箱</th>
              <th>学院</th>
              <th>当前角色</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${users.map((user) => {
              const role = String(user.role || '').toUpperCase();
              const roleLabel = role === 'ADMIN' ? '管理员' : role === 'APPROVER' ? '审批员' : '普通用户';
              const action = role === 'ADMIN'
                ? '<span class="tag tag-primary">系统管理员</span>'
                : role === 'APPROVER'
                  ? `<button type="button" class="btn btn-secondary btn-sm" onclick="AdminApproversPage.updateRole(${user.id}, 'USER')">取消审批员</button>`
                  : `<button type="button" class="btn btn-primary btn-sm" onclick="AdminApproversPage.updateRole(${user.id}, 'APPROVER')">设为审批员</button>`;
              return `
                <tr>
                  <td>${utils.escapeHtml(user.name || '-')}</td>
                  <td><code style="font-size:12px;background:var(--color-bg);padding:2px 6px;border-radius:4px">${utils.escapeHtml(user.username || '-')}</code></td>
                  <td>${utils.escapeHtml(user.email || '-')}</td>
                  <td>${utils.escapeHtml(user.college_code || '-')}</td>
                  <td><span class="tag ${role === 'ADMIN' ? 'tag-primary' : role === 'APPROVER' ? 'tag-warning' : 'tag-neutral'}">${roleLabel}</span></td>
                  <td>${action}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    root.innerHTML = '<div class="empty-state">加载失败，请稍后重试</div>';
    Toast.error(e.message || '加载账号列表失败');
  }
}

async function updateRole(userId, role) {
  const actionLabel = role === 'APPROVER' ? '设为审批员' : '取消审批员';
  if (!window.confirm(`确定要${actionLabel}吗？`)) return;
  try {
    await api.updateAdminUserRole(userId, role);
    Toast.success('角色更新成功');
    await loadUsers();
  } catch (e) {
    Toast.error(e.message || '角色更新失败');
  }
}
