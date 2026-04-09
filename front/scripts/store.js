// Simple reactive store with localStorage persistence
class Store {
  constructor(initialState = {}) {
    this._state = { ...initialState };
    this._listeners = new Map();
    this._loadFromStorage();
  }

  _loadFromStorage() {
    try {
      const saved = localStorage.getItem('meeting_store');
      if (saved) {
        const parsed = JSON.parse(saved);
        this._state = { ...this._state, ...parsed };
      }
    } catch (e) {}
  }

  _saveToStorage() {
    try {
      const toSave = {
        user: this._state.user,
        token: this._state.token,
        role: this._state.role,
      };
      localStorage.setItem('meeting_store', JSON.stringify(toSave));
    } catch (e) {}
  }

  getState() {
    return this._state;
  }

  get(key) {
    return this._state[key];
  }

  set(key, value) {
    const old = this._state[key];
    this._state[key] = value;
    this._saveToStorage();
    if (this._listeners.has(key)) {
      this._listeners.get(key).forEach(fn => fn(value, old));
    }
    if (this._listeners.has('*')) {
      this._listeners.get('*').forEach(fn => fn(key, value, old));
    }
  }

  subscribe(key, fn) {
    if (!this._listeners.has(key)) {
      this._listeners.set(key, new Set());
    }
    this._listeners.get(key).add(fn);
    return () => this._listeners.get(key).delete(fn);
  }

  clear() {
    this._state = {};
    localStorage.removeItem('meeting_store');
  }
}

const store = new Store();

// Auth helpers
const auth = {
  getUser: () => store.get('user'),
  getToken: () => store.get('token'),
  getRole: () => {
    const r = store.get('role');
    if (r == null || r === '') return 'user';
    return String(r).toLowerCase();
  },
  isAdmin: () => String(store.get('role') || '').toUpperCase() === 'ADMIN',
  isLoggedIn: () => !!store.get('token'),
  login(user, token, role = 'user') {
    store.set('user', user);
    store.set('token', token);
    store.set('role', role);
  },
  logout() {
    store.clear();
    window.location.hash = '#/login';
  },
};

window.store = store;
window.auth = auth;
