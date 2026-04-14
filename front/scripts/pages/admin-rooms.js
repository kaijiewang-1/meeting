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
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div>
          <h1 class="page-title">会议室管理</h1>
          <p class="page-subtitle">新增、编辑、停用会议室基础信息，设置可见学院和审批规则</p>
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
        await loadAdminRooms();
      } catch (e) {
        Toast.error(e.message || '更新失败');
      }
    },
    async showAddModal() {
      await showModal('新增会议室');
    },
    async showEditModal(id) {
      try {
        const res = await api.getRoom(id);
        await showModal('编辑会议室', res.data);
      } catch (e) {
        Toast.error('加载失败');
      }
    },
    async save(id) {
      const name = document.getElementById('m_name').value.trim();
      const building = document.getElementById('m_building').value.trim();
      const floor = document.getElementById('m_floor').value.trim();
      const capacity = parseInt(document.getElementById('m_capacity').value);
      const status = document.getElementById('m_status').value;
      const description = document.getElementById('m_desc').value.trim();
      const image = document.getElementById('m_image').value.trim() || '🏢';
      
      // 开放时间
      const weekdayOpenHours = document.getElementById('m_weekday_hours').value.trim();
      const weekendOpenHours = document.getElementById('m_weekend_hours').value.trim();
      const weekendClosed = document.getElementById('m_weekend_closed').checked;
      const finalWeekendHours = weekendClosed ? '' : weekendOpenHours;
      
      // 审批设置
      const requiresApproval = document.getElementById('m_requires_approval').checked;
      const approverUserId = document.getElementById('m_approver_user') ? 
        parseInt(document.getElementById('m_approver_user').value) : null;
      
      // 收集可见学院
      const allCheckbox = document.getElementById('m_visible_all');
      let visible_colleges = [];
      
      if (allCheckbox && !allCheckbox.checked) {
        document.querySelectorAll('.college-checkbox:checked').forEach(cb => {
          visible_colleges.push(cb.value);
        });
      }
      
      // 收集设备
      const facilities = [];
      document.querySelectorAll('.facility-checkbox').forEach(cb => {
        if (cb.checked) {
          facilities.push(cb.value);
        }
      });
      
      if (!name || !building || !floor || !capacity) {
        Toast.error('请填写必填项');
        return;
      }
      
      const data = { 
        name, building, floor, capacity, status, description, image,
        weekday_open_hours: weekdayOpenHours,
        weekend_open_hours: finalWeekendHours,
        requires_approval: requiresApproval ? 1 : 0,
        facilities, visible_colleges
      };
      
      if (approverUserId) {
        data.approver_user_id = approverUserId;
      }
      
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
              <th>审批</th>
              <th>可见学院</th>
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
                      ${r.image || '🏢'}
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
                    ${r.facilities && r.facilities.slice(0, 2).map(f => `<span class="facility-tag" style="font-size:10px;padding:1px 6px">${utils.facilityLabel(f)}</span>`).join('')}
                    ${r.facilities && r.facilities.length > 2 ? `<span style="font-size:10px;color:var(--color-text-tertiary)">+${r.facilities.length - 2}</span>` : ''}
                    ${!r.facilities || !r.facilities.length ? '<span style="font-size:12px;color:var(--color-text-tertiary)">-</span>' : ''}
                  </div>
                </td>
                <td style="font-size:12px">
                  <div>工作日: ${utils.escapeHtml(r.weekday_open_hours || r.open_hours || '08:00-18:00')}</div>
                  <div class="text-xs text-tertiary">周末: ${r.weekend_open_hours ? utils.escapeHtml(r.weekend_open_hours) : '不开放'}</div>
                </td>
                <td>
                  <span class="tag ${r.requires_approval ? 'tag-warning' : 'tag-success'}">
                    ${r.requires_approval ? '需审批' : '免审批'}
                  </span>
                </td>
                <td>
                  <span style="font-size:12px;color:var(--color-text-secondary)">
                    ${r.visible_colleges && r.visible_colleges.length ? `${r.visible_colleges.length}个学院` : '全部学院'}
                  </span>
                </td>
                <td>
                  <select class="form-select" style="width:120px;padding:4px 8px;font-size:12px"
                          onchange="AdminRoomsPage.changeStatus(${r.id}, this.value)">
                    <option value="AVAILABLE" ${r.status === 'AVAILABLE' ? 'selected' : ''}>空闲</option>
                    <option value="BUSY" ${r.status === 'BUSY' ? 'selected' : ''}>使用中</option>
                    <option value="MAINTENANCE" ${r.status === 'MAINTENANCE' ? 'selected' : ''}>维护中</option>
                  </select>
                </td>
                <td>
                  <div style="display:flex;gap:6px;flex-wrap:wrap">
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

async function loadColleges() {
  try {
    const res = await fetch('http://127.0.0.1:5000/api/admin/colleges', {
      headers: { 'Authorization': `Bearer ${auth.getToken()}` }
    });
    const data = await res.json();
    return data.data || [];
  } catch (e) {
    console.error('加载学院列表失败', e);
    return [];
  }
}

async function loadApprovers() {
  try {
    const res = await fetch('http://127.0.0.1:5000/api/admin/approvers', {
      headers: { 'Authorization': `Bearer ${auth.getToken()}` }
    });
    const data = await res.json();
    return data.data || [];
  } catch (e) {
    console.error('加载审批人列表失败', e);
    return [];
  }
}

async function showModal(title, room = null) {
  const existing = document.getElementById('roomModal');
  if (existing) existing.remove();
  
  const colleges = await loadColleges();
  const approvers = await loadApprovers();
  
  // 解析已有的可见学院
  let existingColleges = [];
  if (room && room.visible_colleges && room.visible_colleges.length) {
    existingColleges = room.visible_colleges;
  }
  const isAllVisible = !room || !room.visible_colleges || room.visible_colleges.length === 0;
  
  // 解析开放时间
  const weekdayHours = room?.weekday_open_hours || room?.open_hours || '08:00-18:00';
  const weekendHours = room?.weekend_open_hours || '';
  const isWeekendClosed = !weekendHours || weekendHours === '';
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'roomModal';
  modal.innerHTML = `
    <div class="modal" style="max-width:700px">
      <div class="modal-header">
        <span class="modal-title">${title}</span>
        <button class="modal-close" onclick="document.getElementById('roomModal').remove()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <!-- 基础信息 -->
        <div class="form-group">
          <label class="form-label">会议室名称 <span style="color:var(--color-danger)">*</span></label>
          <input type="text" id="m_name" class="form-input" placeholder="如：星辰厅" value="${room?.name || ''}" required>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">楼宇 <span style="color:var(--color-danger)">*</span></label>
            <input type="text" id="m_building" class="form-input" placeholder="如：总部大楼、信息楼" value="${room?.building || ''}" required>
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
            <label class="form-label">状态</label>
            <select id="m_status" class="form-select">
              <option value="AVAILABLE" ${room?.status === 'AVAILABLE' ? 'selected' : ''}>空闲</option>
              <option value="BUSY" ${room?.status === 'BUSY' ? 'selected' : ''}>使用中</option>
              <option value="MAINTENANCE" ${room?.status === 'MAINTENANCE' ? 'selected' : ''}>维护中</option>
            </select>
          </div>
        </div>
        
        <!-- 开放时间（工作日/周末区分） -->
        <div class="form-group">
          <label class="form-label">开放时间</label>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">工作日（周一至周五）</label>
              <input type="text" id="m_weekday_hours" class="form-input" placeholder="如：08:00-18:00" value="${weekdayHours}">
            </div>
            <div class="form-group">
              <label class="form-label">周末（周六至周日）</label>
              <div style="display:flex;gap:8px;align-items:center">
                <input type="text" id="m_weekend_hours" class="form-input" placeholder="如：09:00-17:00" value="${isWeekendClosed ? '' : weekendHours}" style="flex:1" ${isWeekendClosed ? 'disabled' : ''}>
                <label class="checkbox-group" style="white-space:nowrap">
                  <input type="checkbox" id="m_weekend_closed" ${isWeekendClosed ? 'checked' : ''}>
                  <span>周末不开放</span>
                </label>
              </div>
            </div>
          </div>
          <div class="form-hint">格式：开始时间-结束时间，如 08:00-18:00</div>
        </div>
        
        <div class="form-group">
          <label class="form-label">图标</label>
          <input type="text" id="m_image" class="form-input" placeholder="如：🌟" value="${room?.image || '🏢'}" maxlength="2">
        </div>
        
        <!-- 审批设置 -->
        <div class="form-group">
          <label class="form-label">审批设置</label>
          <div style="border:1px solid var(--color-border);border-radius:8px;padding:12px">
            <label class="checkbox-group" style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
              <input type="checkbox" id="m_requires_approval" ${room?.requires_approval ? 'checked' : ''}>
              <span style="font-weight:500">需要审批</span>
            </label>
            <div id="approverSelectContainer" style="display:${room?.requires_approval ? 'block' : 'none'};margin-top:8px">
              <label class="form-label" style="margin-bottom:4px">指定审批人（可选）</label>
              <select id="m_approver_user" class="form-select">
                <option value="">-- 不指定（管理员均可审批） --</option>
                ${approvers.map(a => `
                  <option value="${a.id}" ${room?.approver_user_id == a.id ? 'selected' : ''}>${utils.escapeHtml(a.name)} (${utils.escapeHtml(a.username)})</option>
                `).join('')}
              </select>
            </div>
          </div>
          <div class="form-hint">需要审批的预定需要管理员审核后才能生效</div>
        </div>
        
        <!-- 可见学院设置 -->
        <div class="form-group">
          <label class="form-label">可见学院</label>
          <div style="border:1px solid var(--color-border);border-radius:8px;padding:12px">
            <label class="checkbox-group" style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
              <input type="checkbox" id="m_visible_all" ${isAllVisible ? 'checked' : ''}>
              <span style="font-weight:500">全部学院</span>
            </label>
            <div id="collegesContainer" style="display:flex;flex-wrap:wrap;gap:12px;padding-left:24px">
              ${colleges.map(c => `
                <label class="checkbox-group" style="display:flex;align-items:center;gap:6px">
                  <input type="checkbox" value="${c.id}" class="college-checkbox" 
                    ${existingColleges.includes(String(c.id)) ? 'checked' : ''}>
                  <span>${utils.escapeHtml(c.name)}</span>
                </label>
              `).join('')}
            </div>
          </div>
          <div class="form-hint">选择可见的学院，留空或勾选"全部学院"表示所有学院可见</div>
        </div>
        
        <!-- 设备设施 -->
        <div class="form-group">
          <label class="form-label">设备设施</label>
          <div style="display:flex;flex-wrap:wrap;gap:12px;padding:8px 0">
            <label class="checkbox-group">
              <input type="checkbox" value="projector" class="facility-checkbox" ${room?.facilities?.includes('projector') ? 'checked' : ''}>
              <span>📽️ 投影仪</span>
            </label>
            <label class="checkbox-group">
              <input type="checkbox" value="whiteboard" class="facility-checkbox" ${room?.facilities?.includes('whiteboard') ? 'checked' : ''}>
              <span>📝 白板</span>
            </label>
            <label class="checkbox-group">
              <input type="checkbox" value="video_conf" class="facility-checkbox" ${room?.facilities?.includes('video_conf') ? 'checked' : ''}>
              <span>🎥 视频会议</span>
            </label>
            <label class="checkbox-group">
              <input type="checkbox" value="tv" class="facility-checkbox" ${room?.facilities?.includes('tv') ? 'checked' : ''}>
              <span>📺 电视</span>
            </label>
            <label class="checkbox-group">
              <input type="checkbox" value="audio" class="facility-checkbox" ${room?.facilities?.includes('audio') ? 'checked' : ''}>
              <span>🔊 音响系统</span>
            </label>
          </div>
        </div>
        
        <!-- 描述 -->
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
  
  // 审批设置复选框逻辑
  const requiresApprovalCheckbox = document.getElementById('m_requires_approval');
  const approverContainer = document.getElementById('approverSelectContainer');
  if (requiresApprovalCheckbox && approverContainer) {
    requiresApprovalCheckbox.addEventListener('change', (e) => {
      approverContainer.style.display = e.target.checked ? 'block' : 'none';
    });
  }
  
  // 周末不开放复选框逻辑
  const weekendClosedCheckbox = document.getElementById('m_weekend_closed');
  const weekendHoursInput = document.getElementById('m_weekend_hours');
  if (weekendClosedCheckbox && weekendHoursInput) {
    weekendClosedCheckbox.addEventListener('change', (e) => {
      weekendHoursInput.disabled = e.target.checked;
      if (e.target.checked) {
        weekendHoursInput.value = '';
      }
    });
  }
  
  // "全部学院"复选框逻辑
  const allCheckbox = document.getElementById('m_visible_all');
  const collegeCheckboxes = document.querySelectorAll('.college-checkbox');
  
  if (allCheckbox) {
    const updateCollegeState = () => {
      if (allCheckbox.checked) {
        collegeCheckboxes.forEach(cb => {
          cb.checked = false;
          cb.disabled = true;
        });
      } else {
        collegeCheckboxes.forEach(cb => {
          cb.disabled = false;
        });
      }
    };
    
    allCheckbox.addEventListener('change', updateCollegeState);
    
    collegeCheckboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) {
          allCheckbox.checked = false;
        }
        const anyChecked = Array.from(collegeCheckboxes).some(c => c.checked);
        if (!anyChecked && !allCheckbox.checked) {
          allCheckbox.checked = true;
          updateCollegeState();
        }
      });
    });
    
    updateCollegeState();
  }
  
  // 点击遮罩关闭
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}