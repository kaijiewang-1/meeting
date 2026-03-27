// Login page
export default function init() {
  document.body.innerHTML = `
    <div class="login-page">
      <!-- Left panel: form -->
      <div class="login-panel">
        <div style="margin-bottom: 40px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px">
            <div style="width:40px;height:40px;background:var(--color-primary);border-radius:10px;display:flex;align-items:center;justify-content:center;color:white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div>
              <div style="font-size:18px;font-weight:800;color:var(--color-text-primary)">会议室预定</div>
              <div style="font-size:12px;color:var(--color-text-tertiary)">Meeting Room Booking</div>
            </div>
          </div>
          <h1 style="font-size:26px;font-weight:800;margin-bottom:6px;color:var(--color-text-primary)">欢迎回来</h1>
          <p style="font-size:14px;color:var(--color-text-secondary)">请登录您的账号以继续使用会议室预定系统</p>
        </div>

        <form id="loginForm" onsubmit="LoginPage.submit(event)">
          <div class="form-group">
            <label class="form-label">用户名 <span style="color:var(--color-danger)">*</span></label>
            <input type="text" id="username" class="form-input" placeholder="请输入用户名" required autocomplete="username">
            <div class="form-error" id="usernameError" style="display:none"></div>
          </div>

          <div class="form-group">
            <label class="form-label">密码 <span style="color:var(--color-danger)">*</span></label>
            <input type="password" id="password" class="form-input" placeholder="请输入密码" required autocomplete="current-password">
            <div class="form-error" id="passwordError" style="display:none"></div>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
            <label class="checkbox-group" style="font-size:13px">
              <input type="checkbox" id="remember">
              <span>记住登录状态</span>
            </label>
          </div>

          <button type="submit" id="loginBtn" class="btn btn-primary btn-lg w-full" style="margin-bottom:16px">
            登录
          </button>

          <div style="text-align:center;font-size:12px;color:var(--color-text-tertiary);padding-top:16px;border-top:1px solid var(--color-border)">
            <div style="margin-bottom:6px">测试账号：普通用户 <code style="background:var(--color-bg);padding:2px 6px;border-radius:4px">user</code> / <code style="background:var(--color-bg);padding:2px 6px;border-radius:4px">123456</code></div>
            <div>管理员 <code style="background:var(--color-bg);padding:2px 6px;border-radius:4px">admin</code> / <code style="background:var(--color-bg);padding:2px 6px;border-radius:4px">123456</code></div>
          </div>
        </form>
      </div>

      <!-- Right panel: visual -->
      <div class="login-visual">
        <div class="login-visual-content">
          <h2 class="login-visual-title">智能会议室<br>预定系统</h2>
          <p class="login-visual-sub">为企业提供简单、直观、可视化的会议室预定与管理体验</p>

          <div class="login-visual-features">
            <div class="login-visual-feature">
              <div class="login-visual-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div>
                <div style="font-weight:600;margin-bottom:2px">1分钟快速预定</div>
                <div style="font-size:12px;opacity:0.8">查询空闲会议室，一键完成预定</div>
              </div>
            </div>
            <div class="login-visual-feature">
              <div class="login-visual-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <div>
                <div style="font-weight:600;margin-bottom:2px">实时冲突检测</div>
                <div style="font-size:12px;opacity:0.8">智能避免重复预定，减少资源浪费</div>
              </div>
            </div>
            <div class="login-visual-feature">
              <div class="login-visual-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div>
                <div style="font-weight:600;margin-bottom:2px">可视化日历</div>
                <div style="font-size:12px;opacity:0.8">按天/周查看会议室占用情况</div>
              </div>
            </div>
            <div class="login-visual-feature">
              <div class="login-visual-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </div>
              <div>
                <div style="font-weight:600;margin-bottom:2px">数据统计报表</div>
                <div style="font-size:12px;opacity:0.8">会议室利用率一目了然</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  window.LoginPage = {
    async submit(e) {
      e.preventDefault();
      const btn = document.getElementById('loginBtn');
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;

      // Clear errors
      document.getElementById('usernameError').style.display = 'none';
      document.getElementById('passwordError').style.display = 'none';

      if (!username) {
        const el = document.getElementById('usernameError');
        el.textContent = '请输入用户名';
        el.style.display = 'flex';
        return;
      }
      if (!password) {
        const el = document.getElementById('passwordError');
        el.textContent = '请输入密码';
        el.style.display = 'flex';
        return;
      }

      btn.disabled = true;
      btn.textContent = '登录中...';

      try {
        const res = await api.login(username, password);
        auth.login(res.data.user, res.data.token, res.data.role);
        Toast.success('登录成功，正在跳转...');
        setTimeout(() => {
          window.location.hash = '#/home';
        }, 300);
      } catch (err) {
        Toast.error(err.message || '登录失败，请检查用户名和密码');
        btn.disabled = false;
        btn.textContent = '登录';
      }
    }
  };
}
