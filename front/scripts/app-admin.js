// ES 动态 import 的默认导出在 module.default，不是 module.init
async function runPageModule(mod, ...args) {
  const fn = mod.default ?? mod.init;
  if (typeof fn !== 'function') {
    console.error('页面模块缺少 default 或 init 导出', mod);
    throw new Error('页面模块无法加载');
  }
  return fn(...args);
}

// Main App - 管理端专用，无预约功能
const App = {
  _routerSetup: false,
  _notificationHandler: null,
  _unreadInterval: null,

  async init() {
    this.setupRouter();
    await router._resolve();
    this.setupNavActive();
    this.setupUserMenu();
    this.setupNotification();
  },

  renderLayout() {
    const hash = window.location.hash;
    if (hash === '#/login' || hash === '' || !hash) return;

    const role = auth.getRole();
    const user = auth.getUser() || { name: '管理员', username: 'admin' };
    const isAdmin = role === 'admin';

    // 非管理员不能访问管理端
    if (!isAdmin) {
      alert('无权限访问管理端');
      router.navigate('/login');
      return;
    }

    // 管理端菜单（只有管理功能，没有预约功能）
    const adminMenuHtml = `
      <div class="sidebar-section-label">管理端</div>
      <a href="#/admin/rooms" class="nav-item" data-page="admin-rooms">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        会议室管理
      </a>
      <a href="#/admin/bookings" class="nav-item" data-page="admin-bookings">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        预定记录
      </a>
      <a href="#/admin/stats" class="nav-item" data-page="admin-stats">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
        数据统计
      </a>
      <a href="#/admin/approvals" class="nav-item" data-page="admin-approvals">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        审批管理
        <span class="nav-badge" id="approvalBadge" style="display:none">0</span>
      </a>
    `;

    document.body.innerHTML = `
      <div class="app-layout">
        <!-- Sidebar -->
        <aside class="app-sidebar" id="sidebar">
          <div class="sidebar-logo">
            <div class="sidebar-logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div>
              <div class="sidebar-logo-text">会议室预定</div>
              <div class="sidebar-logo-sub">管理端</div>
            </div>
          </div>

          <nav class="sidebar-nav" id="sidebarNav">
            ${adminMenuHtml}
          </nav>

          <div class="sidebar-footer">
            <div class="sidebar-user">
              <div class="sidebar-avatar">${(user.name || user.username || 'A').charAt(0).toUpperCase()}</div>
              <div class="sidebar-user-info">
                <div class="sidebar-user-name">${utils.escapeHtml(user.name || user.username)}</div>
                <div class="sidebar-user-role">管理员</div>
              </div>
              <button class="sidebar-user-btn" onclick="App.logout()" title="退出登录">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          </div>
        </aside>

        <!-- Main -->
        <main class="app-main">
          <header class="app-header">
            <div class="header-left">
              <div class="header-breadcrumb" id="breadcrumb">
                <a href="#/admin/stats">首页</a>
              </div>
            </div>
            <div class="header-right">
              <button class="header-icon-btn" id="notificationBtn" title="消息">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
                <span class="badge" id="notificationBadge" style="display:none"></span>
              </button>
              <div class="dropdown" id="userDropdown">
                <button class="header-icon-btn" onclick="App.toggleUserDropdown()">
                  <div class="sidebar-avatar" style="width:28px;height:28px;font-size:12px">
                    ${(user.name || user.username || 'A').charAt(0).toUpperCase()}
                  </div>
                </button>
                <div class="dropdown-menu" id="userDropdownMenu" style="display:none">
                  <div class="dropdown-item" style="pointer-events:none;font-weight:600">
                    ${utils.escapeHtml(user.name || user.username)}
                  </div>
                  <div class="dropdown-divider"></div>
                  <div class="dropdown-item" onclick="App.logout()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                      <polyline points="16 17 21 12 16 7"/>
                      <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    退出登录
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div class="app-content" id="appContent">
            <!-- Pages render here -->
          </div>
        </main>
      </div>
      <div class="toast-container" id="toastContainer"></div>
    `;
  },

  setupNavActive() {
    if (this._navActiveBound) {
      document.dispatchEvent(new CustomEvent('app:navigate', { detail: {} }));
      return;
    }
    this._navActiveBound = true;
    const update = () => {
      document.querySelectorAll('.nav-item').forEach(item => {
        const page = item.getAttribute('data-page');
        const hash = window.location.hash;
        item.classList.toggle('active', page && hash.includes(page));
      });
    };
    document.addEventListener('app:navigate', update);
    update();
  },

  setupUserMenu() {
    // handled inline
  },

  setupNotification() {
    setTimeout(() => {
      const notificationBtn = document.getElementById('notificationBtn');
      if (!notificationBtn) return;
      
      if (this._notificationHandler) {
        notificationBtn.removeEventListener('click', this._notificationHandler);
      }
      
      this._notificationHandler = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          const module = await import('./pages/notification-popup.js');
          if (module.showNotificationPopup) {
            module.showNotificationPopup();
          }
        } catch (err) {
          console.error('加载通知模块失败', err);
        }
      };
      
      notificationBtn.addEventListener('click', this._notificationHandler);
      this.updateUnreadCount();
      
      if (this._unreadInterval) {
        clearInterval(this._unreadInterval);
      }
      this._unreadInterval = setInterval(() => this.updateUnreadCount(), 30000);
    }, 200);
  },

  async updateUnreadCount() {
    try {
      const token = auth.getToken();
      if (!token) return;
      
      const res = await fetch('http://127.0.0.1:5000/api/notifications/unread-count', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const count = data.data?.count || 0;
      const badge = document.getElementById('notificationBadge');
      if (badge) {
        if (count > 0) {
          badge.textContent = count > 99 ? '99+' : count;
          badge.style.display = 'flex';
        } else {
          badge.style.display = 'none';
        }
      }
      
      // 更新审批待处理数量
      const pendingRes = await fetch('http://127.0.0.1:5000/api/approvals/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const pendingData = await pendingRes.json();
      const pendingCount = pendingData.data?.length || 0;
      const approvalBadge = document.getElementById('approvalBadge');
      if (approvalBadge) {
        if (pendingCount > 0) {
          approvalBadge.textContent = pendingCount > 99 ? '99+' : pendingCount;
          approvalBadge.style.display = 'inline-flex';
        } else {
          approvalBadge.style.display = 'none';
        }
      }
    } catch (e) {
      console.error('获取未读数失败', e);
    }
  },

  toggleUserDropdown() {
    const menu = document.getElementById('userDropdownMenu');
    const dropdown = document.getElementById('userDropdown');
    if (!menu) return;
    const isHidden = menu.style.display === 'none';
    menu.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
      const close = (e) => {
        if (dropdown && !dropdown.contains(e.target)) {
          menu.style.display = 'none';
          document.removeEventListener('click', close);
        }
      };
      setTimeout(() => document.addEventListener('click', close), 0);
    }
  },

  logout() {
    auth.logout();
  },

  setupRouter() {
    if (this._routerSetup) return;
    this._routerSetup = true;

    router.guard((path) => {
      // 登录拦截
      if (!auth.isLoggedIn() && path !== '/login') {
        router.navigate('/login');
        return false;
      }
      if (auth.isLoggedIn() && path === '/login') {
        router.navigate('/admin/stats');
        return false;
      }

      const isAdmin = auth.isAdmin();
      const isAdminPath = path.startsWith('/admin');

      // 非管理员不能访问管理端
      if (isAdminPath && !isAdmin) {
        alert('无权限访问');
        router.navigate('/login');
        return false;
      }

      return true;
    });

    router.add('/login', async () => {
      document.getElementById('app-boot-placeholder')?.remove();
      document.body.innerHTML = '';
      document.body.style.overflow = '';
      try {
        const module = await import('./pages/login.js');
        const fn = module.default ?? module.init;
        if (typeof fn === 'function') fn();
      } catch (e) {
        console.error(e);
      }
    });

    router.add('/admin/rooms', async () => {
      await runPageModule(await import('./pages/admin-rooms.js'));
    });

    router.add('/admin/bookings', async () => {
      await runPageModule(await import('./pages/admin-bookings.js'));
    });

    router.add('/admin/stats', async () => {
      await runPageModule(await import('./pages/admin-stats.js'));
    });

    router.add('/admin/approvals', async () => {
      await runPageModule(await import('./pages/admin-approvals.js'));
    });
  },

  updateBreadcrumb(items) {
    const el = document.getElementById('breadcrumb');
    if (!el) return;
    el.innerHTML = items.map((item, i) => {
      if (i < items.length - 1) {
        return `<a href="${item.href}">${utils.escapeHtml(item.label)}</a>${i < items.length - 2 ? '<span>/</span>' : ''}`;
      }
      return `<span>${utils.escapeHtml(item.label)}</span>`;
    }).join('');
  },

  setPageView(html) {
    const content = document.getElementById('appContent');
    if (content) content.innerHTML = html;
  },

  renderSkeleton(type = 'card', count = 6) {
    if (type === 'card') {
      return Array(count).fill(0).map(() => `
        <div class="card" style="overflow:hidden">
          <div class="skeleton skeleton-card"></div>
          <div style="padding:16px">
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-text" style="width:80%"></div>
            <div class="skeleton skeleton-text" style="width:60%"></div>
          </div>
        </div>
      `).join('');
    }
    if (type === 'table') {
      return `
        <div class="card">
          <div class="card-body">
            <div style="display:flex;flex-direction:column;gap:12px">
              ${Array(5).fill(0).map(() => `
                <div class="skeleton" style="height:44px;border-radius:8px"></div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }
    return '';
  },
};

window.App = App;