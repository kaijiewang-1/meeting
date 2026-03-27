// Admin - Meeting room management
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
    { label: '会议室管理' },
  ]);

  App.setPageView(`
    <div class="page-header">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <h1 class="page-title">会议室管理</h1>
          <p class="page-subtitle">新增、编辑、停用会议室基础信息</p>
        </div>
        <button class="btn btn-primary" onclick="AdminRoomsPage.showAddModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          新增会议室
        </button>
      </div>
    </div>

    <div class="card">
      <div class="card-body" id="adminRoomsContent">
        ${App.renderSkeleton('table', 8)}
      </div>
    </div>
  `);

  window.AdminRoomsPage = {
    async changeStatus(id, status) {
      try {
        await api.updateRoom(id, { status });
        Toast.success('状态已更新');
      } catch (e) {
        Toast.error(e.message || '更新失败');
        loadAdminRooms();
      }
    },
    showAddModal() {
      showModal('新增会议室');
    },
    async showEditModal(id) {
      try {
        const res = await api.getRoom(id);
        showModal('编辑会议室', res.data);
      } catch (e) {
        Toast.error('加载失败');
      }
    },
    async save(id) {
      const name = document.getElementById('m_name').value.trim();
      const building = document.getElementById('m_building').value;
      const floor = document.getElementById('m_floor').value.trim();
      const capacity = parseInt(document.getElementById('m_capacity').value);
      const openHours = document.getElementById('m_hours').value.trim();
      const description = document.getElementById('m_desc').value.trim();
      const facilities = ['projector', 'whiteboard', 'video_conf', 'tv', 'audio']
        .filter(f => document.getElementById(`m_facility_${f}`)?.checked);

      if (!name || !floor || !capacity) {
        Toast.error('请填写必填项');
        return;
      }

      const data = { name, building, floor, capacity, openHours, description, facilities };
      try {
        if (id) {
          await api.updateRoom(id, data);
          Toast.success('修改成功');
        } else {
          await api.createRoom(data);
          Toast.success('创建成功');
        }
        document.getElementById('roomModal')?.remove();
        await loadAdminRooms();
      } catch (e) {
        Toast.error(e.message || '操作失败');
      }
    },
    async deleteRoom(id, name) {
      if (!confirm(`确定要删除会议室"${name}"吗？此操作不可恢复。`)) return;
      try {
        await api.deleteRoom(id);
        Toast.success('删除成功');
        await loadAdminRooms();
      } catch (e) {
        Toast.error(e.message || '删除失败');
      }
    }
  };
  await loadAdminRooms();
}

async function loadAdminRooms() {
  const content = document.getElementById('adminRoomsContent');
  if (!content) return;
  content.innerHTML = App.renderSkeleton('table', 8);

  try {
    const res = await api.getAdminRooms();
    const rooms = res.data;

    content.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>会议室</th>
              <th>位置</th>
              <th>容量</th>
              <th>设备</th>
              <th>开放时间</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${rooms.map(r => `
              <tr>
                <td><code style="font-size:12px;background:var(--color-bg);padding:2px 6px;border-radius:4px">#${r.id}</code></td>
                <td>
                  <div style="display:flex;align-items:center;gap:8px">
                    <div style="width:32px;height:32px;border-radius:8px;background:var(--color-primary-light);
                                display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">
                      ${r.image}
                    </div>
                    <div>
                      <div style="font-weight:600">${utils.escapeHtml(r.name)}</div>
                      <div style="font-size:11px;color:var(--color-text-tertiary)">${utils.escapeHtml(r.description || '').substring(0, 30)}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style="font-size:13px">${utils.escapeHtml(r.building)}</div>
                  <div style="font-size:12px;color:var(--color-text-tertiary)">${utils.escapeHtml(r.floor)}</div>
                </td>
                <td><strong>${r.capacity}人</strong></td>
                <td>
                  <div style="display:flex;flex-wrap:wrap;gap:4px">
                    ${r.facilities.slice(0, 2).map(f => `<span class="facility-tag" style="font-size:10px;padding:1px 6px">${utils.facilityLabel(f)}</span>`).join('')}
                    ${r.facilities.length > 2 ? `<span style="font-size:10px;color:var(--color-text-tertiary)">+${r.facilities.length - 2}</span>` : ''}
                    ${!r.facilities.length ? '<span style="font-size:12px;color:var(--color-text-tertiary)">-</span>' : ''}
                  </div>
                </td>
                <td style="font-size:13px;color:var(--color-text-secondary)">${utils.escapeHtml(r.openHours || '-')}</td>
                <td>
                  <select class="form-select" style="width:120px;padding:4px 8px;font-size:12px"
                          onchange="AdminRoomsPage.changeStatus(${r.id}, this.value)">
                    <option value="AVAILABLE" ${r.status === 'AVAILABLE' ? 'selected' : ''}>空闲</option>
                    <option value="BUSY" ${r.status === 'BUSY' ? 'selected' : ''}>使用中</option>
                    <option value="MAINTENANCE" ${r.status === 'MAINTENANCE' ? 'selected' : ''}>维护中</option>
                  </select>
                </td>
                <td>
                  <div style="display:flex;gap:6px">
                    <button class="btn btn-secondary btn-sm" onclick="AdminRoomsPage.showEditModal(${r.id})">编辑</button>
                    <button class="btn btn-danger btn-sm" onclick="AdminRoomsPage.deleteRoom(${r.id}, '${utils.escapeHtml(r.name)}')">删除</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-state-title">加载失败</div><div class="empty-state-desc">${utils.escapeHtml(e.message || '')}</div></div>`;
  }
}

function showModal(title, room = null) {
  const existing = document.getElementById('roomModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'roomModal';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">${title}</span>
        <button class="modal-close" onclick="document.getElementById('roomModal').remove()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">名称 <span style="color:var(--color-danger)">*</span></label>
          <input type="text" id="m_name" class="form-input" placeholder="如：星辰厅" value="${room?.name || ''}" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">楼宇 <span style="color:var(--color-danger)">*</span></label>
            <select id="m_building" class="form-select" required>
              <option value="总部大楼" ${room?.building === '总部大楼' ? 'selected' : ''}>总部大楼</option>
              <option value="分部大楼" ${room?.building === '分部大楼' ? 'selected' : ''}>分部大楼</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">楼层 <span style="color:var(--color-danger)">*</span></label>
            <input type="text" id="m_floor" class="form-input" placeholder="如：10F" value="${room?.floor || ''}" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">容量（人） <span style="color:var(--color-danger)">*</span></label>
            <input type="number" id="m_capacity" class="form-input" placeholder="如：12" value="${room?.capacity || ''}" min="1" required>
          </div>
          <div class="form-group">
            <label class="form-label">开放时间</label>
            <input type="text" id="m_hours" class="form-input" placeholder="如：08:00-20:00" value="${room?.openHours || '08:00-20:00'}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">设备设施</label>
          <div style="display:flex;flex-wrap:wrap;gap:10px;padding:10px 0">
            ${['projector', 'whiteboard', 'video_conf', 'tv', 'audio'].map(f => `
              <label class="checkbox-group" style="font-size:13px">
                <input type="checkbox" value="${f}" id="m_facility_${f}"
                       ${room?.facilities?.includes(f) ? 'checked' : ''}>
                <span>${utils.facilityLabel(f)}</span>
              </label>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">描述</label>
          <textarea id="m_desc" class="form-input" rows="3" placeholder="会议室简要描述">${room?.description || ''}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="document.getElementById('roomModal').remove()">取消</button>
        <button class="btn btn-primary" onclick="AdminRoomsPage.save(${room?.id || 'null'})">
          ${room ? '保存修改' : '创建会议室'}
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}
