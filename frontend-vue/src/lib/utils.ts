export const utils = {
  formatDate(dateStr?: string | Date | null) {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return '-'
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  },

  formatTime(dateStr?: string | Date | null) {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return '-'
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  },

  formatDateTime(dateStr?: string | Date | null) {
    return `${this.formatDate(dateStr)} ${this.formatTime(dateStr)}`
  },

  today() {
    return this.formatDate(new Date())
  },

  getWeekDates(baseDate = new Date()) {
    const dates = []
    const weekStart = new Date(baseDate)
    weekStart.setDate(baseDate.getDate() - baseDate.getDay())
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      dates.push(d)
    }
    return dates
  },

  generateTimeSlots(start = 8, end = 20, interval = 30) {
    const slots: string[] = []
    for (let h = start; h <= end; h += 1) {
      for (let m = 0; m < 60; m += interval) {
        if (h === end && m > 0) break
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
      }
    }
    return slots
  },

  escapeHtml(str?: string | null) {
    if (!str) return ''
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
  },

  statusLabel(status?: string | null) {
    const map: Record<string, string> = {
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
    }
    return status ? map[status] || status : '-'
  },

  statusTag(status?: string | null) {
    const map: Record<string, string> = {
      AVAILABLE: 'tag-available',
      BUSY: 'tag-busy',
      MAINTENANCE: 'tag-maintenance',
      BOOKED: 'tag-booked',
      CHECKED_IN: 'tag-success',
      IN_USE: 'tag-busy',
      FINISHED: 'tag-neutral',
      CANCELED: 'tag-danger',
      EXPIRED: 'tag-neutral',
      PENDING_APPROVAL: 'tag-warning',
      REJECTED: 'tag-danger',
    }
    return status ? map[status] || 'tag-neutral' : 'tag-neutral'
  },

  roomStatusTag(status?: string | null) {
    const map: Record<string, string> = {
      AVAILABLE: 'tag-available',
      BUSY: 'tag-busy',
      MAINTENANCE: 'tag-maintenance',
    }
    return status ? map[status] || 'tag-neutral' : 'tag-neutral'
  },

  facilityLabel(key?: string | null) {
    const map: Record<string, string> = {
      projector: '投影仪',
      whiteboard: '白板',
      video_conf: '视频会议',
      tv: '电视',
      audio: '音响系统',
    }
    return key ? map[key] || key : ''
  },

  initials(name?: string | null) {
    return String(name || 'U').trim().charAt(0).toUpperCase()
  },

  normalizeTime(value?: string | null) {
    const text = String(value || '').trim()
    const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{1,2})?$/)
    if (!match) return ''
    const hours = Math.min(23, Math.max(0, Number.parseInt(match[1], 10)))
    const minutes = Math.min(59, Math.max(0, Number.parseInt(match[2], 10)))
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  },
}