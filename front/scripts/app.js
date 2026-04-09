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

  async init() {
    this.setupRouter();
    await router._resolve();
    this.setupNavActive();
    this.setupUserMenu();
  },

  renderLayout() {
    const hash = window.location.hash;
    // Login page has no sidebar layout
    if (hash === '#/login' || hash === '' || !hash) return;

    const role = auth.getRole();
    const user = auth.getUser() || { name: '用户', username: 'user' };

    const isAdmin = auth.isAdmin();
    document.body.innerHTML = `
      <div class="app-layout${isAdmin ? ' app-layout--admin' : ''}">
        <!-- Sidebar -->
        <aside class="app-sidebar" id="sidebar">
          <a href="#/home" class="sidebar-logo">
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
          </a>

          <nav class="sidebar-nav" id="sidebarNav">
            <div class="sidebar-section-label">用户端</div>
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
              新建预约
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

            ${isAdmin ? `
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
            ` : ''}
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

        <div class="sidebar-backdrop" id="sidebarBackdrop" aria-hidden="true"></div>

        <!-- Main -->
        <main class="app-main">
          ${isAdmin ? `
          <div class="admin-mobile-hint" role="status">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" aria-hidden="true">
              <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            <span>管理功能建议在<strong>电脑浏览器</strong>中使用，以获得完整表格与统计视图。</span>
          </div>
          ` : ''}
          <header class="app-header">
            <div class="header-left">
              <button type="button" class="header-icon-btn" id="mobileMenuBtn" aria-label="打开菜单" style="display:none">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
              <div class="header-breadcrumb" id="breadcrumb">
                <a href="#/home">首页</a>
              </div>
            </div>
            <div class="header-right">
              <button class="header-icon-btn" title="消息">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
                <span class="badge"></span>
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

        <nav class="app-bottom-nav" id="appBottomNav" aria-label="底部快捷导航">
          <a href="#/home" class="bottom-nav-item" data-page="home">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span>首页</span>
          </a>
          <a href="#/rooms" class="bottom-nav-item" data-page="rooms">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>会议室</span>
          </a>
          <a href="#/bookings/new" class="bottom-nav-item" data-page="bookings-new">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            <span>预约</span>
          </a>
          <a href="#/bookings/my" class="bottom-nav-item" data-page="bookings-my">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22" aria-hidden="true">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span>我的</span>
          </a>
          <a href="#/calendar" class="bottom-nav-item" data-page="calendar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>日历</span>
          </a>
        </nav>
      </div>
      <div class="toast-container" id="toastContainer"></div>
    `;

    document.dispatchEvent(new CustomEvent('app:navigate', { detail: {} }));
    this.setupMobileChrome();
  },

  getActiveBookingCount() {
    try {
      return 2;
    } catch { return 0; }
  },

  /** 侧栏与底部导航高亮（hash 路径与 data-page 精确对应） */
  navPathActive(page, hash) {
    const h = (hash || '').replace(/^#/, '') || '/';
    switch (page) {
      case 'home':
        return /^\/home$/.test(h);
      case 'rooms':
        return /^\/rooms(\/|$)/.test(h);
      case 'bookings-new':
        return /^\/bookings\/new/.test(h);
      case 'bookings-my':
        return /^\/bookings\/my/.test(h);
      case 'calendar':
        return /^\/calendar/.test(h);
      case 'admin-rooms':
        return /^\/admin\/rooms/.test(h);
      case 'admin-bookings':
        return /^\/admin\/bookings/.test(h);
      case 'admin-stats':
        return /^\/admin\/stats/.test(h);
      default:
        return !!(page && h.includes(page));
    }
  },

  setupNavActive() {
    if (this._navActiveBound) {
      document.dispatchEvent(new CustomEvent('app:navigate', { detail: {} }));
      return;
    }
    this._navActiveBound = true;
    const update = () => {
      const hash = window.location.hash || '';
      document.querySelectorAll('.nav-item').forEach(item => {
        const page = item.getAttribute('data-page');
        item.classList.toggle('active', this.navPathActive(page, hash));
      });
      document.querySelectorAll('.bottom-nav-item').forEach(item => {
        const page = item.getAttribute('data-page');
        item.classList.toggle('active', this.navPathActive(page, hash));
      });
      const adminRoute = /\/admin\//.test(hash.replace(/^#/, '') || '');
      document.body.classList.toggle('route-admin-mobile', adminRoute && window.innerWidth <= 768);
    };
    document.addEventListener('app:navigate', update);
    window.addEventListener('resize', update);
    update();
  },

  setupUserMenu() {
    // handled inline
  },

  closeMobileSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebarBackdrop')?.classList.remove('is-visible');
  },

  syncMobileSidebarVisibility() {
    const btn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const bd = document.getElementById('sidebarBackdrop');
    if (!btn || !sidebar) return;
    const mobile = window.innerWidth <= 768;
    btn.style.display = mobile ? 'flex' : 'none';
    if (!mobile) {
      sidebar.classList.remove('open');
      bd?.classList.remove('is-visible');
    }
  },

  /** 侧栏菜单按钮、遮罩、尺寸变化（使用事件委托，避免 renderLayout 重复绑定失效） */
  setupMobileChrome() {
    this.syncMobileSidebarVisibility();
    if (this._mobileChromeBound) return;
    this._mobileChromeBound = true;

    document.body.addEventListener('click', (e) => {
      const t = e.target;
      if (t.closest('#mobileMenuBtn')) {
        e.preventDefault();
        const sidebar = document.getElementById('sidebar');
        const bd = document.getElementById('sidebarBackdrop');
        const open = !sidebar?.classList.contains('open');
        sidebar?.classList.toggle('open', open);
        bd?.classList.toggle('is-visible', open);
        return;
      }
      if (t.closest('#sidebarBackdrop')) {
        this.closeMobileSidebar();
        return;
      }
      if (t.closest('.app-sidebar a.nav-item') || t.closest('a.sidebar-logo')) {
        if (window.innerWidth <= 768) this.closeMobileSidebar();
      }
    });

    window.addEventListener('resize', () => {
      this.syncMobileSidebarVisibility();
      document.dispatchEvent(new CustomEvent('app:navigate', { detail: {} }));
    });
  },

  toggleUserDropdown() {
    const menu = document.getElementById('userDropdownMenu');
    if (!menu) return;
    const isHidden = menu.style.display === 'none';
    menu.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
      const close = (e) => {
        if (!document.getElementById('userDropdown').contains(e.target)) {
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
      if (!auth.isLoggedIn() && path !== '/login') {
        router.navigate('/login');
        return false;
      }
      if (auth.isLoggedIn() && path === '/login') {
        router.navigate('/home');
        return false;
      }
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
    });

    router.add('/home', async () => {
      await runPageModule(await import('./pages/home.js'));
    });

    router.add('/rooms', async () => {
      await runPageModule(await import('./pages/rooms.js'));
    });

    router.add('/rooms/:id', async (params) => {
      await runPageModule(await import('./pages/room-detail.js'), params.id);
    });

    router.add('/bookings/new', async () => {
      await runPageModule(await import('./pages/booking-new.js'));
    });

    router.add('/bookings/my', async () => {
      await runPageModule(await import('./pages/bookings-my.js'));
    });

    router.add('/calendar', async () => {
      await runPageModule(await import('./pages/calendar.js'));
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
          <button type="button" onclick="location.reload()" style="margin-top:16px;padding:8px 16px;border-radius:8px;border:none;background:#8b6bc9;color:#fff;cursor:pointer;font-size:14px;">重新加载</button>
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
