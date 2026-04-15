// Utility functions
const utils = {
  formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  formatTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  },

  formatDateTime(dateStr) {
    if (!dateStr) return '-';
    return `${this.formatDate(dateStr)} ${this.formatTime(dateStr)}`;
  },

  formatDateTimeRange(start, end) {
    return `${this.formatDate(start)} ${this.formatTime(start)} - ${this.formatTime(end)}`;
  },

  today() {
    return this.formatDate(new Date());
  },

  now() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  },

  // Get dates for a week starting from today
  getWeekDates() {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push({
        date: this.formatDate(d),
        dayName: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()],
        dayNum: d.getDate(),
        isToday: i === 0,
      });
    }
    return dates;
  },

  statusLabel(status) {
    const map = {
      AVAILABLE: '空闲',
      BUSY: '使用中',
      MAINTENANCE: '维护中',
      BOOKED: '已预定',
      CHECKED_IN: '已签到',
      IN_USE: '使用中',
      FINISHED: '已结束',
      CANCELED: '已取消',
      EXPIRED: '已过期',
      PENDING_APPROVAL: '待审批',
      REJECTED: '已驳回',
    };
    return map[status] || status;
  },

  statusTag(status) {
    const map = {
      AVAILABLE: 'tag-available',
      BUSY: 'tag-busy',
      MAINTENANCE: 'tag-maintenance',
      BOOKED: 'tag-booked',
      CHECKED_IN: 'tag-primary',
      IN_USE: 'tag-busy',
      FINISHED: 'tag-neutral',
      CANCELED: 'tag-danger',
      EXPIRED: 'tag-neutral',
      PENDING_APPROVAL: 'tag-warning',
      REJECTED: 'tag-danger',
    };
    return map[status] || 'tag-neutral';
  },

  roomStatusTag(status) {
    const map = {
      AVAILABLE: 'tag-available',
      BUSY: 'tag-busy',
      MAINTENANCE: 'tag-maintenance',
    };
    return map[status] || 'tag-neutral';
  },

  facilityLabel(key) {
    const map = {
      projector: '投影仪',
      whiteboard: '白板',
      video_conf: '视频会议',
      tv: '电视',
      audio: '音响系统',
    };
    return map[key] || key;
  },

  facilityIcon(key) {
    const map = {
      projector: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 6V4M18 6V4"/></svg>`,
      whiteboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
      video_conf: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`,
      tv: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>`,
      audio: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
    };
    return map[key] || '';
  },

  debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  generateTimeSlots(start = 8, end = 20, interval = 30) {
    const slots = [];
    for (let h = start; h <= end; h++) {
      for (let m = 0; m < 60; m += interval) {
        if (h === end && m > 0) break;
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return slots;
  },
};

window.utils = utils;
