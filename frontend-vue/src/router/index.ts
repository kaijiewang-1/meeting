import { createRouter, createWebHashHistory } from 'vue-router'

import LoginView from '@/views/LoginView.vue'
import HomeView from '@/views/HomeView.vue'
import RoomsView from '@/views/RoomsView.vue'
import RoomDetailView from '@/views/RoomDetailView.vue'
import BookingNewView from '@/views/BookingNewView.vue'
import MyBookingsView from '@/views/MyBookingsView.vue'
import CalendarView from '@/views/CalendarView.vue'
import AdminBookingsView from '@/views/AdminBookingsView.vue'
import AdminApprovalsView from '@/views/AdminApprovalsView.vue'
import AdminApproversView from '@/views/AdminApproversView.vue'
import AdminRoomsView from '@/views/AdminRoomsView.vue'
import AdminStatsView from '@/views/AdminStatsView.vue'
import { useAuthStore } from '@/stores/auth'

export function createAppRouter() {
  const router = createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/', redirect: '/login' },
      { path: '/login', component: LoginView, meta: { noLayout: true } },
      { path: '/home', component: HomeView, meta: { requiresAuth: true, title: '首页' } },
      { path: '/rooms', component: RoomsView, meta: { requiresAuth: true, title: '会议室列表' } },
      { path: '/rooms/:id', component: RoomDetailView, meta: { requiresAuth: true, title: '会议室详情' } },
      { path: '/bookings/new', component: BookingNewView, meta: { requiresAuth: true, title: '新建预约' } },
      { path: '/bookings/my', component: MyBookingsView, meta: { requiresAuth: true, title: '我的预定' } },
      { path: '/calendar', component: CalendarView, meta: { requiresAuth: true, title: '日历视图' } },
      {
        path: '/admin/bookings',
        component: AdminBookingsView,
        meta: { requiresAuth: true, requiresStaff: true, title: '预定记录', adminOnlyApp: true },
      },
      {
        path: '/admin/approvals',
        component: AdminApprovalsView,
        meta: { requiresAuth: true, requiresStaff: true, title: '审批管理', adminOnlyApp: true },
      },
      {
        path: '/admin/stats',
        component: AdminStatsView,
        meta: { requiresAuth: true, requiresAdmin: true, title: '数据统计', adminOnlyApp: true },
      },
      {
        path: '/admin/users',
        component: AdminApproversView,
        meta: { requiresAuth: true, requiresAdmin: true, title: '审批员管理', adminOnlyApp: true },
      },
      {
        path: '/admin/rooms',
        component: AdminRoomsView,
        meta: { requiresAuth: true, requiresAdmin: true, title: '会议室管理', adminOnlyApp: true },
      },
      { path: '/:pathMatch(.*)*', redirect: '/login' },
    ],
  })

  router.beforeEach((to) => {
    const auth = useAuthStore()
    const isAdminApp = auth.isAdminApp()

    if (to.meta.requiresAuth && !auth.isLoggedIn) {
      return '/login'
    }
    if (to.path === '/login' && auth.isLoggedIn) {
      auth.redirectAfterLogin()
      return false
    }
    if (to.path.startsWith('/admin') && !isAdminApp) {
      return auth.isLoggedIn ? '/home' : '/login'
    }
    if (!to.path.startsWith('/admin') && isAdminApp && to.path !== '/login') {
      if (!auth.isLoggedIn) return '/login'
      if (!auth.isStaff) {
        window.location.href = '/#/home'
        return false
      }
    }
    if (to.meta.requiresStaff && !auth.isStaff) {
      window.location.href = '/#/home'
      return false
    }
    if (to.meta.requiresAdmin && !auth.isAdmin) {
      return '/admin/bookings'
    }
    return true
  })

  return router
}
