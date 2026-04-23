<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { api } from '@/api/client'
import { utils } from '@/lib/utils'

const route = useRoute()
const router = useRouter()
const rooms = ref<any[]>([])
const loading = ref(false)

const filters = reactive({
  date: String(route.query.date || utils.today()),
  startTime: String(route.query.start || '09:00'),
  endTime: String(route.query.end || '10:00'),
  building: '',
  capacity: String(route.query.capacity || ''),
  facilities: '',
  status: '',
})

const resultCount = computed(() => rooms.value.length)

async function loadRooms() {
  loading.value = true
  try {
    const res = await api.getRooms({
      date: filters.date,
      startTime: filters.startTime,
      endTime: filters.endTime,
      building: filters.building,
      capacity: filters.capacity,
      facilities: filters.facilities ? [filters.facilities] : [],
      status: filters.status,
    })
    rooms.value = res.data || []
  } finally {
    loading.value = false
  }
}

function reset() {
  filters.date = utils.today()
  filters.startTime = '09:00'
  filters.endTime = '10:00'
  filters.building = ''
  filters.capacity = ''
  filters.facilities = ''
  filters.status = ''
  void loadRooms()
}

function goBook(id: number) {
  router.push(`/bookings/new?roomId=${id}`)
}

watch(
  () => route.fullPath,
  () => {
    filters.date = String(route.query.date || filters.date)
    filters.startTime = String(route.query.start || filters.startTime)
    filters.endTime = String(route.query.end || filters.endTime)
    filters.capacity = String(route.query.capacity || filters.capacity)
  },
)

onMounted(() => {
  void loadRooms()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">会议室列表</h1>
      <p class="page-subtitle">查找并预定适合您的会议室</p>
    </div>

    <div class="filter-bar">
      <div class="filter-item">
        <span class="filter-label">日期</span>
        <input v-model="filters.date" type="date" class="form-input" style="min-width:150px" />
      </div>
      <div class="filter-item">
        <span class="filter-label">开始时间</span>
        <select v-model="filters.startTime" class="form-select" style="min-width:110px">
          <option v-for="item in utils.generateTimeSlots(8, 19, 30)" :key="item" :value="item">{{ item }}</option>
        </select>
      </div>
      <div class="filter-item">
        <span class="filter-label">结束时间</span>
        <select v-model="filters.endTime" class="form-select" style="min-width:110px">
          <option v-for="item in utils.generateTimeSlots(9, 20, 30)" :key="item" :value="item">{{ item }}</option>
        </select>
      </div>
      <div class="filter-item">
        <span class="filter-label">楼宇</span>
        <select v-model="filters.building" class="form-select" style="min-width:130px">
          <option value="">全部楼宇</option>
          <option value="总部大楼">总部大楼</option>
          <option value="分部大楼">分部大楼</option>
        </select>
      </div>
      <div class="filter-item">
        <span class="filter-label">人数</span>
        <select v-model="filters.capacity" class="form-select" style="min-width:100px">
          <option value="">不限</option>
          <option v-for="n in [2,4,6,8,10,12,15,20,30]" :key="n" :value="String(n)">{{ n }}+人</option>
        </select>
      </div>
      <div class="filter-item">
        <span class="filter-label">设备</span>
        <select v-model="filters.facilities" class="form-select" style="min-width:120px">
          <option value="">不限</option>
          <option value="projector">投影仪</option>
          <option value="video_conf">视频会议</option>
          <option value="whiteboard">白板</option>
          <option value="tv">电视</option>
          <option value="audio">音响</option>
        </select>
      </div>
      <div class="filter-item">
        <span class="filter-label">状态</span>
        <select v-model="filters.status" class="form-select" style="min-width:110px">
          <option value="">全部状态</option>
          <option value="AVAILABLE">空闲</option>
          <option value="BUSY">使用中</option>
          <option value="MAINTENANCE">维护中</option>
        </select>
      </div>
      <div class="filter-actions">
        <button class="btn btn-ghost btn-sm" type="button" @click="reset">重置</button>
        <button class="btn btn-primary" type="button" @click="loadRooms">查询</button>
      </div>
    </div>

    <div class="page-summary-bar">
      <div style="font-size:14px;color:var(--color-text-secondary)">共找到 <strong>{{ resultCount }}</strong> 个会议室</div>
    </div>

    <div v-if="loading" class="room-grid">
      <div v-for="i in 6" :key="i" class="card" style="min-height:240px"></div>
    </div>
    <div v-else-if="rooms.length === 0" class="empty-state">
      <div class="empty-state-title">未找到符合条件的会议室</div>
      <div class="empty-state-desc">请尝试调整筛选条件</div>
    </div>
    <div v-else class="room-grid">
      <div v-for="room in rooms" :key="room.id" class="room-card" @click="router.push(`/rooms/${room.id}`)">
        <div class="room-card-img">
          <span class="room-card-img-placeholder">{{ room.image }}</span>
        </div>
        <div class="room-card-body">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:4px">
            <div class="room-card-name">{{ room.name }}</div>
            <span :class="['tag', utils.roomStatusTag(room.status)]">{{ utils.statusLabel(room.status) }}</span>
          </div>
          <div class="room-card-location">{{ room.building }} · {{ room.floor }}</div>
          <div class="room-card-meta">
            <div class="room-card-meta-item">{{ room.capacity }}人</div>
            <div v-if="room.facilities?.length" class="room-card-meta-item">{{ room.facilities.length }}项设备</div>
          </div>
          <div v-if="room.facilities?.length" class="room-card-facilities">
            <span v-for="item in room.facilities.slice(0, 3)" :key="item" class="facility-tag">{{ utils.facilityLabel(item) }}</span>
          </div>
          <div class="room-card-actions">
            <button class="btn btn-secondary btn-sm" type="button" style="flex:1" @click.stop="router.push(`/rooms/${room.id}`)">查看详情</button>
            <button class="btn btn-primary btn-sm" type="button" style="flex:1" :disabled="room.status !== 'AVAILABLE'" @click.stop="goBook(room.id)">立即预定</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
