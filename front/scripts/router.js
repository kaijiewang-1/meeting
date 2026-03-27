// Simple hash-based router
class Router {
  constructor() {
    this.routes = {};
    this._currentRoute = null;
    this._guards = [];
    window.addEventListener('hashchange', () => this._resolve());
    window.addEventListener('load', () => this._resolve());
  }

  add(path, handler, guard = null) {
    this.routes[path] = { handler, guard };
  }

  guard(fn) {
    this._guards.push(fn);
  }

  navigate(path) {
    window.location.hash = path;
  }

  _match(path) {
    // Exact match first
    if (this.routes[path]) return { route: this.routes[path], params: {} };

    // Param match
    for (const [pattern, route] of Object.entries(this.routes)) {
      const patternParts = pattern.split('/');
      const pathParts = path.split('/');
      if (patternParts.length !== pathParts.length) continue;

      const params = {};
      let match = true;
      for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i].startsWith(':')) {
          params[patternParts[i].slice(1)] = pathParts[i];
        } else if (patternParts[i] !== pathParts[i]) {
          match = false;
          break;
        }
      }
      if (match) return { route, params };
    }
    return null;
  }

  async _resolve() {
    const path = window.location.hash.slice(1) || '/home';
    const matched = this._match(path);

    // Check guards
    for (const guard of this._guards) {
      const result = await guard(path, this);
      if (result === false) return;
    }

    if (matched) {
      this._currentRoute = path;
      document.querySelectorAll('.page-view').forEach(el => el.classList.remove('active'));
      try {
        await matched.route.handler(matched.params, this);
        document.dispatchEvent(new CustomEvent('app:navigate', { detail: { path } }));
      } catch (err) {
        console.error('Route handler error:', path, err);
        if (window.App && typeof window.App.renderBootError === 'function') {
          document.body.innerHTML = window.App.renderBootError('页面加载失败', err.message || String(err));
        } else {
          document.body.innerHTML = '<p style="padding:24px;font-family:sans-serif">页面加载失败，请刷新重试。</p>';
        }
      }
    } else {
      // 404
      this.navigate('/home');
    }
  }
}

const router = new Router();
window.router = router;
