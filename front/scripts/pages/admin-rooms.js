// Admin - Meeting room management
const PRESET_FACILITIES = ['projector', 'whiteboard', 'video_conf', 'tv', 'audio'];

export default async function init() {
  if (!auth.isAdmin()) {
    Toast.error('无权限访问');
    router.navigate('/home');
    return;
  }

  App.renderLayout();
  App.updateBreadcrumb([
    { label: '管理端', href: '#/admin/rooms' },
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
      await showRoomModal('新增会议室');
    },
    async showEditModal(id) {
      try {
        const res = await api.getRoom(id);
        await showRoomModal('编辑会议室', res.data);
      } catch (e) {
        Toast.error('加载失败');
      }
    },
    addCustomFacilityRow() {
      const code = (window.prompt('请输入设备代码（小写字母、数字、下划线，如 smart_board）') || '').trim().toLowerCase();
      if (!code) return;
      if (!/^[a-z0-9_]{1,40}$/.test(code)) {
        Toast.error('设备代码：1-40 位小写字母、数字、下划线');
        return;
      }
      if (PRESET_FACILITIES.includes(code)) {
        Toast.info('该设备已在预设列表中，请直接勾选');
        return;
      }
      if (document.getElementById(`m_facility_${code}`)) {
        Toast.info('该设备已在列表中');
        return;
      }
      const wrap = document.getElementById('m_facilities_extra');
      if (!wrap) return;
      document.getElementById('m_facilities_extra_hint')?.remove();
      const label = document.createElement('label');
      label.className = 'checkbox-group';
      label.style.fontSize = '13px';
      label.innerHTML = `
        <input type="checkbox" value="${code}" id="m_facility_${code}" checked>
        <span>${utils.escapeHtml(utils.facilityLabel(code))}</span>
      `;
      wrap.appendChild(label);
    },
    bindRoomModal() {
      const cb = document.getElementById('m_requires_approval');
      const grp = document.getElementById('m_approver_group');
      const sync = () => {
        if (grp) grp.style.display = cb?.checked ? 'block' : 'none';
      };
      cb?.addEventListener('change', sync);
      sync();
    },
    async save(id) {
      const name = document.getElementById('m_name').value.trim();
      const building = document.getElementById('m_building').value.trim();
      const building = document.getElementById('m_building').value.trim();
      const floor = document.getElementById('m_floor').value.trim();
      const capacity = parseInt(document.getElementById('m_capacity').value);
      const weekdayHours = document.getElementById('m_weekday_hours').value.trim() || '08:00-18:00';
      const weekendHours = document.getElementById('m_weekend_hours').value.trim() || '09:00-17:00';
      const description = document.getElementById('m_desc').value.trim();
      const facilities = PRESET_FACILITIES.filter(f => document.getElementById(`m_facility_${f}`)?.checked)
        .concat(
          [...document.querySelectorAll('#m_facilities_extra input[type="checkbox"]:checked')].map(el => el.value),
        )
        .filter((v, i, a) => a.indexOf(v) === i);
      const requiresApproval = !!document.getElementById('m_requires_approval')?.checked;
      const approverRaw = document.getElementById('m_approver_user_id')?.value;
      const approverUserId = requiresApproval && approverRaw ? approverRaw : null;
      const visibilityScope = document.getElementById('m_visibility')?.value || 'ALL';
      const collegesRaw = document.getElementById('m_colleges')?.value || '';
      const visibleColleges = collegesRaw.split(/[,，\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean);

      if (!name || !building || !floor || !capacity) {
        Toast.error('请填写必填项（名称、楼宇、楼层、容量）');
        return;
      }
      if (visibilityScope === 'COLLEGES' && !visibleColleges.length) {
        Toast.error('限定学院可见时，请至少填写一个学院代码（如 CS）');
        return;
      }

      const data = {
        name, building, floor, capacity, description, facilities,
        weekday_open_hours: weekdayHours,
        weekend_open_hours: weekendHours,
        open_hours: weekdayHours,  // 兼容旧字段
        requiresApproval, approverUserId, visibilityScope,
        visibleColleges: visibilityScope === 'COLLEGES' ? visibleColleges : [],
      };
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
<<<<<<< HEAD
              <th>开放时间</th>
              <th>审批</th>
              <th>可见性</th>
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
<<<<<<< HEAD
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
                <td style="font-size:12px;color:var(--color-text-secondary)">
                  <div>工作日: ${utils.escapeHtml((r.weekday_open_hours || r.weekdayOpenHours || r.openHours || '-'))}</div>
                  <div style="color:var(--color-text-tertiary);font-size:11px">周末: ${utils.escapeHtml((r.weekend_open_hours || r.weekendOpenHours || '-'))}</div>
                </td>
                <td style="font-size:12px">
                  ${r.requiresApproval
                    ? `<span class="tag tag-warning">需审批</span>
                       <div style="font-size:11px;color:var(--color-text-tertiary);margin-top:4px;line-height:1.3">
                         ${r.approverName ? `审批人：${utils.escapeHtml(r.approverName)}` : '审批人：任意管理员'}
                       </div>`
                    : '<span class="tag tag-neutral">即时</span>'}
                </td>
                <td style="font-size:12px;max-width:120px">
                  ${r.visibilityScope === 'COLLEGES'
                    ? `<span title="${utils.escapeHtml((r.visibleColleges || []).join(', '))}">部分学院</span><div style="color:var(--color-text-tertiary);font-size:11px">${utils.escapeHtml((r.visibleColleges || []).slice(0, 2).join(','))}${(r.visibleColleges || []).length > 2 ? '…' : ''}</div>`
                    : '<span class="tag tag-available">全部</span>'}
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

async function showRoomModal(title, room = null) {
  const existing = document.getElementById('roomModal');
  if (existing) existing.remove();

  let admins = [];
  try {
    const ar = await api.getAdminApprovers();
    admins = ar.data || [];
  } catch (e) {
    Toast.error(e.message || '加载审批人列表失败');
  }

  const customFacilities = (room?.facilities || []).filter(f => !PRESET_FACILITIES.includes(f));
  const approverOptions = [
    '<option value="">任意管理员可审批</option>',
    ...admins.map(u => {
      const sel = room?.approverUserId != null && String(room.approverUserId) === String(u.id) ? 'selected' : '';
      return `<option value="${u.id}" ${sel}>${utils.escapeHtml(u.name || u.username)}（${utils.escapeHtml(u.username)}）</option>`;
    }),
  ].join('');

  const presetChecks = PRESET_FACILITIES.map(f => `
    <label class="checkbox-group" style="font-size:13px">
      <input type="checkbox" value="${f}" id="m_facility_${f}" ${room?.facilities?.includes(f) ? 'checked' : ''}>
      <span>${utils.facilityLabel(f)}</span>
    </label>
  `).join('');

  const customChecks = customFacilities.map(code => `
    <label class="checkbox-group" style="font-size:13px">
      <input type="checkbox" value="${code}" id="m_facility_${code}" checked>
      <span>${utils.escapeHtml(utils.facilityLabel(code))}</span>
    </label>
  `).join('');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'roomModal';
  modal.innerHTML = `
    <div class="modal" style="max-width:700px">
      <div class="modal-header">
        <span class="modal-title">${utils.escapeHtml(title)}</span>
        <button class="modal-close" onclick="document.getElementById('roomModal').remove()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <!-- 基础信息 -->
        <div class="form-group">
          <label class="form-label">名称 <span style="color:var(--color-danger)">*</span></label>
          <input type="text" id="m_name" class="form-input" placeholder="如：星辰厅" value="${utils.escapeHtml(room?.name || '')}" required>
        </div>
        
        <div class="form-row">
          <div class="form-group">
<<<<<<< HEAD
            <label class="form-label">楼宇 <span style="color:var(--color-danger)">*</span></label>
            <input type="text" id="m_building" class="form-input" placeholder="如：总部大楼" value="${utils.escapeHtml(room?.building || '')}" required>
          </div>
          <div class="form-group">
            <label class="form-label">楼层 <span style="color:var(--color-danger)">*</span></label>
            <input type="text" id="m_floor" class="form-input" placeholder="如：10F" value="${utils.escapeHtml(room?.floor || '')}" required>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">容量（人） <span style="color:var(--color-danger)">*</span></label>
            <input type="number" id="m_capacity" class="form-input" placeholder="如：12" value="${room?.capacity != null ? room.capacity : ''}" min="1" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">工作日开放时间</label>
            <input type="text" id="m_weekday_hours" class="form-input" placeholder="如：08:00-18:00" value="${utils.escapeHtml(room?.weekdayOpenHours || room?.weekday_open_hours || room?.openHours || '08:00-18:00')}">
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
        
<<<<<<< HEAD
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
=======
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">周末开放时间</label>
            <input type="text" id="m_weekend_hours" class="form-input" placeholder="如：09:00-17:00" value="${utils.escapeHtml(room?.weekendOpenHours || room?.weekend_open_hours || '09:00-17:00')}">
          </div>
          <div class="form-hint">选择可见的学院，留空或勾选"全部学院"表示所有学院可见</div>
        </div>
        
        <!-- 设备设施 -->
        <div class="form-group">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px">
            <label class="form-label" style="margin:0">设备设施</label>
            <button type="button" class="btn btn-secondary btn-sm" onclick="AdminRoomsPage.addCustomFacilityRow()">添加设备</button>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:10px;padding:10px 0;border:1px solid var(--color-border);border-radius:8px;padding:12px">
            ${presetChecks}
          </div>
          <div id="m_facilities_extra" style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;padding:10px 0;border:1px dashed var(--color-border);border-radius:8px;padding:12px;min-height:0">
            ${customChecks || '<span id="m_facilities_extra_hint" style="font-size:12px;color:var(--color-text-tertiary)">自定义设备将显示在此处</span>'}
          </div>
        </div>
        
        <!-- 描述 -->
        <div class="form-group">
          <label class="form-label">描述</label>
          <textarea id="m_desc" class="form-input" rows="3" placeholder="会议室简要描述">${utils.escapeHtml(room?.description || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="checkbox-group" style="font-size:13px">
            <input type="checkbox" id="m_requires_approval" ${room?.requiresApproval ? 'checked' : ''}>
            <span>预定需管理员审批通过后方可占用时段</span>
          </label>
        </div>
        <div class="form-group" id="m_approver_group" style="display:none">
          <label class="form-label">审批人</label>
          <select id="m_approver_user_id" class="form-select">
            ${approverOptions}
          </select>
          <div class="form-hint" style="margin-top:6px">指定后仅该管理员可通过/驳回该会议室的待审批预定；不选则为任意管理员。</div>
        </div>
        <div class="form-group">
          <label class="form-label">可见范围</label>
          <select id="m_visibility" class="form-select">
            <option value="ALL" ${(room?.visibilityScope || 'ALL') === 'ALL' ? 'selected' : ''}>全部用户可见</option>
            <option value="COLLEGES" ${room?.visibilityScope === 'COLLEGES' ? 'selected' : ''}>仅指定学院可见</option>
          </select>
          <div class="form-hint" style="margin-top:6px">选择「仅指定学院」时，请填写学院代码，与账号上的学院代码一致（如 CS、EE）</div>
          <input type="text" id="m_colleges" class="form-input" style="margin-top:8px"
                 placeholder="多个学院用逗号分隔，如：CS,EE"
                 value="${utils.escapeHtml((room?.visibleColleges || []).join(','))}">
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
  
<<<<<<< HEAD
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
  
=======
>>>>>>> ce761abf795a0e007b9c5b1a4a554422860fa1ed
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
<<<<<<< HEAD
=======
        // 检查是否所有学院都未选中
>>>>>>> ce761abf795a0e007b9c5b1a4a554422860fa1ed
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
  window.AdminRoomsPage.bindRoomModal();
}