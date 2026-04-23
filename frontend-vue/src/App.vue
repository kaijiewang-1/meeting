<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'

import { api } from '@/api/client'
import { toast } from '@/lib/toast'
import { utils } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const auth = useAuthStore()

const sidebarOpen = ref(false)
const userMenuOpen = ref(false)
const notificationsOpen = ref(false)
const notifications = ref<any[]>([])
const notificationCount = ref(0)
const pendingApprovals = ref(0)

const isAdminApp = computed(() => auth.isAdminApp())
const showLayout = computed(() => route.path !== '/login')
const currentUser = computed(() => auth.user || { name: '用户', username: 'user' })
const roleLabel = computed(() => {
  if (auth.isAdmin) return '管理员'
  if (auth.isApprover) return '审批员'
  return '普通用户'
})
const homeHref = computed(() => {
  if (!isAdminApp.value) return '/#/home'
  return auth.isAdmin ? '/admin#/admin/rooms' : '/admin#/admin/bookings'
})
const breadcrumbLabel = computed(() => {
  if (!showLayout.value) return ''
  if (route.path.startsWith('/admin')) return '管理端'
  return '首页'
})

const userNav = [
  { label: '首页工作台', to: '/home', page: 'home' },
  { label: '会议室列表', to: '/rooms', page: 'rooms' },
  { label: '新建预约', to: '/bookings/new', page: 'bookings-new' },
  { label: '我的预定', to: '/bookings/my', page: 'bookings-my' },
  { label: '日历视图', to: '/calendar', page: 'calendar' },
]

const adminNav = computed(() => {
  const items = []
  if (auth.isAdmin) {
    items.push({ label: '会议室管理', to: '/admin/rooms', page: 'admin-rooms' })
    items.push({ label: '审批员管理', to: '/admin/users', page: 'admin-users' })
  }
  items.push({ label: '预定记录', to: '/admin/bookings', page: 'admin-bookings' })
  if (auth.isAdmin) items.push({ label: '数据统计', to: '/admin/stats', page: 'admin-stats' })
  items.push({ label: '审批管理', to: '/admin/approvals', page: 'admin-approvals' })
  return items
})

function navActive(target: string) {
  return route.path === target || route.path.startsWith(`${target}/`)
}

async function refreshUnread() {
  if (!auth.isLoggedIn) return
  try {
    const [unreadRes, pendingRes] = await Promise.all([
      api.getUnreadCount(),
      auth.isStaff ? api.getPendingApprovals() : Promise.resolve({ data: [] }),
    ])
    notificationCount.value = unreadRes.data?.count || 0
    pendingApprovals.value = Array.isArray(pendingRes.data) ? pendingRes.data.length : 0
  } catch {
    // keep UI quiet
  }
}

async function toggleNotifications() {
  notificationsOpen.value = !notificationsOpen.value
  if (!notificationsOpen.value) return
  try {
    const res = await api.getNotifications()
    notifications.value = res.data || []
    await refreshUnread()
  } catch (error: any) {
    toast.error(error.message || '加载通知失败')
  }
}

async function markNotificationRead(id: number) {
  try {
    await api.markNotificationRead(id)
    const item = notifications.value.find((entry) => entry.id === id)
    if (item) item.is_read = 1
    await refreshUnread()
  } catch (error: any) {
    toast.error(error.message || '操作失败')
  }
}

async function markAllRead() {
  try {
    await api.markAllNotificationsRead()
    notifications.value = notifications.value.map((item) => ({ ...item, is_read: 1 }))
    await refreshUnread()
  } catch (error: any) {
    toast.error(error.message || '操作失败')
  }
}

function closeOverlays() {
  sidebarOpen.value = false
  userMenuOpen.value = false
}

function handleResize() {
  if (window.innerWidth > 768) sidebarOpen.value = false
}

watch(
  () => route.fullPath,
  () => {
    closeOverlays()
    notificationsOpen.value = false
    if (auth.isLoggedIn) void refreshUnread()
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <RouterView v-if="!showLayout" />

  <div v-else :class="['app-layout', isAdminApp ? 'app-layout--admin' : '']">
    <aside id="sidebar" :class="['app-sidebar', sidebarOpen ? 'open' : '']">
      <RouterLink :to="isAdminApp ? (auth.isAdmin ? '/admin/rooms' : '/admin/bookings') : '/home'" class="sidebar-logo">
        <div class="sidebar-logo-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <div>
          <div class="sidebar-logo-text">会议室预定</div>
          <div class="sidebar-logo-sub">{{ isAdminApp ? '管理端' : 'Meeting Room Booking' }}</div>
        </div>
      </RouterLink>

      <nav class="sidebar-nav">
        <template v-if="isAdminApp">
          <div class="sidebar-section-label">预约端</div>
          <a href="/#/home" class="nav-item">进入预约端</a>
          <div class="sidebar-section-label">管理端</div>
          <RouterLink
            v-for="item in adminNav"
            :key="item.to"
            :to="item.to"
            class="nav-item"
            :class="{ active: navActive(item.to) }"
          >
            <span>{{ item.label }}</span>
            <span v-if="item.to === '/admin/approvals' && pendingApprovals > 0" class="nav-badge">
              {{ pendingApprovals > 99 ? '99+' : pendingApprovals }}
            </span>
          </RouterLink>
        </template>
        <template v-else>
          <div class="sidebar-section-label">用户端</div>
          <RouterLink
            v-for="item in userNav"
            :key="item.to"
            :to="item.to"
            class="nav-item"
            :class="{ active: navActive(item.to) }"
          >
            <span>{{ item.label }}</span>
          </RouterLink>
          <template v-if="auth.isStaff">
            <div class="sidebar-section-label">管理</div>
            <a :href="auth.isAdmin ? '/admin#/admin/rooms' : '/admin#/admin/bookings'" class="nav-item">
              管理后台
            </a>
          </template>
        </template>
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="sidebar-avatar">{{ utils.initials(currentUser.name || currentUser.username) }}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">{{ currentUser.name || currentUser.username }}</div>
            <div class="sidebar-user-role">{{ roleLabel }}</div>
          </div>
          <button class="sidebar-user-btn" type="button" title="退出登录" @click="auth.logout()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>

    <div :class="['sidebar-backdrop', sidebarOpen ? 'is-visible' : '']" @click="sidebarOpen = false"></div>

    <main class="app-main">
      <header class="app-header">
        <div class="header-left">
          <button id="mobileMenuBtn" type="button" class="header-icon-btn" @click="sidebarOpen = !sidebarOpen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div class="header-breadcrumb" id="breadcrumb">
            <a :href="homeHref">{{ breadcrumbLabel }}</a>
          </div>
        </div>

        <div class="header-right">
          <div style="position: relative">
            <button id="notificationBtn" class="header-icon-btn" type="button" title="消息" @click="toggleNotifications">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span v-if="notificationCount > 0" class="badge" style="display:flex">
                {{ notificationCount > 99 ? '99+' : notificationCount }}
              </span>
            </button>

            <div v-if="notificationsOpen" class="notification-popup">
              <div class="notification-popup-header">
                <span>消息通知</span>
                <button class="notification-popup-close" type="button" @click="notificationsOpen = false">✕</button>
              </div>
              <div class="notification-popup-body">
                <div v-if="notifications.length === 0" class="notification-empty">暂无消息</div>
                <div
                  v-for="item in notifications"
                  :key="item.id"
                  :class="['notification-item', item.is_read ? 'read' : 'unread']"
                  @click="!item.is_read && markNotificationRead(item.id)"
                >
                  <div class="notification-content">
                    <div class="notification-title">{{ item.title }}</div>
                    <div class="notification-message">{{ item.content }}</div>
                    <div class="notification-time">{{ item.created_at }}</div>
                  </div>
                </div>
              </div>
              <div class="notification-popup-footer">
                <button class="btn btn-ghost btn-sm" type="button" @click="markAllRead">全部已读</button>
              </div>
            </div>
          </div>

          <div class="dropdown" id="userDropdown">
            <button class="header-icon-btn" type="button" @click="userMenuOpen = !userMenuOpen">
              <div class="sidebar-avatar" style="width:28px;height:28px;font-size:12px">
                {{ utils.initials(currentUser.name || currentUser.username) }}
              </div>
            </button>
            <div v-if="userMenuOpen" class="dropdown-menu" style="display:block">
              <div class="dropdown-item" style="pointer-events:none;font-weight:600">
                {{ currentUser.name || currentUser.username }}
              </div>
              <div class="dropdown-divider"></div>
              <div class="dropdown-item" @click="auth.logout()">退出登录</div>
            </div>
          </div>
        </div>
      </header>

      <div class="app-content">
        <RouterView />
      </div>
    </main>

    <nav v-if="!isAdminApp" class="app-bottom-nav">
      <RouterLink
        v-for="item in userNav"
        :key="item.to"
        :to="item.to"
        class="bottom-nav-item"
        :class="{ active: navActive(item.to) }"
      >
        <span>{{ item.label.replace('工作台', '').replace('列表', '') }}</span>
      </RouterLink>
    </nav>
  </div>
</template>
