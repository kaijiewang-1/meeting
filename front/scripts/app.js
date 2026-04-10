// ES 动态 import 的默认导出在 module.default，不是 module.init
async function runPageModule(mod, ...args) {
  const fn = mod.default ?? mod.init;
  if (typeof fn !== 'function') {
    console.error('页面模块缺少 default 或 init 导出', mod);
    throw new Error('页面模块无法加载');
  }
  return fn(...args);
}

// Main App - renders layout and sets up routing
const App = {
  _routerSetup: false,
  _notificationHandler: null,
  _unreadInterval: null,

  async init() {
    this.setupRouter();
    await router._resolve();
    this.setupNavActive();
    this.setupUserMenu();
    this.setupMobileMenu();
    this.setupNotification();
  },

  renderLayout() {
    const hash = window.location.hash;
    // Login page has no sidebar layout
    if (hash === '#/login' || hash === '' || !hash) return;

    const role = auth.getRole();
    const user = auth.getUser() || { name: '用户', username: 'user' };
    const isMobile = window.innerWidth <= 768;
    const isAdmin = role === 'admin';

    // 用户端菜单（手机端显示，包括管理员在手机上也显示）
    const userMenuHtml = isMobile ? `
      <div class="sidebar-section-label">菜单</div>
      <a href="#/home" class="nav-item" data-page="home">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        首页工作台
      </a>
      <a href="#/rooms" class="nav-item" data-page="rooms">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        会议室列表
      </a>
      <a href="#/bookings/new" class="nav-item" data-page="bookings-new">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        新建预定
      </a>
      <a href="#/bookings/my" class="nav-item" data-page="bookings-my">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
        </svg>
        我的预定
        <span class="nav-badge" id="bookingBadge">${this.getActiveBookingCount()}</span>
      </a>
      <a href="#/calendar" class="nav-item" data-page="calendar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        日历视图
      </a>
    ` : '';

    // 管理端菜单（仅管理员在电脑端显示）
    const adminMenuHtml = (isAdmin && !isMobile) ? `
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
    ` : '';

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
              <div class="sidebar-logo-sub">Meeting Room Booking</div>
            </div>
          </div>

          <nav class="sidebar-nav" id="sidebarNav">
            ${userMenuHtml}
            ${adminMenuHtml}
          </nav>

          <div class="sidebar-footer">
            <div class="sidebar-user">
              <div class="sidebar-avatar">${(user.name || user.username || 'U').charAt(0).toUpperCase()}</div>
              <div class="sidebar-user-info">
                <div class="sidebar-user-name">${utils.escapeHtml(user.name || user.username)}</div>
                <div class="sidebar-user-role">${isAdmin ? '管理员' : '普通用户'}</div>
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
              <button class="header-icon-btn" id="menuToggleBtn" style="display: none;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
              <div class="header-breadcrumb" id="breadcrumb">
                <a href="#/home">首页</a>
              </div>
            </div>
            <div class="header-right">
              <!-- 通知按钮：管理员和普通用户都显示 -->
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
                    ${(user.name || user.username || 'U').charAt(0).toUpperCase()}
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

  getActiveBookingCount() {
    try {
      return 2;
    } catch { return 0; }
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

  setupMobileMenu() {
    setTimeout(() => {
      const toggleBtn = document.getElementById('menuToggleBtn');
      const sidebar = document.getElementById('sidebar');
      
      if (!toggleBtn || !sidebar) return;

      if (this._handleMenuClick) {
        toggleBtn.removeEventListener('click', this._handleMenuClick);
      }
      
      this._handleMenuClick = () => {
        sidebar.classList.toggle('open');
      };
      
      toggleBtn.addEventListener('click', this._handleMenuClick);

      const handleResize = () => {
        if (window.innerWidth <= 768) {
          toggleBtn.style.display = 'flex';
          sidebar.classList.remove('open');
        } else {
          toggleBtn.style.display = 'none';
          sidebar.classList.remove('open');
        }
      };
      
      handleResize();
      if (this._handleResize) {
        window.removeEventListener('resize', this._handleResize);
      }
      this._handleResize = handleResize;
      window.addEventListener('resize', this._handleResize);
    }, 100);
  },

  setupNotification() {
    setTimeout(() => {
      const notificationBtn = document.getElementById('notificationBtn');
      
      if (!notificationBtn) {
        console.log('通知按钮未找到，稍后重试');
        return;
      }
      
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
          } else {
            console.error('通知模块导出不正确');
            this.showSimpleNotificationPopup();
          }
        } catch (err) {
          console.error('加载通知模块失败', err);
          this.showSimpleNotificationPopup();
        }
      };
      
      notificationBtn.addEventListener('click', this._notificationHandler);
      console.log('✅ 通知按钮已绑定');
      
      this.updateUnreadCount();
      
      if (this._unreadInterval) {
        clearInterval(this._unreadInterval);
      }
      this._unreadInterval = setInterval(() => this.updateUnreadCount(), 30000);
    }, 200);
  },

  showSimpleNotificationPopup() {
    const existingPopup = document.getElementById('simpleNotificationPopup');
    if (existingPopup) existingPopup.remove();
    
    const popup = document.createElement('div');
    popup.id = 'simpleNotificationPopup';
    popup.style.cssText = `
      position: fixed;
      top: 60px;
      right: 20px;
      width: 320px;
      max-width: calc(100vw - 40px);
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 10000;
      overflow: hidden;
      font-family: system-ui, -apple-system, sans-serif;
    `;
    popup.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #e5e7eb;background:#f9fafb">
        <strong style="font-size:14px">消息通知</strong>
        <button style="background:none;border:none;cursor:pointer;font-size:18px;color:#6b7280" onclick="this.parentElement.parentElement.remove()">✕</button>
      </div>
      <div style="color:#6b7280;text-align:center;padding:40px 20px;font-size:14px">
        📭 暂无新消息
      </div>
    `;
    document.body.appendChild(popup);
    
    setTimeout(() => {
      const closePopup = (e) => {
        if (!popup.contains(e.target) && e.target !== document.getElementById('notificationBtn')) {
          popup.remove();
          document.removeEventListener('click', closePopup);
        }
      };
      document.addEventListener('click', closePopup);
    }, 100);
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
      
      // 更新审批待处理数量（仅管理员在电脑端）
      if (auth.isAdmin() && window.innerWidth > 768) {
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
      }
    } catch (e) {
      console.error('获取未读数失败', e);
    }
  },

  bindMenuAfterRoute() {
    setTimeout(() => {
      this.setupMobileMenu();
      this.setupNotification();
    }, 150);
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

    // 添加一个标志，防止重复提示
    let hasShownDeviceWarning = false;

    router.guard((path) => {
      const isAdmin = auth.isAdmin();
      const isMobile = window.innerWidth <= 768;
      const isAdminPath = path.startsWith('/admin');
      const isLoginPath = path === '/login';
      const isUserPath = ['/home', '/rooms', '/bookings/new', '/bookings/my', '/calendar'].some(p => path === p || path.startsWith(p));

      // ========== 登录页面：直接放行，不检查任何东西 ==========
      if (isLoginPath) {
        return true;
      }

      // ========== 未登录：跳转到登录页 ==========
      if (!auth.isLoggedIn()) {
        router.navigate('/login');
        return false;
      }

      // ========== 已登录用户：检查设备和权限 ==========

      // 普通用户只能在手机端使用
      if (!isAdmin && !isMobile && isUserPath) {
        if (!hasShownDeviceWarning) {
          hasShownDeviceWarning = true;
          if (window.Toast) Toast.error('请在手机上使用会议室预定系统');
        }
        router.navigate('/login');
        return false;
      }

      // 管理员在手机上不能访问管理端（但可以访问用户端页面）
      if (isAdminPath && isAdmin && isMobile) {
        if (!hasShownDeviceWarning) {
          hasShownDeviceWarning = true;
          if (window.Toast) Toast.error('管理端请使用电脑访问');
        }
        router.navigate('/home');
        return false;
      }

      // 非管理员不能访问管理端
      if (isAdminPath && !isAdmin) {
        if (!hasShownDeviceWarning) {
          hasShownDeviceWarning = true;
          if (window.Toast) Toast.error('无权限访问');
        }
        router.navigate('/home');
        return false;
      }

      // 重置警告标志（当访问正确页面时）
      hasShownDeviceWarning = false;
      return true;
    });

    router.add('/login', async () => {
      document.getElementById('app-boot-placeholder')?.remove();
      document.body.innerHTML = '';
      document.body.style.overflow = '';
      try {
        await runPageModule(await import('./pages/login.js'));
      } catch (e) {
        console.error(e);
        document.body.innerHTML = App.renderBootError('登录页加载失败', e.message || String(e));
      }
      this.bindMenuAfterRoute();
    });

    router.add('/home', async () => {
      await runPageModule(await import('./pages/home.js'));
      this.bindMenuAfterRoute();
    });

    router.add('/rooms', async () => {
      await runPageModule(await import('./pages/rooms.js'));
      this.bindMenuAfterRoute();
    });

    router.add('/rooms/:id', async (params) => {
      await runPageModule(await import('./pages/room-detail.js'), params.id);
      this.bindMenuAfterRoute();
    });

    router.add('/bookings/new', async () => {
      await runPageModule(await import('./pages/booking-new.js'));
      this.bindMenuAfterRoute();
    });

    router.add('/bookings/my', async () => {
      await runPageModule(await import('./pages/bookings-my.js'));
      this.bindMenuAfterRoute();
    });

    router.add('/calendar', async () => {
      await runPageModule(await import('./pages/calendar.js'));
      this.bindMenuAfterRoute();
    });

    router.add('/admin/rooms', async () => {
      await runPageModule(await import('./pages/admin-rooms.js'));
      this.bindMenuAfterRoute();
    });

    router.add('/admin/bookings', async () => {
      await runPageModule(await import('./pages/admin-bookings.js'));
      this.bindMenuAfterRoute();
    });

    router.add('/admin/stats', async () => {
      await runPageModule(await import('./pages/admin-stats.js'));
      this.bindMenuAfterRoute();
    });

    router.add('/admin/approvals', async () => {
      await runPageModule(await import('./pages/admin-approvals.js'));
      this.bindMenuAfterRoute();
    });
  },

  renderBootError(title, detail) {
    const safe = (typeof utils !== 'undefined' && utils.escapeHtml)
      ? utils.escapeHtml(detail)
      : String(detail).replace(/</g, '&lt;');
    return `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f0f2f5;font-family:system-ui,sans-serif;">
        <div style="max-width:420px;background:#fff;border-radius:12px;padding:24px;box-shadow:0 4px 24px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
          <h1 style="margin:0 0 8px;font-size:18px;color:#111827">${title}</h1>
          <p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.5">${safe}</p>
          <p style="margin:0;font-size:13px;color:#9ca3af;">请确认通过本地服务器打开（如 Live Server），勿直接用 file:// 打开。</p>
          <button type="button" onclick="location.reload()" style="margin-top:16px;padding:8px 16px;border-radius:8px;border:none;background:#4f46e5;color:#fff;cursor:pointer;font-size:14px;">重新加载</button>
        </div>
      </div>`;
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