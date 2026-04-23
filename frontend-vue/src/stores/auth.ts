import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

type StoredUser = Record<string, any> | null

const STORAGE_KEY = 'meeting_store'

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export const useAuthStore = defineStore('auth', () => {
  const persisted = loadPersistedState()

  const user = ref<StoredUser>(persisted.user ?? null)
  const token = ref<string>(persisted.token ?? '')
  const role = ref<string>(String(persisted.role ?? 'user').toLowerCase())

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => role.value.toUpperCase() === 'ADMIN')
  const isApprover = computed(() => role.value.toUpperCase() === 'APPROVER')
  const isStaff = computed(() => ['ADMIN', 'APPROVER'].includes(role.value.toUpperCase()))

  function persist() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user: user.value,
        token: token.value,
        role: role.value,
      }),
    )
  }

  function login(nextUser: StoredUser, nextToken: string, nextRole = 'user') {
    user.value = nextUser
    token.value = nextToken
    role.value = String(nextRole || 'user').toLowerCase()
    persist()
  }

  function clear() {
    user.value = null
    token.value = ''
    role.value = 'user'
    localStorage.removeItem(STORAGE_KEY)
  }

  function isAdminApp() {
    return !!window.__MEETING_ADMIN_APP__
  }

  function logout() {
    clear()
    if (isAdminApp()) {
      window.location.href = '/admin#/login'
    } else {
      window.location.hash = '#/login'
    }
  }

  function redirectAfterLogin() {
    // 三类角色登录后都先进入用户预约端；管理员/审批员可再从侧栏进入管理后台。
    window.location.href = '/#/home'
  }

  return {
    user,
    token,
    role,
    isLoggedIn,
    isAdmin,
    isApprover,
    isStaff,
    isAdminApp,
    login,
    clear,
    logout,
    redirectAfterLogin,
  }
})
