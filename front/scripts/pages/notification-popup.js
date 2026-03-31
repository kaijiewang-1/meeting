// 通知弹窗组件
let notificationPopup = null;

export function showNotificationPopup() {
  if (notificationPopup) {
    notificationPopup.remove();
    notificationPopup = null;
    return;
  }
  
  const popup = document.createElement('div');
  popup.className = 'notification-popup';
  popup.id = 'notificationPopup';
  popup.innerHTML = `
    <div class="notification-popup-header">
      <span>消息通知</span>
      <button class="notification-popup-close">✕</button>
    </div>
    <div class="notification-popup-body" id="notificationList">
      <div class="notification-loading">加载中...</div>
    </div>
    <div class="notification-popup-footer">
      <button class="btn btn-ghost btn-sm" id="markAllReadBtn">全部已读</button>
    </div>
  `;
  
  document.body.appendChild(popup);
  notificationPopup = popup;
  
  loadNotifications();
  
  popup.querySelector('.notification-popup-close').onclick = () => {
    popup.remove();
    notificationPopup = null;
  };
  
  setTimeout(() => {
    document.addEventListener('click', function closePopup(e) {
      if (!popup.contains(e.target) && !e.target.closest('#notificationBtn')) {
        popup.remove();
        notificationPopup = null;
        document.removeEventListener('click', closePopup);
      }
    });
  }, 100);
}

async function loadNotifications() {
  const listEl = document.getElementById('notificationList');
  if (!listEl) return;
  
  try {
    const token = auth.getToken();
    if (!token) {
      listEl.innerHTML = '<div class="notification-empty">请先登录</div>';
      return;
    }
    
    const res = await fetch('http://127.0.0.1:5000/api/notifications', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const notifications = data.data || [];
    
    if (notifications.length === 0) {
      listEl.innerHTML = '<div class="notification-empty">暂无消息</div>';
      return;
    }
    
    listEl.innerHTML = notifications.map(n => `
      <div class="notification-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}">
        <div class="notification-icon">
          ${getNotificationIcon(n.type)}
        </div>
        <div class="notification-content">
          <div class="notification-title">${escapeHtml(n.title)}</div>
          <div class="notification-message">${escapeHtml(n.content)}</div>
          <div class="notification-time">${formatTimeAgo(n.created_at)}</div>
        </div>
      </div>
    `).join('');
    
    listEl.querySelectorAll('.notification-item').forEach(item => {
      item.onclick = async () => {
        const id = item.dataset.id;
        if (id && !item.classList.contains('read')) {
          await fetch(`http://127.0.0.1:5000/api/notifications/${id}/read`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          item.classList.add('read');
          item.classList.remove('unread');
          if (window.App) window.App.updateUnreadCount();
        }
      };
    });
    
    document.getElementById('markAllReadBtn').onclick = async () => {
      await fetch('http://127.0.0.1:5000/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      loadNotifications();
      if (window.App) window.App.updateUnreadCount();
    };
    
  } catch (e) {
    console.error('加载通知失败', e);
    listEl.innerHTML = '<div class="notification-empty">加载失败，请稍后重试</div>';
  }
}

function getNotificationIcon(type) {
  const icons = {
    'BOOKING_CREATED': '📅',
    'BOOKING_CONFIRMED': '✅',
    'BOOKING_CANCELED': '❌',
    'BOOKING_REJECTED': '⚠️',
    'PENDING_APPROVAL': '⏳',
    'BOOKING_REMINDER': '🔔',
    'BOOKING_AUTO_RELEASED': '🕐',
    'ROOM_MAINTENANCE': '🔧'
  };
  return icons[type] || '📢';
}

function formatTimeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}