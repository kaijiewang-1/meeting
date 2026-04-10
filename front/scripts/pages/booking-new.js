// New booking page
let selectedRoom = null;

export default async function init() {
  const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const roomId = params.get('roomId') || '';
  const prefilledDate = params.get('date') || utils.today();
  const prefilledStart = params.get('start') || '';
  const prefilledEnd = params.get('end') || '';

  App.renderLayout();
  App.updateBreadcrumb([
    { label: '首页', href: '#/home' },
    { label: '会议室列表', href: '#/rooms' },
    { label: '新建预定' },
  ]);

  App.setPageView(`
    <div class="page-header">
      <h1 class="page-title">新建预定</h1>
      <p class="page-subtitle">填写会议信息并选择会议室</p>
    </div>

    <div style="max-width:640px">
      <div class="card" style="margin-bottom:20px">
        <div class="card-header">
          <span class="card-title">会议信息</span>
        </div>
        <div class="card-body">
          <form id="bookingForm" onsubmit="BookingNewPage.submit(event)">
            <div class="form-group">
              <label class="form-label">会议主题 <span style="color:var(--color-danger)">*</span></label>
              <input type="text" id="subject" class="form-input" placeholder="请输入会议主题，如：项目周例会" maxlength="100" required>
              <div class="form-hint">简洁明了的会议主题有助于快速识别</div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">日期 <span style="color:var(--color-danger)">*</span></label>
                <input type="date" id="bookingDate" class="form-input" value="${prefilledDate}" required>
              </div>
              <div class="form-group">
                <label class="form-label">参会人数 <span style="color:var(--color-danger)">*</span></label>
                <select id="attendeeCount" class="form-select" required>
                  <option value="1">10人以下</option>
                  <option value="10">10-20人</option>
                  <option value="20">20-30人</option>
                  <option value="30">30人以上</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">开始时间 <span style="color:var(--color-danger)">*</span></label>
                <select id="startTime" class="form-select" required ${prefilledStart ? 'disabled' : ''}>
                  ${utils.generateTimeSlots(8, 19, 30).map(t => {
                    const sel = prefilledStart && t === prefilledStart ? 'selected' : '';
                    return `<option value="${t}" ${sel}>${t}</option>`;
                  }).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">结束时间 <span style="color:var(--color-danger)">*</span></label>
                <select id="endTime" class="form-select" required ${prefilledEnd ? 'disabled' : ''}>
                  ${utils.generateTimeSlots(9, 20, 30).map(t => {
                    const sel = prefilledEnd && t === prefilledEnd ? 'selected' : '';
                    return `<option value="${t}" ${sel}>${t}</option>`;
                  }).join('')}
                </select>
              </div>
            </div>

            <!-- 设备筛选 -->
            <div class="form-group">
              <label class="form-label">所需设备（可多选）</label>
              <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:8px;margin-bottom:8px">
                <label class="checkbox-group">
                  <input type="checkbox" value="projector" class="facility-checkbox">
                  <span>📽️ 投影仪</span>
                </label>
                <label class="checkbox-group">
                  <input type="checkbox" value="whiteboard" class="facility-checkbox">
                  <span>📝 白板</span>
                </label>
                <label class="checkbox-group">
                  <input type="checkbox" value="video_conf" class="facility-checkbox">
                  <span>🎥 视频会议</span>
                </label>
                <label class="checkbox-group">
                  <input type="checkbox" value="tv" class="facility-checkbox">
                  <span>📺 电视</span>
                </label>
                <label class="checkbox-group">
                  <input type="checkbox" value="audio" class="facility-checkbox">
                  <span>🔊 音响系统</span>
                </label>
              </div>
              <div class="form-hint">可多选，只显示满足所有设备要求的会议室</div>
            </div>

            <div class="form-group">
              <label class="form-label">
                选择会议室 <span style="color:var(--color-danger)">*</span>
                <span style="font-weight:400;color:var(--color-text-tertiary);margin-left:8px;font-size:12px">（可选已空闲的会议室）</span>
              </label>
              <div id="roomSelector">
                <div style="padding:20px;text-align:center;color:var(--color-text-tertiary)">
                  <div style="font-size:13px">点击下方按钮查找可用会议室</div>
                </div>
              </div>
              <input type="hidden" id="selectedRoomId" value="${roomId}">
              <button type="button" class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="BookingNewPage.searchRooms()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                查找空闲会议室
              </button>
            </div>

            <div class="form-group">
              <label class="form-label">备注（可选）</label>
              <textarea id="remark" class="form-input" rows="3" placeholder="如有特殊需求请在此说明，如：需要提前布置、准备茶歇等" style="resize:vertical"></textarea>
            </div>

            <!-- Conflict warning -->
            <div id="conflictWarning" class="card" style="display:none;background:var(--color-danger-bg);border-color:var(--color-danger);margin-bottom:18px">
              <div style="padding:14px 16px;display:flex;align-items:flex-start;gap:10px">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" stroke-width="2" width="18" height="18" style="flex-shrink:0;margin-top:1px">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <div>
                  <div style="font-weight:600;font-size:13px;color:var(--color-danger);margin-bottom:2px">时间冲突</div>
                  <div style="font-size:13px;color:var(--color-text-secondary)" id="conflictMsg">该会议室在所选时间段已被占用</div>
                </div>
              </div>
            </div>

            <div style="display:flex;gap:10px;justify-content:flex-end">
              <a href="#/rooms" class="btn btn-secondary">取消</a>
              <button type="submit" id="submitBtn" class="btn btn-primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                提交预定
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `);

  // Load prefilled room
  if (roomId) {
    try {
      const res = await api.getRoom(roomId);
      selectedRoom = res.data;
      renderSelectedRoom(selectedRoom);
    } catch (e) {}
  }

  // Time change handlers
  const startSelect = document.getElementById('startTime');
  const endSelect = document.getElementById('endTime');
  if (startSelect) {
    startSelect.addEventListener('change', () => BookingNewPage.validateTime());
    endSelect.addEventListener('change', () => BookingNewPage.validateTime());
  }

  window.BookingNewPage = {
    async searchRooms() {
      const date = document.getElementById('bookingDate').value;
      const startTime = document.getElementById('startTime').value;
      const endTime = document.getElementById('endTime').value;
      const attendees = document.getElementById('attendeeCount').value;
      
      // 获取选中的设备
      const selectedFacilities = [];
      document.querySelectorAll('.facility-checkbox:checked').forEach(cb => {
        selectedFacilities.push(cb.value);
      });

      const selector = document.getElementById('roomSelector');
      selector.innerHTML = `<div style="padding:20px;text-align:center;color:var(--color-text-tertiary)">查找中...</div>`;

      try {
        // 构建请求参数
        const params = { capacity: attendees };
        if (selectedFacilities.length > 0) {
          params.facilities = selectedFacilities;
        }
        
        const res = await api.getAvailableRooms(params);
        let rooms = res.data;
        
        // 前端再过滤设备（确保包含所有选中的设备）
        if (selectedFacilities.length > 0) {
          rooms = rooms.filter(room => {
            const roomFacilities = room.facilities || [];
            return selectedFacilities.every(f => roomFacilities.includes(f));
          });
        }
        
        if (!rooms.length) {
          selector.innerHTML = `<div style="padding:16px;text-align:center;color:var(--color-text-tertiary);font-size:13px">未找到符合条件的空闲会议室</div>`;
          return;
        }
        
        selector.innerHTML = rooms.map(r => `
          <div class="room-card" style="cursor:pointer;margin-bottom:8px"
               onclick="BookingNewPage.selectRoom(${r.id}, '${utils.escapeHtml(r.name)}', ${r.capacity})"
               id="roomOption${r.id}">
            <div style="display:flex;align-items:center;gap:12px;padding:12px">
              <div style="width:40px;height:40px;border-radius:var(--radius-md);background:var(--color-primary-light);
                          display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">
                ${r.image || '🏢'}
              </div>
              <div style="flex:1">
                <div style="font-weight:600;font-size:13px">${utils.escapeHtml(r.name)}</div>
                <div style="font-size:12px;color:var(--color-text-secondary)">${utils.escapeHtml(r.building)} · ${utils.escapeHtml(r.floor)} · ${r.capacity}人</div>
                ${r.facilities && r.facilities.length > 0 ? `
                <div style="font-size:11px;color:var(--color-text-tertiary);margin-top:4px">
                  设备: ${r.facilities.map(f => utils.facilityLabel(f)).join(' · ')}
                </div>
                ` : ''}
              </div>
              <span class="tag tag-available">空闲</span>
            </div>
          </div>
        `).join('');
      } catch (e) {
        selector.innerHTML = `<div style="padding:16px;text-align:center;color:var(--color-danger);font-size:13px">查找失败，请重试</div>`;
      }
    },

    selectRoom(id, name, capacity) {
      document.querySelectorAll('[id^="roomOption"]').forEach(el => {
        el.style.borderColor = '';
        el.style.background = '';
      });
      const selected = document.getElementById(`roomOption${id}`);
      if (selected) {
        selected.style.borderColor = 'var(--color-primary)';
        selected.style.background = 'var(--color-primary-light)';
      }
      document.getElementById('selectedRoomId').value = id;
      const attendeeCount = parseInt(document.getElementById('attendeeCount').value);
      // 参会人数判断：如果是范围值，需要比较容量
      if (capacity < attendeeCount) {
        Toast.warning(`该会议室容量为${capacity}人，低于参会人数要求`);
      }
    },

    validateTime() {
      const start = document.getElementById('startTime').value;
      const end = document.getElementById('endTime').value;
      const startH = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
      const endH = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);
      const warning = document.getElementById('conflictWarning');
      if (startH >= endH) {
        warning.style.display = 'block';
        document.getElementById('conflictMsg').textContent = '开始时间必须早于结束时间';
      } else {
        warning.style.display = 'none';
      }
    },

    async submit(e) {
      e.preventDefault();
      const subject = document.getElementById('subject').value.trim();
      const date = document.getElementById('bookingDate').value;
      const startTime = document.getElementById('startTime').value;
      const endTime = document.getElementById('endTime').value;
      const roomId = parseInt(document.getElementById('selectedRoomId').value);
      const attendeeSelect = document.getElementById('attendeeCount').value;
      // 解析参会人数范围，取最小值作为筛选条件，但实际预定人数可以灵活处理
      let attendeeCount = 1;
      if (attendeeSelect === '1') attendeeCount = 5;  // 10人以下默认5
      else if (attendeeSelect === '10') attendeeCount = 15;
      else if (attendeeSelect === '20') attendeeCount = 25;
      else if (attendeeSelect === '30') attendeeCount = 35;
      
      const remark = document.getElementById('remark').value.trim();

      if (!subject) { Toast.error('请填写会议主题'); return; }
      if (!roomId) { Toast.error('请选择会议室'); return; }

      const startH = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
      const endH = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
      if (startH >= endH) { Toast.error('开始时间必须早于结束时间'); return; }

      const btn = document.getElementById('submitBtn');
      btn.disabled = true;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" class="spin">
                        <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
                        <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
                        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
                       </svg> 提交中...`;

      try {
        const res = await api.createBooking({
          subject,
          roomId,
          startTime: `${date}T${startTime}:00`,
          endTime: `${date}T${endTime}:00`,
          attendeeCount,
          remark,
        });

        btn.disabled = false;
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                          <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg> 提交预定`;

        Toast.success(`预定申请已提交，等待管理员审批！`);
        setTimeout(() => router.navigate('/bookings/my'), 2000);
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                          <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg> 提交预定`;
        Toast.error(err.message || '预定失败，请稍后重试');
      }
    }
  };
}

function renderSelectedRoom(room) {
  const selector = document.getElementById('roomSelector');
  selector.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--color-primary-light);border-radius:var(--radius-md);border:1px solid var(--color-primary)">
      <div style="width:40px;height:40px;border-radius:var(--radius-md);background:var(--color-primary);display:flex;align-items:center;justify-content:center;font-size:20px;color:white">
        ${room.image}
      </div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:13px">${utils.escapeHtml(room.name)}</div>
        <div style="font-size:12px;color:var(--color-text-secondary)">${utils.escapeHtml(room.building)} · ${utils.escapeHtml(room.floor)} · ${room.capacity}人</div>
        ${room.facilities && room.facilities.length > 0 ? `
        <div style="font-size:11px;color:var(--color-text-tertiary);margin-top:4px">
          设备: ${room.facilities.map(f => utils.facilityLabel(f)).join(' · ')}
        </div>
        ` : ''}
      </div>
      <span class="tag tag-primary">已选择</span>
    </div>
  `;
}