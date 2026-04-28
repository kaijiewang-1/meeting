<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { api } from '@/api/client'
import { utils } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const todayMeetings = ref<any[]>([])
const availableRooms = ref<any[]>([])

async function loadData() {
  const [bookingsRes, roomsRes] = await Promise.all([
    api.getMyBookings({ status: 'active' }),
    api.getAvailableRooms({}),
  ])
  todayMeetings.value = bookingsRes.data || []
  availableRooms.value = (roomsRes.data || []).slice(0, 3)
}

function searchRooms() {
  const date = (document.getElementById('filterDate') as HTMLInputElement).value
  const startTime = (document.getElementById('filterStartTime') as HTMLSelectElement).value
  const endTime = (document.getElementById('filterEndTime') as HTMLSelectElement).value
  const capacity = (document.getElementById('filterCapacity') as HTMLSelectElement).value
  router.push(`/rooms?date=${date}&start=${startTime}&end=${endTime}&capacity=${capacity}`)
}

function scrollToQuickFilter() {
  document.getElementById('homeQuickFilter')?.scrollIntoView({ behavior: 'smooth' })
}

onMounted(() => {
  void loadData()
})
</script>

<template>
  <div>
    <div class="page-header home-workbench-header">
      <div class="home-workbench-header-row">
        <div class="home-workbench-intro">
          <h1 class="page-title">工作台</h1>
          <p class="page-subtitle">欢迎回来，{{ auth.user?.name || '' }}！需要会议室时，可直接新建预约。</p>
        </div>
        <div class="home-workbench-header-actions">
          <RouterLink to="/bookings/new" class="btn btn-primary home-workbench-book-cta">新建预约</RouterLink>
        </div>
      </div>
    </div>

    <section class="home-booking-hero" aria-label="新建预约">
      <div class="home-booking-hero-inner">
        <div class="home-booking-hero-text">
          <span class="home-booking-badge">快速入口</span>
          <h2 class="home-booking-title">在此发起会议预约</h2>
          <p class="home-booking-desc">与侧栏「新建预约」相同：填写主题、时段与人数，选择会议室并提交。也可使用下方大按钮，无需从菜单进入。</p>
        </div>
        <div class="home-booking-actions">
          <RouterLink to="/bookings/new" class="btn-hero-primary">新建预约</RouterLink>
          <button type="button" class="btn-hero-secondary" @click="scrollToQuickFilter">
            先查空闲会议室
          </button>
        </div>
      </div>
    </section>

    <div id="homeQuickFilter" class="home-quick-section">
      <div class="section-label">按条件查找空闲会议室</div>
      <div class="filter-bar" style="margin-bottom:0">
        <div class="filter-item">
          <span class="filter-label">日期</span>
          <input id="filterDate" type="date" class="form-input" :value="utils.today()" style="min-width:160px" />
        </div>
        <div class="filter-item">
          <span class="filter-label">开始时间</span>
          <select id="filterStartTime" class="form-select" style="min-width:120px">
            <option v-for="item in utils.generateTimeSlots(8, 19, 60)" :key="item" :value="item">{{ item }}</option>
          </select>
        </div>
        <div class="filter-item">
          <span class="filter-label">结束时间</span>
          <select id="filterEndTime" class="form-select" style="min-width:120px">
            <option v-for="item in utils.generateTimeSlots(9, 20, 60)" :key="item" :value="item">{{ item }}</option>
          </select>
        </div>
        <div class="filter-item">
          <span class="filter-label">参会人数</span>
          <select id="filterCapacity" class="form-select" style="min-width:100px">
            <option value="">不限</option>
            <option value="1">10人以下</option>
            <option value="10">10-20人</option>
            <option value="20">20-30人</option>
            <option value="30">30人以上</option>
          </select>
        </div>
        <div class="filter-actions">
          <button class="btn btn-primary" type="button" @click="searchRooms">查找空闲会议室</button>
        </div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:24px">
      <div class="card">
        <div class="card-header">
          <span class="card-title">今日我的会议</span>
          <RouterLink to="/bookings/my" class="btn btn-ghost btn-sm">查看全部</RouterLink>
        </div>
        <div class="card-body">
          <div v-if="todayMeetings.length" style="display:flex;flex-direction:column;gap:10px">
            <div
              v-for="item in todayMeetings"
              :key="item.id"
              class="home-list-item"
            >
              <div class="home-list-accent"></div>
              <div class="home-list-body">
                <div class="home-list-title">
                  {{ item.subject }}
                </div>
                <div class="home-list-meta">
                  {{ utils.formatTime(item.startTime) }} - {{ utils.formatTime(item.endTime) }} · {{ item.roomName }}
                </div>
              </div>
              <span :class="['tag', utils.statusTag(item.status)]">{{ utils.statusLabel(item.status) }}</span>
            </div>
          </div>
          <div v-else class="empty-state" style="padding:32px 16px">
            <div class="empty-state-desc">今日暂无预定会议</div>
            <RouterLink to="/bookings/new" class="btn btn-primary btn-sm">立即预定</RouterLink>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">当前空闲会议室</span>
          <RouterLink to="/rooms" class="btn btn-ghost btn-sm">查看全部</RouterLink>
        </div>
        <div class="card-body">
          <div v-if="availableRooms.length" style="display:flex;flex-direction:column;gap:10px">
            <div
              v-for="room in availableRooms"
              :key="room.id"
              class="home-room-item"
              @click="router.push(`/rooms/${room.id}`)"
            >
              <div class="home-room-icon">
                {{ room.image }}
              </div>
              <div class="home-room-body">
                <div class="home-room-title">{{ room.name }}</div>
                <div class="home-room-meta">{{ room.building }} · {{ room.floor }} · {{ room.capacity }}人</div>
              </div>
              <span class="tag tag-available">空闲</span>
            </div>
          </div>
          <div v-else class="empty-state" style="padding:32px 16px">
            <div class="empty-state-desc">暂无空闲会议室</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 修复新建预约按钮悬浮时字体消失的问题 */
.btn-hero-primary {
  color: white !important;
  background: linear-gradient(145deg, var(--accent, #871d41) 0%, var(--accent-hover, #a83258) 100%) !important;
  border: none !important;
}

.btn-hero-primary:hover,
.btn-hero-primary:focus,
.btn-hero-primary:active {
  color: white !important;
  background: var(--accent-hover, #a83258) !important;
  transform: translateY(-1px);
}

.home-workbench-book-cta {
  color: white !important;
}

.home-workbench-book-cta:hover,
.home-workbench-book-cta:focus,
.home-workbench-book-cta:active {
  color: white !important;
  background: var(--accent-hover, #a83258) !important;
}

.home-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: var(--color-bg);
  border-radius: var(--radius-md);
}

.home-list-accent {
  width: 4px;
  height: 40px;
  background: var(--color-primary);
  border-radius: 2px;
  flex-shrink: 0;
}

.home-list-body {
  flex: 1;
  min-width: 0;
}

.home-list-title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.home-list-meta {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.home-room-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.home-room-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: var(--color-primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.home-room-body {
  flex: 1;
  min-width: 0;
}

.home-room-title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 2px;
}

.home-room-meta {
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>