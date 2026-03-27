// Calendar view page
export default async function init() {
  App.renderLayout();
  App.updateBreadcrumb([
    { label: '首页', href: '#/home' },
    { label: '日历视图' },
  ]);

  const weekDates = utils.getWeekDates();

  App.setPageView(`
    <div class="page-header">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <h1 class="page-title">日历视图</h1>
          <p class="page-subtitle">按天/周查看会议室预定情况</p>
        </div>
        <div style="display:flex;gap:8px">
          <select class="form-select" id="calRoom" style="width:160px">
            <option value="">全部会议室</option>
          </select>
          <button class="btn btn-secondary" onclick="CalendarPage.prevWeek()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button class="btn btn-secondary btn-sm" onclick="CalendarPage.thisWeek()" style="padding:8px 12px;font-size:13px">本周</button>
          <button class="btn btn-secondary" onclick="CalendarPage.nextWeek()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-body" style="padding:0;overflow-x:auto" id="calendarContainer">
        ${App.renderSkeleton('card', 1)}
      </div>
    </div>
  `);

  // Load rooms for filter
  try {
    const res = await api.getRooms({});
    const select = document.getElementById('calRoom');
    res.data.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = r.name;
      select.appendChild(opt);
    });
  } catch (e) {}

  window.CalendarPage = {
    weekStart: new Date(),
    async prevWeek() {
      this.weekStart.setDate(this.weekStart.getDate() - 7);
      await this.render();
    },
    async nextWeek() {
      this.weekStart.setDate(this.weekStart.getDate() + 7);
      await this.render();
    },
    async thisWeek() {
      this.weekStart = new Date();
      await this.render();
    },
    async render() {
      await renderCalendar(this.weekStart, document.getElementById('calRoom')?.value);
    },
    async quickBook(date, time) {
      router.navigate(`/bookings/new?date=${date}&start=${time}`);
    },
    showBookingDetail(id) {
      Toast.info(`预定详情 ID: ${id}`);
    }
  };

  await renderCalendar(new Date(), '');
  document.getElementById('calRoom')?.addEventListener('change', () => CalendarPage.render());
}

async function renderCalendar(baseDate, roomFilter) {
  const container = document.getElementById('calendarContainer');
  if (!container) return;

  container.innerHTML = App.renderSkeleton('card', 1);

  // Build week dates
  const weekStart = new Date(baseDate);
  weekStart.setDate(baseDate.getDate() - baseDate.getDay());

  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    weekDates.push(d);
  }

  const timeSlots = utils.generateTimeSlots(8, 20, 60);
  const todayStr = utils.formatDate(new Date());

  try {
    const allBookings = [];
    const allRooms = (await api.getRooms({})).data;
    const selectedRooms = roomFilter ? allRooms.filter(r => r.id === parseInt(roomFilter)) : allRooms;

    for (const room of selectedRooms) {
      for (const date of weekDates) {
        const dateStr = utils.formatDate(date);
        try {
          const res = await api.getRoomSchedule(room.id, dateStr);
          res.data.forEach(b => allBookings.push({ ...b, roomName: room.name, roomId: room.id }));
        } catch (e) {}
      }
    }

    container.innerHTML = `
      <div style="min-width:800px">
        <!-- Header -->
        <div style="display:grid;grid-template-columns:70px repeat(7,1fr);border-bottom:1px solid var(--color-border);background:var(--color-bg)">
          <div style="padding:10px 12px;font-size:12px;font-weight:600;color:var(--color-text-tertiary);border-right:1px solid var(--color-border)">时间</div>
          ${weekDates.map(d => {
            const dStr = utils.formatDate(d);
            const isToday = dStr === todayStr;
            const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            return `
              <div style="padding:10px 8px;text-align:center;border-right:1px solid var(--color-border-light);
                          ${isToday ? 'background:var(--color-primary);color:white' : ''}">
                <div style="font-size:11px;font-weight:600;opacity:${isToday ? 0.8 : 0.6}">${dayNames[d.getDay()]}</div>
                <div style="font-size:18px;font-weight:700">${d.getDate()}</div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Grid -->
        ${timeSlots.map(slot => {
          const [sh] = slot.split(':').map(Number);
          const endSlot = `${String(sh + 1).padStart(2, '0')}:00`;
          return `
            <div style="display:grid;grid-template-columns:70px repeat(7,1fr);border-bottom:1px solid var(--color-border-light);min-height:60px">
              <div style="padding:6px 12px;font-size:11px;color:var(--color-text-tertiary);font-weight:500;
                          display:flex;align-items:flex-start;justify-content:center;
                          border-right:1px solid var(--color-border);background:var(--color-bg)">
                ${slot}
              </div>
              ${weekDates.map(d => {
                const dStr = utils.formatDate(d);
                const dayBookings = allBookings.filter(b => {
                  const isSameDay = b.startTime.split('T')[0] === dStr;
                  const isSameRoom = roomFilter ? b.roomId === parseInt(roomFilter) : true;
                  const isThisHour = new Date(b.startTime).getHours() === sh;
                  return isSameDay && isSameRoom && isThisHour;
                });

                if (!dayBookings.length) {
                  return `
                    <div style="padding:4px;border-right:1px solid var(--color-border-light);cursor:pointer;
                                display:flex;align-items:center;justify-content:center;
                                font-size:11px;color:var(--color-text-tertiary)"
                                onclick="CalendarPage.quickBook('${dStr}','${slot}')">
                      <span style="opacity:0;transition:opacity 0.15s" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">+</span>
                    </div>
                  `;
                }

                return `
                  <div style="padding:4px;border-right:1px solid var(--color-border-light);display:flex;flex-direction:column;gap:2px;overflow:hidden">
                    ${dayBookings.slice(0, 2).map(b => `
                      <div style="background:var(--color-primary);color:white;border-radius:3px;padding:2px 6px;
                                  font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
                                  cursor:pointer"
                           title="${utils.escapeHtml(b.subject)} (${b.roomName})"
                           onclick="CalendarPage.showBookingDetail(${b.id})">
                        ${roomFilter ? '' : `<span style="opacity:0.7;font-weight:400">${utils.escapeHtml(b.roomName)}</span> `}${utils.escapeHtml(b.subject)}
                      </div>
                    `).join('')}
                    ${dayBookings.length > 2 ? `<div style="font-size:10px;color:var(--color-text-tertiary);text-align:center">+${dayBookings.length - 2} 更多</div>` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          `;
        }).join('')}
      </div>

      <div style="padding:12px 16px;border-top:1px solid var(--color-border);display:flex;gap:16px;font-size:12px;color:var(--color-text-tertiary)">
        <span style="font-weight:600;margin-right:4px">说明：</span>
        点击空白时段可快速发起预定 · 点击预定条可查看详情
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<div style="padding:40px;text-align:center;color:var(--color-text-tertiary)">加载失败，请重试</div>`;
  }
}
