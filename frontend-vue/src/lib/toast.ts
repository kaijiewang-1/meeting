import { utils } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'warning' | 'info'

const icons: Record<ToastType, string> = {
  success:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  error:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  warning:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  info:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
}

function getContainer() {
  let el = document.querySelector('.toast-container') as HTMLDivElement | null
  if (!el) {
    el = document.createElement('div')
    el.className = 'toast-container'
    document.body.appendChild(el)
  }
  return el
}

function show(message: string, type: ToastType, title?: string, duration = 4000) {
  const container = getContainer()
  const toast = document.createElement('div')
  toast.className = `toast ${type}`
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <div class="toast-content">
      ${title ? `<div class="toast-title">${utils.escapeHtml(title)}</div>` : ''}
      <div class="toast-message">${utils.escapeHtml(message)}</div>
    </div>
    <button class="toast-close" type="button">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  `
  toast.querySelector('.toast-close')?.addEventListener('click', () => toast.remove())
  container.appendChild(toast)
  if (duration > 0) {
    window.setTimeout(() => {
      toast.style.animation = 'fadeIn 200ms ease reverse'
      window.setTimeout(() => toast.remove(), 200)
    }, duration)
  }
}

export const toast = {
  success(message: string, title = '操作成功') {
    show(message, 'success', title)
  },
  error(message: string, title = '操作失败') {
    show(message, 'error', title, 6000)
  },
  warning(message: string, title = '警告') {
    show(message, 'warning', title)
  },
  info(message: string, title = '提示') {
    show(message, 'info', title)
  },
}
