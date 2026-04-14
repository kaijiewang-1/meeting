// Login page
export default function init() {
  document.body.innerHTML = `
    <div class="login-page">
      <!-- Left panel: form -->
      <div class="login-panel">
        <div style="margin-bottom: 40px">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
            <div style="width:44px;height:44px;background:var(--color-primary);border-radius:12px;display:flex;align-items:center;justify-content:center;color:white;box-shadow:0 4px 12px rgba(106,6,7,0.3)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div>
              <div style="font-size:20px;font-weight:800;color:var(--color-text-primary)">深大会议室预定</div>
              <div style="font-size:12px;color:var(--color-text-tertiary);margin-top:2px">SZU Meeting Room Booking</div>
            </div>
          </div>
          <h1 style="font-size:28px;font-weight:800;margin-bottom:8px;color:var(--color-text-primary)">欢迎回来</h1>
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

          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px">
            <label class="checkbox-group" style="font-size:13px">
              <input type="checkbox" id="remember">
              <span>记住登录状态</span>
            </label>
          </div>

          <button type="submit" id="loginBtn" class="btn btn-primary btn-lg w-full" style="margin-bottom:20px;padding:12px 24px;font-size:16px;font-weight:600;border-radius:10px">
            登录
          </button>

          <div style="text-align:center;font-size:12px;color:var(--color-text-tertiary);padding-top:20px;border-top:1px solid var(--color-border)">
            <div style="margin-bottom:8px;font-weight:600;color:var(--color-text-secondary)">测试账号</div>
            <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px 16px">
              <span><code style="background:var(--color-bg);padding:2px 6px;border-radius:4px">zhangsan</code>/123456</span>
              <span><code style="background:var(--color-bg);padding:2px 6px;border-radius:4px">lisi</code>/123456</span>
              <span><code style="background:var(--color-bg);padding:2px 6px;border-radius:4px">wangwu</code>/123456</span>
              <span><code style="background:var(--color-bg);padding:2px 6px;border-radius:4px">admin</code>/123456</span>
            </div>
          </div>
        </form>
      </div>

      <!-- Right panel: visual -->
      <div class="login-visual">
        <div class="login-visual-content">
          <h2 class="login-visual-title">深大<br>会议室预定</h2>
          <p class="login-visual-sub">深圳大学官方会议室预定平台<br>便捷 · 高效 · 智能</p>

          <div class="login-visual-features">
            <div class="login-visual-feature">
              <div class="login-visual-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div>
                <div style="font-weight:600;margin-bottom:2px">快速预定</div>
                <div style="font-size:12px;opacity:0.85">1分钟找到空闲会议室</div>
              </div>
            </div>
            <div class="login-visual-feature">
              <div class="login-visual-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <div>
                <div style="font-weight:600;margin-bottom:2px">冲突检测</div>
                <div style="font-size:12px;opacity:0.85">智能避免重复预定</div>
              </div>
            </div>
            <div class="login-visual-feature">
              <div class="login-visual-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div>
                <div style="font-weight:600;margin-bottom:2px">日历视图</div>
                <div style="font-size:12px;opacity:0.85">可视化查看排期</div>
              </div>
            </div>
            <div class="login-visual-feature">
              <div class="login-visual-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </div>
              <div>
                <div style="font-weight:600;margin-bottom:2px">数据分析</div>
                <div style="font-size:12px;opacity:0.85">利用率一目了然</div>
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
          if (auth.isAdmin()) {
            window.location.href = 'admin.html';
          } else {
            window.location.hash = '#/home';
          }
        }, 300);
      } catch (err) {
        Toast.error(err.message || '登录失败，请检查用户名和密码');
        btn.disabled = false;
        btn.textContent = '登录';
      }
    }
  };
}