<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { api } from '@/api/client'
import { toast } from '@/lib/toast'
import { utils } from '@/lib/utils'

const route = useRoute()
const router = useRouter()

const room = ref<any | null>(null)
const bookings = ref<any[]>([])
const scheduleDate = ref(utils.today())

async function loadRoom() {
  try {
    const res = await api.getRoom(String(route.params.id))
    room.value = res.data
    await loadSchedule()
  } catch (error: any) {
    toast.error(error.message || '会议室信息加载失败')
  }
}

async function loadSchedule() {
  if (!room.value) return
  try {
    const res = await api.getRoomSchedule(room.value.id, scheduleDate.value)
    bookings.value = res.data || []
  } catch (error: any) {
    toast.error(error.message || '排期加载失败')
  }
}

function bookNow() {
  if (!room.value) return
  router.push(`/bookings/new?roomId=${room.value.id}`)
}

onMounted(() => {
  void loadRoom()
})
</script>

<template>
  <div v-if="room">
    <div class="page-header">
      <div class="page-header-toolbar">
        <div class="page-header-titles">
          <h1 class="page-title">{{ room.name }}</h1>
          <p class="page-subtitle">{{ room.building }} · {{ room.floor }}</p>
        </div>
        <div class="page-header-actions">
          <RouterLink to="/rooms" class="btn btn-secondary">返回列表</RouterLink>
          <button class="btn btn-primary" type="button" :disabled="room.status !== 'AVAILABLE'" @click="bookNow">立即预定</button>
        </div>
      </div>
    </div>

    <div class="grid-3 room-detail-grid" style="gap:20px">
      <div>
        <div class="card" style="margin-bottom:16px">
          <div class="room-card-img" style="height:180px;border-radius:var(--radius-lg) var(--radius-lg) 0 0">
            <span style="font-size:60px;opacity:0.5">{{ room.image }}</span>
          </div>
          <div class="card-body">
            <div style="margin-bottom:12px">
              <span :class="['tag', utils.roomStatusTag(room.status)]" style="font-size:13px;padding:4px 12px">{{ utils.statusLabel(room.status) }}</span>
            </div>
            <div class="info-grid" style="gap:12px">
              <div class="info-item"><span class="info-label">会议室名称</span><span class="info-value">{{ room.name }}</span></div>
              <div class="info-item"><span class="info-label">楼宇</span><span class="info-value">{{ room.building }}</span></div>
              <div class="info-item"><span class="info-label">楼层</span><span class="info-value">{{ room.floor }}</span></div>
              <div class="info-item"><span class="info-label">可容纳人数</span><span class="info-value">{{ room.capacity }} 人</span></div>
              <div class="info-item"><span class="info-label">开放时间</span><span class="info-value">工作日: {{ room.weekdayOpenHours || room.openHours }} 周末: {{ room.weekendOpenHours || '09:00-17:00' }}</span></div>
            </div>
            <div class="divider"></div>
            <div class="section-title">设备设施</div>
            <div class="room-card-facilities">
              <span v-for="item in room.facilities" :key="item" class="facility-tag">{{ utils.facilityLabel(item) }}</span>
              <span v-if="!room.facilities?.length" style="font-size:13px;color:var(--color-text-tertiary)">暂无设备</span>
            </div>
            <div class="divider"></div>
            <div class="section-title">会议室说明</div>
            <p style="font-size:14px;color:var(--color-text-secondary);line-height:1.6">{{ room.description || '暂无说明' }}</p>
          </div>
        </div>
      </div>

      <div style="grid-column:span 2">
        <div class="card">
          <div class="card-header">
            <span class="card-title">排期</span>
            <input v-model="scheduleDate" type="date" class="form-input" style="width:150px;padding:6px 10px;font-size:13px" @change="loadSchedule" />
          </div>
          <div class="card-body">
            <div v-if="bookings.length === 0" style="text-align:center;padding:20px;color:var(--color-text-tertiary)">当日暂无预定</div>
            <div v-else style="display:flex;flex-direction:column;gap:8px">
              <div v-for="item in bookings" :key="item.id" style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:var(--color-bg);border-radius:var(--radius-md)">
                <div style="width:4px;height:32px;background:var(--color-booked);border-radius:2px;flex-shrink:0"></div>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:600;font-size:13px;margin-bottom:2px">{{ item.subject }}</div>
                  <div style="font-size:12px;color:var(--color-text-secondary)">
                    {{ utils.formatTime(item.startTime) }} - {{ utils.formatTime(item.endTime) }} · 预定人：{{ item.organizerName }}
                  </div>
                </div>
                <span :class="['tag', utils.statusTag(item.status)]">{{ utils.statusLabel(item.status) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
