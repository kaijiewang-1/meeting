<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { api } from '@/api/client'
import { toast } from '@/lib/toast'
import { utils } from '@/lib/utils'

const router = useRouter()
const rooms = ref<any[]>([])
const roomFilter = ref('')
const weekStart = ref(new Date())
const weekDates = ref<Date[]>([])
const allBookings = ref<any[]>([])

async function loadRooms() {
  const res = await api.getRooms({})
  rooms.value = res.data || []
}

async function renderCalendar() {
  const start = new Date(weekStart.value)
  start.setDate(start.getDate() - start.getDay())
  weekDates.value = []
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(start)
    day.setDate(start.getDate() + i)
    weekDates.value.push(day)
  }

  allBookings.value = []
  const selectedRooms = roomFilter.value ? rooms.value.filter((item) => String(item.id) === roomFilter.value) : rooms.value
  for (const room of selectedRooms) {
    for (const date of weekDates.value) {
      const res = await api.getRoomSchedule(room.id, utils.formatDate(date))
      ;(res.data || []).forEach((item: any) => {
        allBookings.value.push({ ...item, roomName: room.name, roomId: room.id })
      })
    }
  }
}

function quickBook(date: string, time: string) {
  router.push(`/bookings/new?date=${date}&start=${time}`)
}

onMounted(async () => {
  try {
    await loadRooms()
    await renderCalendar()
  } catch (error: any) {
    toast.error(error.message || '日历加载失败')
  }
})
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-header-toolbar">
        <div class="page-header-titles">
          <h1 class="page-title">日历视图</h1>
          <p class="page-subtitle">按天/周查看会议室预定情况</p>
        </div>
        <div class="page-header-actions calendar-toolbar-actions">
          <select v-model="roomFilter" class="form-select calendar-room-select" @change="renderCalendar">
            <option value="">全部会议室</option>
            <option v-for="room in rooms" :key="room.id" :value="String(room.id)">{{ room.name }}</option>
          </select>
          <div class="calendar-week-nav">
            <button type="button" class="btn btn-secondary calendar-nav-btn" @click="weekStart = new Date(weekStart.getTime() - 7 * 86400000); renderCalendar()">‹</button>
            <button type="button" class="btn btn-secondary btn-sm calendar-this-week" @click="weekStart = new Date(); renderCalendar()">本周</button>
            <button type="button" class="btn btn-secondary calendar-nav-btn" @click="weekStart = new Date(weekStart.getTime() + 7 * 86400000); renderCalendar()">›</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card calendar-page-card">
      <div class="card-body calendar-scroll">
        <div class="calendar-grid-root">
          <div class="calendar-grid-header" style="display:grid;grid-template-columns:70px repeat(7,1fr);border-bottom:1px solid var(--color-border);background:var(--color-bg)">
            <div style="padding:10px 12px;font-size:12px;font-weight:600;color:var(--color-text-tertiary);border-right:1px solid var(--color-border)">时间</div>
            <div v-for="date in weekDates" :key="date.toISOString()" style="padding:10px 8px;text-align:center;border-right:1px solid var(--color-border-light)">
              <div style="font-size:11px;font-weight:600;opacity:0.6">{{ ['周日','周一','周二','周三','周四','周五','周六'][date.getDay()] }}</div>
              <div style="font-size:18px;font-weight:700">{{ date.getDate() }}</div>
            </div>
          </div>

          <div
            v-for="slot in utils.generateTimeSlots(8, 20, 60)"
            :key="slot"
            style="display:grid;grid-template-columns:70px repeat(7,1fr);border-bottom:1px solid var(--color-border-light);min-height:60px"
          >
            <div style="padding:6px 12px;font-size:11px;color:var(--color-text-tertiary);font-weight:500;border-right:1px solid var(--color-border);background:var(--color-bg)">
              {{ slot }}
            </div>
            <div
              v-for="date in weekDates"
              :key="`${slot}-${date.toISOString()}`"
              class="cal-cell-empty"
              style="padding:4px;border-right:1px solid var(--color-border-light);cursor:pointer;display:flex;flex-direction:column;gap:4px"
              @click="quickBook(utils.formatDate(date), slot)"
            >
              <template
                v-for="item in allBookings.filter((booking) => utils.formatDate(booking.startTime) === utils.formatDate(date) && utils.formatTime(booking.startTime).startsWith(slot.slice(0, 2)) && (!roomFilter || String(booking.roomId) === roomFilter))"
                :key="item.id"
              >
                <div style="background:var(--color-primary);color:white;border-radius:3px;padding:2px 6px;font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                  {{ roomFilter ? '' : `${item.roomName} ` }}{{ item.subject }}
                </div>
              </template>
              <span style="font-size:18px;font-weight:300;line-height:1;opacity:0.35">+</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
